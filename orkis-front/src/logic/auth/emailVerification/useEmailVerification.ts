/**
 * 이메일 인증 로직 훅 — JSX/스타일 코드 없음
 * URL의 token으로 /email-verification/verify API 호출
 */
import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/logic/common/auth/authStore";
import { getLogger } from "@/logic/shared/utils/logger";

const logger = getLogger("useEmailVerification");

// --- 타입 ---

export type EmailVerificationStatus = "loading" | "success" | "error" | "expired";

interface VerificationResult {
  status: EmailVerificationStatus;
  message: string;
  email?: string;
}

interface UseEmailVerificationOptions {
  token: string | null;
  onSuccess?: (email?: string) => void;
  onError?: (msg: string) => void;
}

interface UseEmailVerificationReturn {
  status: EmailVerificationStatus;
  message: string;
  email?: string;
  isAuthenticated: boolean;
}

// --- 훅 ---

/**
 * 이메일 인증 토큰을 처리하는 훅.
 * 마운트 시 URL의 token으로 /email-verification/verify API를 호출하여
 * 인증 성공/실패/만료 상태를 반환하고 authStore의 EMAIL_VERIFIED 플래그를 업데이트한다.
 * @param options - 인증 토큰 및 성공/실패 콜백
 */
export function useEmailVerification(options: UseEmailVerificationOptions): UseEmailVerificationReturn {
  const { token } = options;
  const calledRef = useRef(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [result, setResult] = useState<VerificationResult>({
    status: "loading",
    message: "이메일 인증을 처리하고 있습니다...",
  });

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    if (!token) {
      setResult({
        status: "error",
        message: "유효하지 않은 인증 링크입니다. 토큰이 없습니다.",
      });
      return;
    }

    verifyEmail(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 이메일 인증 API 호출 핵심 로직.
   * 토큰 유효성 확인 후 성공 시 authStore에 EMAIL_VERIFIED를 true로 설정하고,
   * 에러 코드에 따라 만료/무효/중복인증 등 상태를 구분하여 처리한다.
   */
  async function verifyEmail(t: string) {
    try {
      const { apiPost } = await import("@/logic/shared/services/request");
      const response = await apiPost<{ message: string; email: string }>("/email-verification/verify", { token: t });

      // 인증 성공 시 authStore 업데이트
      try {
        const { useAuthStore } = await import("@/logic/common/auth/authStore");
        const currentState = useAuthStore.getState();
        if (currentState.isAuthenticated && currentState.user) {
          currentState.setUser({
            ...currentState.user,
            EMAIL_VERIFIED: true,
          } as typeof currentState.user);
        }
      } catch {
        // authStore 업데이트 실패는 무시
      }

      setResult({
        status: "success",
        message: response?.message || "이메일 인증이 완료되었습니다.",
        email: response?.email,
      });
      options.onSuccess?.(response?.email);
    } catch (err: unknown) {
      logger.error("인증 실패:", err);
      const obj = err as Record<string, unknown>;
      const inner = obj?.error as Record<string, unknown> | undefined;
      const code = (inner?.code || obj?.error || obj?.code) as string | undefined;
      const message = (inner?.message || obj?.message) as string | undefined;

      if (code === "TOKEN_EXPIRED") {
        setResult({ status: "expired", message: "인증 링크가 만료되었습니다. 새로운 인증 메일을 요청해주세요." });
      } else if (code === "TOKEN_NOT_FOUND" || code === "INVALID_TOKEN" || code === "TOKEN_INVALID") {
        setResult({ status: "error", message: "유효하지 않은 인증 링크입니다." });
      } else if (code === "ALREADY_VERIFIED") {
        // 이미 인증된 경우도 성공으로 처리
        try {
          const { useAuthStore } = await import("@/logic/common/auth/authStore");
          const currentState = useAuthStore.getState();
          if (currentState.isAuthenticated && currentState.user) {
            currentState.setUser({
              ...currentState.user,
              EMAIL_VERIFIED: true,
            } as typeof currentState.user);
          }
        } catch {
          // ignore
        }
        setResult({ status: "success", message: "이미 인증이 완료된 이메일입니다." });
        options.onSuccess?.();
      } else if (code === "TOKEN_USED") {
        setResult({ status: "error", message: "이미 사용된 인증 링크입니다." });
      } else {
        setResult({ status: "error", message: message || "이메일 인증 중 오류가 발생했습니다." });
      }
      options.onError?.(message || "인증 실패");
    }
  }

  return {
    status: result.status,
    message: result.message,
    email: result.email,
    isAuthenticated,
  };
}
