// import { DatabaseSource } from "@/database/DatabaseManager";
import { FileAdapter, RedisAdapter, SQLiteAdapter } from "@orkis/core/database";
import {
  Autowired,
  Body,
  Controller,
  RequestMapping,
  Res,
  Session,
  FILTER_TYPES,
  REQUEST_METHOD
} from "@orkis/core/common";
import type { Response as expressResponse } from "@orkis/core/application";
import logger from "@orkis/core/utils";
import Redis from "ioredis";
import { HealthService, HealthStatusWire } from "./HealthService";

interface HealthStatusRequest {
  dbId?: number | string | null;
  modelId?: string | null;
  /**
   * 도메인별 명시 check 플래그 (panel-domain-checks, 2026-05-22).
   * 누락 시 backwards-compatible default: dbId/modelId 존재 시 자동 check.
   *   - db === false: connectionId 있어도 DB ping skip
   *   - llm === false: modelId 있어도 LLM API check skip
   *   - rag === false: server_health SELECT skip (rag.* + llm.aiServerStatus null)
   */
  checks?: {
    db?: boolean;
    llm?: boolean;
    rag?: boolean;
  };
  /**
   * front 의 sessionStorage 카운터 (0 이상의 정수). 누락 시 0 으로 sanitize.
   * backend 는 pollCount % HEALTH_*_CHECK_EVERY_N === 0 일 때 실측, 나머지는 skipped 마커.
   * 참고: docs/2026-05-26/front-backend-healthcheck-policy-revision.md (rev3, D1/D2).
   */
  pollCount?: number;
  /**
   * 에러 자동 복구 / bootstrap 강제 측정 힌트.
   * front 가 마지막 wire 의 에러 상태 또는 wire=null 시 활성.
   * backend 는 forceCheck.X === true 일 때 modulo throttle 우회.
   * 참고: docs/2026-05-26/front-backend-healthcheck-policy-revision.md (rev3, D4 + C4).
   */
  forceCheck?: {
    db?: boolean;
    llm?: boolean;
  };
  /**
   * front cadence 프로파일. 패널 접힘 시 "background" (60s tick).
   * backend 는 사용하지 않고 logger.debug 관측용으로만 수신.
   * 참고: docs/2026-05-26/front-backend-healthcheck-policy-revision.md (rev3, D7/D9).
   */
  cadenceProfile?: "foreground" | "background";
}

/**
 * pollCount sanitize — 음수/NaN/Infinity/non-number 입력은 0 으로.
 * BC 보장: 미전송 시 0 → 매번 실측 (기존 동작 유지).
 */
function sanitizePollCount(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) return 0;
  return Math.floor(raw);
}

/**
 * forceCheck sanitize — 객체 깨짐/null 입력은 모두 false.
 * 명시적으로 true 인 도메인만 활성.
 */
function sanitizeForceCheck(raw: unknown): { db: boolean; llm: boolean } {
  if (!raw || typeof raw !== "object") return { db: false, llm: false };
  const r = raw as Record<string, unknown>;
  return {
    db: r.db === true,
    llm: r.llm === true
  };
}

/**
 * cadenceProfile sanitize — "background" 외 모두 "foreground".
 */
function sanitizeCadenceProfile(raw: unknown): "foreground" | "background" {
  return raw === "background" ? "background" : "foreground";
}

/**
 * Health Check Controller
 * 서버 상태 확인을 위한 헬스체크 API
 *
 * - GET /health        : 기존 인프라 모니터링용 (절대 변경 금지, CLAUDE.md 배포 체크리스트)
 * - GET /health/status : rev7 wire 계약 (rag / db / llm 3 도메인 + drift/stale)
 *
 * 참고:
 *   docs/2026-05-19/healthCheck/health-check-plan.md (rev7)
 *   docs/2026-05-19/healthCheck/health-check-panel-decisions.md (2026-05-22)
 */
@Controller({ path: "/health" })
export class HealthController {
  @Autowired("HealthService")
  private healthService!: HealthService;

  /**
   * 기본 헬스체크
   */
  // 호출 및 사용여부: 호출 안됨
  // 호출 위치: 호출 위치 없음 (인프라 모니터링 용도)
  @RequestMapping({
    route: "",
    method: REQUEST_METHOD.GET,
    filteredType: FILTER_TYPES.NONE
  })
  async healthCheck(@Res() res: expressResponse) {
    const healthInfo = {
      success: true,
      data: {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        },
        nodeVersion: process.version,
        platform: process.platform
      }
    };

    res.status(200).json(healthInfo);
  }

  /**
   * rev7 wire 계약 헬스 상태 (rag / db / llm 도메인 통합).
   *
   * POST /health/status
   * Body: { dbId?: number | string | null, modelId?: string | null }
   *   - dbId   : 선택된 DB connection_id. 누락/null 시 db.connection=null.
   *   - modelId: 선택된 LLM 모델 id. 누락/null 시 llm.llmConnection=null.
   *
   * GET 에서 POST 로 전환 (2026-05-22) — 기존 orkis 컨트롤러 규약 (POST + Body) 과 일관성.
   *
   * 도메인별 실패는 unknown 마커(null) 로 응답하고 HTTP 자체는 200.
   * 응답은 framework 가 StandardResponse 로 자동 wrap (success/data/timestamp).
   * front 는 apiPost 의 handleResponse 가 .data 를 자동 언래핑.
   */
  @RequestMapping({ route: "/status", method: REQUEST_METHOD.POST })
  async healthStatus(
    @Body() request: HealthStatusRequest | undefined,
    @Session() session: any
  ): Promise<HealthStatusWire> {
    try {
      const userId: string = session?.login_info?.ID;
      if (!userId) {
        throw new Error("인증되지 않은 사용자입니다.");
      }

      const rawDbId = request?.dbId;
      const rawModelId = request?.modelId;

      let connectionId: number | null = null;
      if (typeof rawDbId === "number" && Number.isFinite(rawDbId)) {
        connectionId = rawDbId;
      } else if (
        typeof rawDbId === "string" &&
        rawDbId.length > 0 &&
        !isNaN(Number(rawDbId))
      ) {
        connectionId = Number(rawDbId);
      }

      const modelId =
        typeof rawModelId === "string" && rawModelId.length > 0
          ? rawModelId
          : null;

      // panel-domain-checks (2026-05-22):
      // front 가 명시한 check 플래그 적용. 누락 시 backwards-compatible default.
      const checks = request?.checks;
      const shouldCheckDb = checks?.db !== false && connectionId !== null;
      const shouldCheckLlm = checks?.llm !== false && modelId !== null;
      const skipRag = checks?.rag === false;

      // rev3 신규 — pollCount throttle / forceCheck 자동복구·C4 가드 / cadenceProfile 관측용.
      // 모두 BC 보장: 누락 시 sanitize 가 안전 기본값 반환 (pollCount=0 → 매번 실측).
      const pollCount = sanitizePollCount(request?.pollCount);
      const forceCheck = sanitizeForceCheck(request?.forceCheck);
      const cadenceProfile = sanitizeCadenceProfile(request?.cadenceProfile);

      return await this.healthService.compose({
        userId,
        connectionId: shouldCheckDb ? connectionId : null,
        modelId: shouldCheckLlm ? modelId : null,
        skipRag,
        pollCount,
        forceCheck,
        cadenceProfile
      });
    } catch (error) {
      logger.error("[HealthController] healthStatus 에러:", error);
      throw error;
    }
  }
}
