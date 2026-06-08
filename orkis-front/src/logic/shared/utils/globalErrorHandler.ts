/**
 * 전역 에러 핸들러 (Layer 4 — 최후의 안전망)
 *
 * Error Boundary가 잡지 못하는 영역을 포착한다:
 *   - 미처리 Promise rejection (try-catch 누락된 비동기)
 *   - 미처리 동기 에러 (이벤트 핸들러 등)
 *   - 스크립트 청크 로드 실패 (배포 직후 자주 발생)
 *
 * 사용자에게도 알림을 표시하여 "조용한 실패"를 방지한다.
 */
import { getLogger } from "./logger";
import { reportError } from "@/logic/shared/monitoring/errorReporter";
import { showToast } from "./toast";

const logger = getLogger("GlobalError");

// --- 토스트 폭주 방지 (3초 스로틀) ---
const recentMessages = new Map<string, number>();
const THROTTLE_MS = 3000;
const CLEANUP_AFTER_MS = 10_000;

function shouldNotify(message: string): boolean {
  const now = Date.now();
  const last = recentMessages.get(message) ?? 0;
  if (now - last < THROTTLE_MS) return false;
  recentMessages.set(message, now);

  // 오래된 항목 정리 (메모리 누수 방지)
  for (const [key, time] of recentMessages) {
    if (now - time > CLEANUP_AFTER_MS) recentMessages.delete(key);
  }
  return true;
}

// --- API 에러 중복 알림 방지 ---
// request.ts가 이미 모달/토스트를 표시한 에러는 globalErrorHandler에서 무시
function isAlreadyHandled(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  // request.ts가 throw하는 에러 객체 형태: { error: { code, message }, success: false }
  // 또는 Error 인스턴스에 __handled 마커가 부착된 경우
  if ("__handled" in error && (error as { __handled: unknown }).__handled === true) {
    return true;
  }
  // request.ts의 에러 객체는 error.error.code 형태 — 이미 표시됨
  if (
    "error" in error &&
    typeof (error as { error: unknown }).error === "object" &&
    (error as { error: { code?: string } }).error?.code
  ) {
    return true;
  }
  return false;
}

const isDev = import.meta.env.DEV;

function getUserMessage(rawMessage: string): string {
  if (isDev) return `[Dev] ${rawMessage}`;
  return "일시적인 오류가 발생했습니다.";
}

// --- 핸들러 등록 상태 ---
let isInstalled = false;

/**
 * window 레벨 전역 에러 핸들러를 등록한다.
 * main.tsx에서 앱 마운트 전에 1회만 호출.
 */
export function setupGlobalErrorHandlers(): void {
  if (isInstalled || typeof window === "undefined") return;
  isInstalled = true;

  // 미처리 Promise rejection
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;

    if (isAlreadyHandled(reason)) {
      // request.ts가 이미 처리함 — 콘솔 노이즈 방지
      event.preventDefault();
      return;
    }

    const error =
      reason instanceof Error ? reason : new Error(String(reason ?? "unknown"));

    logger.error("Unhandled rejection:", error);
    reportError(error, { source: "unhandledrejection" });

    if (shouldNotify(error.message)) {
      showToast(getUserMessage(error.message), "error");
    }

    event.preventDefault();
  });

  // 미처리 동기 에러
  window.addEventListener("error", (event) => {
    // 스크립트 로드 실패 (청크 로드 에러) — 새 버전 배포 시 발생
    if (event.target instanceof HTMLScriptElement) {
      const src = event.target.src;
      logger.error("Script load failed:", src);
      reportError(new Error(`Script load failed: ${src}`), {
        source: "script_load_error",
      });

      // 모달로 표시 (새로고침 유도)
      window.dispatchEvent(
        new CustomEvent("modal:error", {
          detail: {
            title: "업데이트 안내",
            message:
              "새 버전이 배포되었습니다. 페이지를 새로고침해주세요.",
          },
        })
      );
      return;
    }

    if (event.error) {
      if (isAlreadyHandled(event.error)) {
        event.preventDefault();
        return;
      }

      const error: Error =
        event.error instanceof Error
          ? event.error
          : new Error(String(event.error));

      logger.error("Unhandled error:", error);
      reportError(error, { source: "unhandled_error" });

      if (shouldNotify(error.message)) {
        showToast(getUserMessage(error.message), "error");
      }
    }
    event.preventDefault();
  });
}
