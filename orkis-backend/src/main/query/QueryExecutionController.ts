import {
  Autowired,
  Controller,
  Body,
  RequestMapping,
  Session,
  FILTER_TYPES,
  REQUEST_METHOD
} from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { QueryExecutionService } from "./QueryExecutionService";

export interface ExecuteQueryRequest {
  sqlQuery: string;
  sessionId?: string;
  messageId?: string;
  dbId?: string; // DB 연결 경로 (share/sqlite 이후의 상대 경로)
  connectionId?: number; // DB 연결 ID
  limit?: number | null; // 조회 제한 (기본값: 1000, null: 제한 없음)
  executionId?: string; // Phase 2 cancel 추적 ID. 옵셔널 — 미전달 시 기존 동작.
}

export interface CancelQueryRequest {
  executionId: string;
}

export interface CancelQueryResponse {
  cancelled: boolean;
  enabled?: boolean; // Feature Flag off 시 false 로 명시 전달.
  rateLimited?: boolean; // 사용자당 cancel 호출 빈도 초과 시 true.
}

/**
 * 사용자별 cancel 호출 토큰 버킷 (단순 in-memory).
 * - 단일 노드 환경 가정. 다중 노드 확장 시 Redis 기반으로 교체 필요.
 * - 인증된 사용자만 호출 가능하므로 anonymous 폭주 방어는 인증 레이어에서 처리.
 * - 가장 단순한 token bucket: 분당 60 refill, max 60. 1초에 1 토큰.
 */
interface UserBucket {
  tokens: number;
  lastRefill: number; // ms epoch
}

const RATE_LIMIT_MAX_TOKENS = 60;
const RATE_LIMIT_REFILL_PER_MS = RATE_LIMIT_MAX_TOKENS / 60_000; // 60 / 60s
// 1시간 미활동 사용자 entry 회수 (메모리 누수 방지).
const RATE_LIMIT_BUCKET_TTL_MS = 60 * 60_000;

export interface ExecuteQueryResponse {
  columns: string[];
  data: Array<Record<string, any>>;
  queryTitle: string;
  querySubtitle?: string;
  executionTime?: number;
  affectedRows?: number;
}

@Controller({ path: "/query" })
export class QueryExecutionController {
  @Autowired("QueryExecutionService")
  private queryExecutionService!: QueryExecutionService;

  // ─────────────────────────────────────────────────────────────────
  // Rate limit (cancel 전용)
  // 정상 사용자는 분당 한 번 정도 cancel — 60회/분 한도는 사실상 무제한이지만
  // 자동화/실수로 인한 cancel storm 차단용 안전망.
  // 인증된 사용자만 호출 가능(session 검증 선행)하므로 anonymous 폭주는 별도 방어.
  // ─────────────────────────────────────────────────────────────────
  private cancelBuckets = new Map<string, UserBucket>();
  private lastBucketGc = Date.now();

  /**
   * 토큰 1개 소비 시도. 성공 시 true, 한도 초과 시 false.
   * - 사용자별 bucket lazy 생성
   * - 호출 시점에 lastRefill 기준 경과 시간에 비례해 토큰 refill (max=60)
   * - 1시간마다 한 번씩 stale entry GC
   */
  private tryConsumeCancelToken(userId: string): boolean {
    const now = Date.now();

    // 1시간에 한 번 stale entry 회수 (호출 빈도 낮으므로 별도 setInterval 불필요)
    if (now - this.lastBucketGc > RATE_LIMIT_BUCKET_TTL_MS) {
      for (const [uid, bucket] of this.cancelBuckets) {
        if (now - bucket.lastRefill > RATE_LIMIT_BUCKET_TTL_MS) {
          this.cancelBuckets.delete(uid);
        }
      }
      this.lastBucketGc = now;
    }

    let bucket = this.cancelBuckets.get(userId);
    if (!bucket) {
      bucket = { tokens: RATE_LIMIT_MAX_TOKENS, lastRefill: now };
      this.cancelBuckets.set(userId, bucket);
    } else {
      const elapsed = now - bucket.lastRefill;
      const refilled = elapsed * RATE_LIMIT_REFILL_PER_MS;
      bucket.tokens = Math.min(
        RATE_LIMIT_MAX_TOKENS,
        bucket.tokens + refilled
      );
      bucket.lastRefill = now;
    }

    if (bucket.tokens < 1) {
      return false;
    }
    bucket.tokens -= 1;
    return true;
  }

  /**
   * SQL 쿼리 실행 (실제 DB 조회)
   * POST /api/query/execute
   *
   * 인증은 OrkisInterCeptor 가 처리 — session.login_info 는 여기서 보장된다.
   */
  @RequestMapping({
    route: "/execute",
    method: REQUEST_METHOD.POST
  })
  async executeQuery(
    @Body() body: ExecuteQueryRequest,
    @Session() session: any
  ): Promise<ExecuteQueryResponse> {
    try {
      const { sqlQuery, dbId, connectionId, limit, executionId } = body;
      const userId = session.login_info.ID;

      // 실제 DB 쿼리 실행
      // limit: null이면 제한 없음, undefined면 기본값 1000 사용
      // executionId: 옵셔널 — Phase 2 cancel 추적용. 미전달 시 기존 동작 그대로.
      const result = await this.queryExecutionService.executeRealQuery(
        sqlQuery,
        dbId,
        connectionId,
        limit,
        userId,
        executionId
      );
      return result;
    } catch (error) {
      logger.error("[QueryExecutionController] SQL 실행 오류:", error);
      throw error;
    }
  }

  /**
   * SQL 쿼리 실행 중지 (Phase 2)
   * POST /api/query/cancel
   *
   * - 인증된 사용자만 호출 가능 — 인증은 OrkisInterCeptor 가 처리
   * - ownership 검증은 Service.cancelExecution 에서 수행
   * - Feature Flag(ENABLE_QUERY_CANCEL=false) 시 HTTP 200 + { cancelled: false,
   *   enabled: false } 반환 — 클라이언트는 fail-soft 처리
   */
  // 호출 위치: orkis-front-design/src/logic/common/chat/services/queryService.ts - cancelQuery()
  @RequestMapping({
    route: "/cancel",
    method: REQUEST_METHOD.POST
  })
  async cancelQuery(
    @Body() body: CancelQueryRequest,
    @Session() session: any
  ): Promise<CancelQueryResponse> {
    try {
      // Feature Flag — 활성화 안 됐으면 추적 자체가 안 됐으므로 cancel 도 의미 없음.
      // enabled=false 명시로 클라이언트가 "엔드포인트 부재(404)" 와 구분 가능.
      if (process.env.ENABLE_QUERY_CANCEL === "false") {
        logger.debug("[METRIC] query_cancel_total result=disabled");
        return { cancelled: false, enabled: false };
      }

      const userId = session.login_info.ID;

      // Rate limit — 사용자당 분당 60회 한도. 정상 사용 시 도달 불가, cancel
      // storm/오용 방어용. throw 대신 응답에 rateLimited 플래그 + cancelled:false
      // 로 fail-soft 처리(클라이언트는 이미 abort 됐으므로 영향 0).
      if (!this.tryConsumeCancelToken(userId)) {
        logger.warn(
          `[METRIC] query_cancel_total result=rate_limited userId=${userId}`
        );
        return { cancelled: false, rateLimited: true };
      }

      const { executionId } = body;
      if (!executionId) {
        throw new Error("executionId 가 필요합니다.");
      }

      // ownership 검증은 Service.cancelExecution 내부에서 수행 — userId 불일치 시 false.
      const cancelled = this.queryExecutionService.cancelExecution(
        executionId,
        userId
      );
      return { cancelled };
    } catch (error) {
      logger.error("[QueryExecutionController] SQL 취소 오류:", error);
      throw error;
    }
  }

  /**
   * SQL 쿼리 검증
   * POST /api/query/validate
   *
   * @authPolicy PUBLIC
   * 구문 검증만 수행. session 미사용, body 의 sqlQuery 만으로 동작하는
   * 순수 함수성 라우트이므로 OrkisInterCeptor 우회가 본질.
   */
  @RequestMapping({
    route: "/validate",
    method: REQUEST_METHOD.POST,
    filteredType: FILTER_TYPES.NONE
  })
  async validateQuery(
    @Body() body: { sqlQuery: string }
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const { sqlQuery } = body;

      // 기본 SQL 검증 (향후 확장)
      const valid = this.queryExecutionService.validateSqlQuery(sqlQuery);

      return { valid };
    } catch (error: any) {
      logger.error("[QueryExecutionController] SQL 검증 오류:", error);
      return { valid: false, error: error.message };
    }
  }
}
