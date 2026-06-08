import { Service } from "@orkis/core/common";
import logger from "@orkis/core/utils";

/**
 * Python orkis-ai 서버의 헬스 ping 결과 표준화 객체.
 *
 * - alive: 200 OK 응답을 받았는가 (HTTP status 우선 — body 본문은 검사하지 않음)
 * - error: 실패 시 진단용 짧은 문자열. 성공 시 undefined.
 *
 * 참고: docs/2026-05-26/jobs-healthcheck-plan.md §3.2 (D1), §3.6 (D5 — X1 확정), §7.1 (N1/N8)
 */
export interface PingResult {
  alive: boolean;
  error?: string;
}

/**
 * Python orkis-ai 서버의 /v1/health 를 호출하는 얇은 HTTP 클라이언트.
 *
 * - 호출 URL: `${RAG_SERVER_URL}${AI_HEALTH_ENDPOINT_PATH}` (기본 .../v1/health)
 * - timeout: 2000ms (AbortController) — env AI_HEALTH_CHECK_TIMEOUT_MS
 * - retry: 1회 (timeout / 5xx / 연결 실패만 재시도, 4xx 는 재시도 안 함) — env AI_HEALTH_CHECK_RETRY_COUNT
 * - 절대 throw 하지 않음. 모든 실패는 PingResult.alive=false + error 문자열로 표준화
 *
 * 참고:
 *   docs/2026-05-26/jobs-healthcheck-plan.md §3.2 D1, §3.6 D5 (X1), §7.1 N1/N8
 *   apps/orkis-ai/app/chat/controller.py:44 (/v1/health endpoint 정의)
 */
@Service("AiServerPingClient")
export class AiServerPingClient {
  /**
   * 1주기 헬스 ping 실행.
   *
   * - 4xx 응답: retry 없이 즉시 false 기록 (구성 오류)
   * - 5xx / timeout / 연결 실패: 1회 retry 후에도 실패하면 false 기록
   * - TLS 에러: TLS_ERROR 접두로 last_error 기록 (HTTPS 환경 cert 만료 등)
   */
  async ping(): Promise<PingResult> {
    const url = this.buildUrl();
    const timeoutMs = this.parseTimeoutMs();
    const retryCount = this.parseRetryCount();

    // 최초 호출 + retry 횟수만큼 반복 (총 호출 = 1 + retryCount)
    let lastResult: PingResult | null = null;
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      const result = await this.singleAttempt(url, timeoutMs);
      lastResult = result;

      // 성공 즉시 반환
      if (result.alive) {
        return result;
      }

      // 4xx 는 재시도 안 함 (HTTP_4XX 접두 사용)
      if (result.error?.startsWith("HTTP 4xx")) {
        return result;
      }

      // TLS 에러도 재시도 안 함 (인증서/구성 문제는 즉시 가시화)
      if (result.error?.startsWith("TLS_ERROR")) {
        return result;
      }
    }

    return lastResult ?? { alive: false, error: "unknown" };
  }

  /**
   * 단일 HTTP 호출 시도. throw 하지 않고 PingResult 로 표준화.
   */
  private async singleAttempt(url: string, timeoutMs: number): Promise<PingResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal
      });

      // HTTP status 우선 (body 본문 unhealthy 시나리오는 §7.1 N8 — status 가 진실)
      if (response.status >= 200 && response.status < 300) {
        return { alive: true };
      }
      if (response.status >= 400 && response.status < 500) {
        return { alive: false, error: `HTTP 4xx: ${response.status}` };
      }
      if (response.status >= 500) {
        return { alive: false, error: `HTTP 5xx: ${response.status}` };
      }
      return { alive: false, error: `HTTP ${response.status}` };
    } catch (err: unknown) {
      return { alive: false, error: this.classifyError(err, timeoutMs) };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * fetch 가 throw 한 에러를 짧은 진단 문자열로 분류.
   * - AbortError → timeout
   * - TLS 관련 → TLS_ERROR 접두
   * - 연결 거부 / DNS → 원본 메시지 짧게
   */
  private classifyError(err: unknown, timeoutMs: number): string {
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        return `timeout after ${timeoutMs}ms`;
      }
      const msg = err.message ?? "";
      // Node fetch 의 TLS 에러는 UND_ERR_TLS_* / cert / SSL 관련 키워드 포함
      if (/TLS|certificate|SSL|UND_ERR_TLS/i.test(msg)) {
        return `TLS_ERROR: ${this.truncate(msg, 120)}`;
      }
      // ECONNREFUSED / ENOTFOUND / ETIMEDOUT 등은 그대로 노출
      return this.truncate(msg || err.name, 120);
    }
    return "unknown";
  }

  /**
   * RAG_SERVER_URL 의 trailing slash 와 AI_HEALTH_ENDPOINT_PATH 의 leading slash 충돌 방지.
   */
  private buildUrl(): string {
    const base = (process.env.RAG_SERVER_URL ?? "https://orkis.kr/api-ai/v1").replace(/\/+$/, "");
    const rawPath = process.env.AI_HEALTH_ENDPOINT_PATH ?? "/health";
    const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    return `${base}${path}`;
  }

  /**
   * env 미설정 / NaN / 음수 등 비정상 입력은 기본값 2000ms 로 sanitize.
   */
  private parseTimeoutMs(): number {
    const raw = parseInt(process.env.AI_HEALTH_CHECK_TIMEOUT_MS ?? "2000", 10);
    if (!Number.isFinite(raw) || raw <= 0) {
      logger.warn(`[AiServerPingClient] AI_HEALTH_CHECK_TIMEOUT_MS 비정상 — 기본 2000ms 적용`);
      return 2000;
    }
    return raw;
  }

  /**
   * env 미설정 / NaN / 음수는 기본값 1 로 sanitize. 과도한 retry 방지 상한 10.
   */
  private parseRetryCount(): number {
    const raw = parseInt(process.env.AI_HEALTH_CHECK_RETRY_COUNT ?? "1", 10);
    if (!Number.isFinite(raw) || raw < 0) {
      logger.warn(`[AiServerPingClient] AI_HEALTH_CHECK_RETRY_COUNT 비정상 — 기본 1 적용`);
      return 1;
    }
    return Math.min(raw, 10);
  }

  private truncate(s: string, max: number): string {
    return s.length > max ? `${s.slice(0, max)}...` : s;
  }
}
