/**
 * Query Service — SQL 쿼리 실행 API
 */
import { apiPost } from "@/logic/shared/services/request";
import { getLogger } from "@/logic/shared/utils/logger";

const logger = getLogger("QueryService");

export interface ExecuteQueryRequest {
  sqlQuery: string;
  dbId?: string;
  connectionId?: number;
  limit?: number | null;
  /** Phase 2 cancel 추적 ID — Pro 모드에서만 전달. 일반 채팅 호출자는 미전달. */
  executionId?: string;
}

export interface ExecuteQueryResponse {
  columns: string[];
  data: Array<Record<string, unknown>>;
  queryTitle: string;
  querySubtitle?: string;
  executionTime?: number;
}

export interface CancelQueryResponse {
  cancelled: boolean;
  /** Feature Flag(ENABLE_QUERY_CANCEL=false) 시 백엔드가 false 로 명시. */
  enabled?: boolean;
  /** 사용자당 cancel 호출 빈도 초과 시 true (백엔드 token bucket). */
  rateLimited?: boolean;
}

/**
 * SQL 쿼리 실행 옵션. signal 은 Pro 모드 cancel 용. 일반 채팅 호출자는 미전달.
 */
export interface ExecuteQueryOptions extends Omit<ExecuteQueryRequest, "sqlQuery"> {
  signal?: AbortSignal;
}

/**
 * SQL 쿼리 실행
 * @param sqlQuery 실행할 SQL 쿼리
 * @param options dbId, connectionId, limit, executionId, signal. signal 은 옵셔널 —
 *   미전달 시 기존 동작(요청 데두프 적용, abort 불가) 그대로 유지된다. signal 을
 *   전달하면 pendingRequests 데두프가 우회되고 abort 가능해진다 (request.ts:364).
 *   executionId 도 옵셔널 — Pro 모드에서 nanoid 로 생성하여 cancel 추적에 사용.
 */
export async function executeQuery(
  sqlQuery: string,
  options?: ExecuteQueryOptions,
): Promise<ExecuteQueryResponse> {
  const { signal, ...body } = options ?? {};
  try {
    // signal 이 있을 때만 apiPost 3번째 인자 전달 — 미전달 시 기존 호출 시그니처와
    // 완전히 동일하게 동작하여 일반 채팅 경로(R8 불변식) 영향 0 보장.
    const response = signal
      ? await apiPost<ExecuteQueryResponse>("/query/execute", { sqlQuery, ...body }, { signal })
      : await apiPost<ExecuteQueryResponse>("/query/execute", { sqlQuery, ...body });

    return response;
  } catch (error) {
    logger.error("SQL 쿼리 실행 오류:", error);
    throw error;
  }
}

/**
 * 진행 중인 SQL 쿼리 중지 (Phase 2).
 * - fail-soft: 네트워크 오류/서버 예외 등 throw 시에도 catch 후 false 반환. UI 는
 *   이미 클라이언트 abort 로 회수됐으므로 서버 cancel 실패 시에도 사용자 체감 영향 0.
 * - Feature Flag off 시 백엔드가 HTTP 200 + { cancelled: false, enabled: false }
 *   응답 → warn 로그 후 false 반환 (503 아님 — 설계 §10.2 참조).
 * - rate limit 초과 시 HTTP 200 + { cancelled: false, rateLimited: true } 응답
 *   → warn 로그 후 false 반환.
 */
export async function cancelQuery(executionId: string): Promise<boolean> {
  try {
    const response = await apiPost<CancelQueryResponse>("/query/cancel", {
      executionId,
    });
    if (response.enabled === false) {
      logger.warn("백엔드 query cancel 기능이 비활성화되어 있습니다.");
    }
    if (response.rateLimited) {
      logger.warn("백엔드 query cancel rate limit 초과 — 잠시 후 다시 시도하세요.");
    }
    return response.cancelled;
  } catch (error) {
    // best-effort — 서버 측 cancel 실패해도 UI 는 이미 abort 로 회수됨.
    logger.warn("쿼리 취소 요청 실패 (UI 는 정상 회수됨):", error);
    return false;
  }
}
