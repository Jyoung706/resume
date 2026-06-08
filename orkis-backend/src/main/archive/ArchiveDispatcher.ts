import { Service } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { DispatchPayload, DispatchReason } from "./archiveTypes";

/**
 * Backend -> Jobs HTTP archive trigger 발행기.
 *
 * 정책 (사용자 요구 U2 - 결과 무관 fire-and-forget):
 * - dispatch(chatId, hints?): void  반환 (Promise 미반환, 호출자 await 금지)
 * - AbortSignal.timeout 으로 1.5s timeout
 * - 모든 실패(timeout/4xx/5xx/network) 는 logger.error 만, retry 0회
 * - SSE 응답 경로 비차단 (호출자는 void this.archiveDispatcher.dispatch(chatId, hints) 형태 사용)
 *
 * cancel-archive race fix (Phase 2):
 * - hints.completionCode / hints.reason 을 payload 에 동봉. jobs 가 1순위로 사용.
 * - hints 미전달도 허용 (구 호출 호환). jobs 가 redis r 로 fallback.
 */
@Service()
export class ArchiveDispatcher {
  private readonly enabled =
    (process.env.ENABLE_HTTP_ARCHIVE ?? "true").toLowerCase() === "true";

  private readonly url = process.env.JOBS_HTTP_URL ?? "";

  private readonly timeoutMs = parseInt(
    process.env.ARCHIVE_DISPATCH_TIMEOUT_MS ?? "1500",
    10
  );

  constructor() {
    // fail-fast: enabled 인데 URL 미설정 시 부팅 실패
    if (this.enabled && !this.url) {
      throw new Error(
        "ENABLE_HTTP_ARCHIVE=true but JOBS_HTTP_URL is empty (set JOBS_HTTP_URL or disable with ENABLE_HTTP_ARCHIVE=false)"
      );
    }
  }

  /**
   * fire-and-forget. void 반환. 호출자는 `void this.dispatch(chatId, hints?)` 사용.
   *
   * @param chatId 대상 채팅 ID
   * @param hints 선택적 종료 코드/사유 (backend 가 stream 종료 의지 결정 시 명시)
   */
  dispatch(
    chatId: string,
    hints?: { completionCode?: number; reason?: DispatchReason }
  ): void {
    if (!this.enabled) {
      return;
    }

    const payload: DispatchPayload = { chatId };
    if (hints?.completionCode !== undefined) {
      payload.completionCode = hints.completionCode;
    }
    if (hints?.reason !== undefined) {
      payload.reason = hints.reason;
    }
    const endpoint = `${this.url.replace(/\/$/, "")}/archive/internal`;

    // floating Promise - 의도적으로 await 안 함
    void fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.timeoutMs)
    })
      .then((res) => {
        if (!res.ok) {
          // structured KPI: dispatch_failure (panel #3)
          logger.error("archive_dispatch_failure", {
            chatId,
            status: res.status,
            reason: hints?.reason,
            endpoint
          });
        }
      })
      .catch((err) => {
        logger.error("archive_dispatch_failure", {
          chatId,
          status: 0,
          reason: hints?.reason,
          error: String(err),
          endpoint
        });
      });
  }
}
