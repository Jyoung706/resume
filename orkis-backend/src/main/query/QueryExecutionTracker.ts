/**
 * Phase 1 PR#3 (D20) - 진행 중인 쿼리 실행의 cancel/ownership/GC 트래커.
 *
 * 추출 의도:
 *   기존 QueryExecutionService 가 보유하던 activeExecutions Map + cancelExecution
 *   + gcStaleExecutions 을 별도 service 로 분리. execution path 와 export path
 *   가 _동일 트래커_ 를 공유 가능. metric 일원화 + cross-feature ownership 검증.
 *
 * 본 PR 범위:
 *   - QueryExecutionService 가 본 트래커를 주입받아 기존 동작 그대로 위임
 *   - export path 는 본 트래커를 _아직 사용하지 않음_ (후속 PR 에서 통합)
 *
 * Metric 호환성:
 *   기존 로그 형식 (`[METRIC] query_cancel_total ...`, `query_gc_stale_total`,
 *   `query_active_executions_gauge`) 을 _그대로_ 유지. 모니터링 보드 무영향.
 *
 * 참조: docs/2026-06-01/bulk-download-streaming-plan.md (§9.4, D20)
 */
import { Service } from "@orkis/core/common";
import logger from "@orkis/core/utils";

/**
 * 실행 중인 쿼리 핸들의 최소 인터페이스.
 *   - SQLite: sqlite3.Database (interrupt + close 보유)
 *   - 향후 driver: cursor close / client release 등
 */
export interface ExecutionHandle {
  interrupt?(): void;
  close?(): void;
}

interface ActiveExecution {
  handle: ExecutionHandle;
  userId: string;
  startedAt: number;
}

@Service("QueryExecutionTracker")
export class QueryExecutionTracker {
  private activeExecutions = new Map<string, ActiveExecution>();
  private static readonly STALE_THRESHOLD_MS = 5 * 60_000;
  private static readonly GC_INTERVAL_MS = 60_000;
  private gcInterval: NodeJS.Timeout;

  constructor() {
    this.gcInterval = setInterval(
      () => this.gcStale(),
      QueryExecutionTracker.GC_INTERVAL_MS
    );
    // unref - 본 interval 이 이벤트 루프 유지 자체에 기여하지 않도록.
    if (typeof this.gcInterval.unref === "function") {
      this.gcInterval.unref();
    }
  }

  /** 등록 여부 확인 - duplicate-ID preventive check 용 */
  has(id: string): boolean {
    return this.activeExecutions.has(id);
  }

  /**
   * 핸들 등록. duplicate-ID 시 throw - 호출자가 reject.
   * 정상 클라이언트는 nanoid 로 매번 새 ID 생성 (~149bit 충돌 무시 가능).
   */
  register(id: string, userId: string, handle: ExecutionHandle): void {
    if (this.activeExecutions.has(id)) {
      logger.warn(
        `[METRIC] query_cancel_total result=duplicate executionId=${id}`
      );
      throw new Error(`duplicate executionId: ${id}`);
    }
    this.activeExecutions.set(id, {
      handle,
      userId,
      startedAt: Date.now()
    });
  }

  /** 핸들 해제 - idempotent. 정상 완료·에러 양쪽에서 호출 가능 */
  unregister(id: string): void {
    this.activeExecutions.delete(id);
  }

  /**
   * 진행 중인 쿼리 cancel.
   *   - id 미존재: false (정보 누설 회피 - "다른 사용자" 임을 별도로 알리지 않음)
   *   - ownership 불일치: false + warn 로그
   *   - 정상: handle.interrupt() + delete + info 로그
   */
  cancel(id: string, requesterUserId: string): boolean {
    const entry = this.activeExecutions.get(id);
    if (!entry) {
      logger.debug(
        `[METRIC] query_cancel_total result=not_found executionId=${id}`
      );
      return false;
    }
    if (entry.userId !== requesterUserId) {
      logger.warn(
        `[METRIC] query_cancel_total result=rejected_ownership executionId=${id} requesterUserId=${requesterUserId}`
      );
      return false;
    }
    try {
      entry.handle.interrupt?.();
    } catch (err) {
      logger.warn(
        `[QueryExecutionTracker] interrupt 호출 실패 (executionId=${id}):`,
        err
      );
    }
    this.activeExecutions.delete(id);
    logger.info(
      `[METRIC] query_cancel_total result=success executionId=${id} userId=${requesterUserId}`
    );
    return true;
  }

  /** 등록된 엔트리 수 - metric 노출용 */
  size(): number {
    return this.activeExecutions.size;
  }

  /**
   * stale entry GC. 콜백 미발화/프로세스 hang 시 자동 회수.
   * STALE_THRESHOLD_MS (5분) 경과 시 정리.
   */
  private gcStale(): void {
    const now = Date.now();
    // 주기적 메트릭 식별자 - 후속 Prometheus exporter 가 본 라인을 grep 가능.
    logger.debug(
      `[METRIC] query_active_executions_gauge value=${this.activeExecutions.size}`
    );
    for (const [id, entry] of this.activeExecutions) {
      if (now - entry.startedAt > QueryExecutionTracker.STALE_THRESHOLD_MS) {
        logger.warn(
          `[METRIC] query_gc_stale_total executionId=${id} userId=${entry.userId}`
        );
        try {
          entry.handle.interrupt?.();
          entry.handle.close?.();
        } catch (cleanupErr) {
          logger.warn(
            "[QueryExecutionTracker] GC cleanup 예외:",
            cleanupErr
          );
        }
        this.activeExecutions.delete(id);
      }
    }
  }
}
