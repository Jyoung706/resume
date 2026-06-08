/**
 * 로그인 로직 훅 — JSX/스타일 코드 없음
 * orkis-front의 useLogin.ts + useLoginForm.ts 이식 + Headless 패턴 적용
 */
import { useState } from "react";
import { getLogger } from "@/logic/shared/utils/logger";

const logger = getLogger("useLogin");

// --- 타입 ---

export interface LoginFieldErrors {
  username?: string;
  password?: string;
}

interface UseLoginOptions {
  onSuccess?: () => void;
  onError?: (msg: string) => void;
}

interface UseLoginReturn {
  formData: { username: string; password: string };
  loading: boolean;
  serverError: string | null;
  fieldErrors: LoginFieldErrors;
  setField: (name: string, value: string) => void;
  handleLogin: () => Promise<void>;
  handleSocialLogin: (provider: string) => Promise<void>;
  clearError: () => void;
}

/**
 * 로그인 폼 상태 및 인증 로직을 관리하는 훅.
 * 폼 데이터, 유효성 검증, 일반/소셜 로그인 API 호출을 캡슐화한다.
 * @param options - 로그인 성공/실패 시 호출할 콜백
 */
export function useLogin(options?: UseLoginOptions): UseLoginReturn {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});

  /**
   * 폼 필드 값 변경 핸들러.
   * 값을 업데이트하면서 해당 필드의 에러 메시지를 자동으로 클리어한다.
   * @param name - 필드 이름 ("username" | "password")
   * @param value - 변경할 값
   */
  const setField = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof LoginFieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  /**
   * 클라이언트 사이드 폼 유효성 검증.
   * 아이디/비밀번호 필수값 체크 후 fieldErrors 상태를 업데이트한다.
   * @returns 유효하면 true, 에러가 있으면 false
   */
  const validateForm = (): boolean => {
    const errors: LoginFieldErrors = {};

    if (!formData.username) {
      errors.username = "아이디를 입력해주세요.";
    }
    if (!formData.password) {
      errors.password = "비밀번호를 입력해주세요.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * 일반(아이디/비밀번호) 로그인 처리.
   * 클라이언트 검증 통과 후 authService.login API를 호출하고,
   * 성공 시 sessionStorage에 로그인 정보를 저장한 뒤 onSuccess 콜백을 실행한다.
   */
  const handleLogin = async () => {
    setServerError(null);

    // 클라이언트 검증 실패 시 API 호출 안 함
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { authService } = await import("@/logic/common/auth/authService");
      await authService.login({
        username: formData.username,
        password: formData.password,
      });

      options?.onSuccess?.();
    } catch (error: unknown) {
      logger.error("Login failed", error);

      // orkis-front 동일: 서버 에러는 항상 fallback 메시지로 아이디 필드에 표시
      // (request.ts가 plain object를 throw하므로 실제 서버 메시지 대신 사용자 친화적 메시지)
      const fallbackMsg = "아이디와 비밀번호를 확인해주세요.";
      setFieldErrors((prev) => ({ ...prev, username: fallbackMsg }));

      options?.onError?.(fallbackMsg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 소셜 로그인(OAuth) 처리.
   * 지정된 provider로 OAuth 팝업을 열어 인증을 진행한다.
   * google/apple은 현재 미구현 상태.
   * @param provider - OAuth 제공자 (예: "kakao", "naver")
   */
  const handleSocialLogin = async (provider: string) => {
    if (provider === "google" || provider === "apple") {
      logger.info(`${provider} 로그인은 현재 개발 중`);
      return;
    }

    setLoading(true);
    try {
      const { authService } = await import("@/logic/common/auth/authService");
      await authService.loginWithOAuthRedirect(provider);
      options?.onSuccess?.();
    } catch (error) {
      logger.error(`${provider} 소셜 로그인 실패`, error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 서버 에러 및 필드 에러를 모두 초기화한다.
   */
  const clearError = () => {
    setServerError(null);
    setFieldErrors({});
  };

  return {
    formData,
    loading,
    serverError,
    fieldErrors,
    setField,
    handleLogin,
    handleSocialLogin,
    clearError,
  };
}
