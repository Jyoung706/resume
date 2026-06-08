import { Service, Autowired } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { AiServerPingClient } from "./AiServerPingClient";
import { ServerHealthRepository } from "./ServerHealthRepository";

/**
 * Python orkis-ai 헬스를 30초 주기로 측정하여 server_health 의 'rag'/'llm' 두 row 를
 * 동시 갱신하는 jobs 측 sole writer.
 *
 * - X1 정책 (plan §3.6.1 확정): timeout/5xx 1회 retry 후에도 실패면 즉시 ai_server_status=false
 * - runOnce 는 절대 throw 하지 않음 — 모든 예외는 logger.error 후 다음 주기에 위임 (SRE 원칙)
 * - 성공 시 last_error 명시적 null 리셋 (plan §5.2)
 *
 * 참고:
 *   docs/2026-05-26/jobs-healthcheck-plan.md §4.2 (시그니처), §3.6.1 (X1 확정), §5 (UPDATE 전략)
 */
@Service("AiServerHealthJob")
export class AiServerHealthJob {
  @Autowired("AiServerPingClient")
  private pingClient!: AiServerPingClient;

  @Autowired("ServerHealthRepository")
  private repo!: ServerHealthRepository;

  /**
   * 30초 주기 단일 실행 단위.
   *
   * 절대 throw 하지 않는다 — 모든 실패는 logger.error 후 다음 주기로 위임.
   * caller (JobScheduler) 는 본 메서드의 reject 를 가정하지 않아도 안전하지만,
   * 추가 안전망으로 scheduleAiServerHealthCheck 에서도 try/catch 한다.
   */
  async runOnce(): Promise<void> {
    const start = Date.now();

    // 1단계 — HTTP ping (절대 throw 안 함, PingResult 로 표준화)
    const result = await this.pingClient.ping();
    const lastError = result.alive ? null : (result.error ?? "unknown");

    // 2단계 — DB UPDATE (throw 가능 — 본 try 에서 흡수하여 다음 주기 위임)
    try {
      await this.repo.updateBothRows({
        aiServerStatus: result.alive,
        lastError,
        lastUpdatedAt: new Date()
      });
      logger.debug(`[AiServerHealthJob] OK`, {
        alive: result.alive,
        durationMs: Date.now() - start,
        ...(lastError ? { lastError } : {})
      });
    } catch (e) {
      // DB UPDATE 실패는 자체 logger.error 후 다음 주기에서 자연 재시도
      // last_updated_at 정체로 backend stale 판정이 후속 PR 에서 가시화 (plan §3.6 D5 표)
      logger.error(`[AiServerHealthJob] DB UPDATE 실패 — 다음 주기 재시도`, e);
    }
  }
}
