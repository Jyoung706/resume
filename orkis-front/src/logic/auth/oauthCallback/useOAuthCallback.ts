/**
 * OAuth 콜백 로직 훅 — JSX/스타일 코드 없음
 * URL params에서 code/state 추출 → /auth/loginCheck 호출
 * 기존 사용자: 자동 로그인 → onExistingUser
 * 신규 사용자: sessionStorage 저장 → onNewUser
 */
import { useState, useEffect, useRef } from "react";
import { getLogger } from "@/logic/shared/utils/logger";

const logger = getLogger("useOAuthCallback");

// --- 타입 ---

type OAuthStatus = "loading" | "success" | "error";

interface OAuthCallbackResult {
  isNewUser: boolean;
  loginInfo?: Record<string, unknown>;
  oauthUser?: {
    email: string;
    name: string;
    provider: string;
    socialId: string;
    state: string;
  };
}

interface UseOAuthCallbackOptions {
  code: string | null;
  state: string | null;
  onExistingUser?: () => void;
  onNewUser?: () => void;
  onError?: (msg: string) => void;
}

interface UseOAuthCallbackReturn {
  status: OAuthStatus;
  error: string | null;
}

// --- 훅 ---

/**
 * OAuth 콜백 페이지에서 인증 결과를 처리하는 훅.
 * 마운트 시 code/state를 검증하고 /auth/loginCheck API를 호출하여
 * 기존 사용자는 자동 로그인, 신규 사용자는 회원가입 페이지로 라우팅한다.
 * @param options - code/state 값 및 결과별 콜백(onExistingUser, onNewUser, onError)
 */
export function useOAuthCallback(options: UseOAuthCallbackOptions): UseOAuthCallbackReturn {
  const [status, setStatus] = useState<OAuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const { code, state } = options;

    if (!code || !state) {
      setStatus("error");
      setError("OAuth 인증 정보가 누락되었습니다.");
      options.onError?.("OAuth 인증 정보가 누락되었습니다.");
      return;
    }

    processCallback(code, state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * OAuth 콜백 처리 핵심 로직.
   * /auth/loginCheck API를 호출하여 신규/기존 사용자를 구분하고,
   * 기존 사용자는 authStore에 토큰 저장, 신규 사용자는 sessionStorage에 OAuth 정보를 저장한다.
   */
  async function processCallback(code: string, state: string) {
    try {
      const { apiPost } = await import("@/logic/shared/services/request");

      const result = await apiPost<OAuthCallbackResult>("/auth/loginCheck", {
        code,
        state,
      });

      if (!result) {
        throw new Error("서버 응답이 없습니다.");
      }

      if (result.isNewUser && result.oauthUser) {
        // 신규 사용자 → sessionStorage에 저장 → 회원가입 이동
        sessionStorage.setItem("oauth_new_user", JSON.stringify(result.oauthUser));
        setStatus("success");
        options.onNewUser?.();
      } else if (result.loginInfo) {
        // 기존 사용자 → 자동 로그인 (쿠키 세션 기반)
        const { useAuthStore } = await import("@/logic/common/auth/authStore");
        useAuthStore.getState().setAuthenticated(result.loginInfo);
        setStatus("success");
        options.onExistingUser?.();
      } else {
        throw new Error("알 수 없는 응답 형식입니다.");
      }
    } catch (err: unknown) {
      logger.error("OAuth callback failed", err);
      const msg = err instanceof Error ? err.message : "OAuth 인증 처리 중 오류가 발생했습니다.";
      setStatus("error");
      setError(msg);
      options.onError?.(msg);
    }
  }

  return { status, error };
}
