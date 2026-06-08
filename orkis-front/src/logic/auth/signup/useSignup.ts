/**
 * 회원가입 로직 훅 — JSX/스타일 코드 없음
 * orkis-front의 회원가입 로직 이식 + Headless 패턴 적용
 */
import { useState } from "react";
import type { SignupFieldErrors, OAuthUser } from "@/logic/common/auth/types/auth";
import { getLogger } from "@/logic/shared/utils/logger";

const logger = getLogger("useSignup");

// --- 타입 ---

export interface SignupFormData {
  username: string;
  name: string;
  password: string;
  confirmPassword: string;
  email: string;
  useIdAsName: boolean;
}

interface UseSignupOptions {
  onSuccess?: () => void;
  onError?: (msg: string) => void;
  userType?: string;
  oauthUser?: OAuthUser | null;
}

interface UseSignupReturn {
  formData: SignupFormData;
  loading: boolean;
  serverError: string | null;
  fieldErrors: SignupFieldErrors;
  duplicateChecked: { username: boolean; email: boolean };
  setField: (name: string, value: string) => void;
  setCheckbox: (name: string, checked: boolean) => void;
  handleSignup: () => Promise<void>;
  checkUsername: () => Promise<void>;
  checkEmail: () => Promise<void>;
  clearError: () => void;
}

// --- 유효성 검사 ---

const RULES = {
  username: {
    min: 6,
    max: 20,
    pattern: /^[a-zA-Z0-9]+$/,
  },
  password: {
    min: 8,
    pattern: /(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>])/,
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
} as const;

/**
 * 서버 에러 객체에서 사용자에게 표시할 메시지를 추출한다.
 * 중첩된 error.error.message 또는 error.message 패턴을 순차적으로 탐색한다.
 */
function extractErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const obj = error as Record<string, unknown>;
    if (obj.error && typeof obj.error === "object") {
      const inner = obj.error as Record<string, unknown>;
      if (typeof inner.message === "string") return inner.message;
    }
    if (typeof obj.message === "string") return obj.message;
  }
  return "알 수 없는 오류가 발생했습니다.";
}

// --- 훅 ---

/**
 * 회원가입 폼 상태와 가입 로직을 관리하는 훅.
 * 일반 가입과 OAuth 가입을 모두 지원하며, 필드 유효성 검증·중복확인·API 제출을 캡슐화한다.
 * @param options - 사용자 타입, OAuth 정보, 성공/실패 콜백
 */
export function useSignup(options?: UseSignupOptions): UseSignupReturn {
  const [formData, setFormData] = useState<SignupFormData>({
    username: "",
    name: "",
    password: "",
    confirmPassword: "",
    email: options?.oauthUser?.email ?? "",
    useIdAsName: false,
  });
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<SignupFieldErrors>({});
  const [duplicateChecked, setDuplicateChecked] = useState({
    username: false,
    email: !!options?.oauthUser,
  });

  const isOAuth = !!options?.oauthUser;

  /**
   * 폼 필드 값 변경 핸들러.
   * useIdAsName 옵션이 활성화된 상태에서 username 변경 시 name도 자동 동기화하며,
   * 해당 필드 에러를 클리어하고 중복확인 상태를 초기화한다.
   */
  const setField = (name: string, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      // useIdAsName 체크 시 username 변경하면 name도 동기화
      if (name === "username" && prev.useIdAsName) {
        next.name = value;
      }
      return next;
    });
    // 필드 에러 클리어
    if (fieldErrors[name as keyof SignupFieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    // 중복확인 초기화 (값 변경 시)
    if (name === "username") {
      setDuplicateChecked((prev) => ({ ...prev, username: false }));
    }
    if (name === "email") {
      setDuplicateChecked((prev) => ({ ...prev, email: false }));
    }
  };

  /**
   * 체크박스 필드 변경 핸들러.
   * "useIdAsName" 체크 시 name을 username 값으로 자동 설정한다.
   */
  const setCheckbox = (name: string, checked: boolean) => {
    if (name === "useIdAsName") {
      setFormData((prev) => ({
        ...prev,
        useIdAsName: checked,
        name: checked ? prev.username : prev.name,
      }));
    }
  };

  /**
   * 클라이언트 사이드 폼 유효성 검증.
   * OAuth 가입 시 username/password 검증을 스킵하며,
   * 아이디 길이·패턴, 비밀번호 복잡도, 이메일 형식, 중복확인 여부를 체크한다.
   * @returns 유효하면 true, 에러가 있으면 false
   */
  const validateForm = (): boolean => {
    const errors: SignupFieldErrors = {};

    // OAuth 가입 시 username/password 검증 스킵
    if (!isOAuth) {
      if (!formData.username) {
        errors.username = "아이디를 입력해주세요.";
      } else if (formData.username.length < RULES.username.min || formData.username.length > RULES.username.max) {
        errors.username = `아이디는 ${RULES.username.min}~${RULES.username.max}자로 입력해주세요.`;
      } else if (!RULES.username.pattern.test(formData.username)) {
        errors.username = "아이디는 영문과 숫자만 사용 가능합니다.";
      } else if (!duplicateChecked.username) {
        errors.username = "아이디 중복확인을 해주세요.";
      }

      if (!formData.password) {
        errors.password = "비밀번호를 입력해주세요.";
      } else if (formData.password.length < RULES.password.min) {
        errors.password = `비밀번호는 ${RULES.password.min}자 이상이어야 합니다.`;
      } else if (!RULES.password.pattern.test(formData.password)) {
        errors.password = "비밀번호에 대소문자와 특수문자를 포함해주세요.";
      }

      if (!formData.confirmPassword) {
        errors.confirmPassword = "비밀번호 확인을 입력해주세요.";
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = "비밀번호가 일치하지 않습니다.";
      }
    }

    if (!formData.name) {
      errors.name = "이름(닉네임)을 입력해주세요.";
    }

    if (!formData.email) {
      errors.email = "이메일을 입력해주세요.";
    } else if (!RULES.email.pattern.test(formData.email)) {
      errors.email = "올바른 이메일 형식을 입력해주세요.";
    } else if (!isOAuth && !duplicateChecked.email) {
      errors.email = "이메일 중복확인을 해주세요.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * 아이디 중복확인 API 호출.
   * 클라이언트 검증(길이·패턴) 통과 후 /auth/check-username을 호출하여
   * 사용 가능 여부를 확인하고 duplicateChecked 상태를 업데이트한다.
   */
  const checkUsername = async () => {
    if (!formData.username) {
      setFieldErrors((prev) => ({ ...prev, username: "아이디를 입력해주세요." }));
      return;
    }
    if (formData.username.length < RULES.username.min || formData.username.length > RULES.username.max) {
      setFieldErrors((prev) => ({ ...prev, username: `아이디는 ${RULES.username.min}~${RULES.username.max}자로 입력해주세요.` }));
      return;
    }
    if (!RULES.username.pattern.test(formData.username)) {
      setFieldErrors((prev) => ({ ...prev, username: "아이디는 영문과 숫자만 사용 가능합니다." }));
      return;
    }

    try {
      const { apiPost } = await import("@/logic/shared/services/request");
      const result = await apiPost<{ exists: boolean; available: boolean }>(
        "/auth/check-username", { username: formData.username }, { silent: true }
      );
      if (result?.available === false) {
        setFieldErrors((prev) => ({ ...prev, username: "이미 사용 중인 아이디입니다." }));
        setDuplicateChecked((prev) => ({ ...prev, username: false }));
      } else {
        setDuplicateChecked((prev) => ({ ...prev, username: true }));
        setFieldErrors((prev) => ({ ...prev, username: undefined }));
      }
    } catch (error) {
      logger.error("Username check failed", error);
      setFieldErrors((prev) => ({ ...prev, username: "아이디 확인 중 오류가 발생했습니다." }));
      setDuplicateChecked((prev) => ({ ...prev, username: false }));
    }
  };

  /**
   * 이메일 중복확인 API 호출.
   * 이메일 형식 검증 후 /auth/check-email을 호출하여
   * 사용 가능 여부를 확인하고 duplicateChecked 상태를 업데이트한다.
   */
  const checkEmail = async () => {
    if (!formData.email) {
      setFieldErrors((prev) => ({ ...prev, email: "이메일을 입력해주세요." }));
      return;
    }
    if (!RULES.email.pattern.test(formData.email)) {
      setFieldErrors((prev) => ({ ...prev, email: "올바른 이메일 형식을 입력해주세요." }));
      return;
    }

    try {
      const { apiPost } = await import("@/logic/shared/services/request");
      const result = await apiPost<{ exists: boolean; available: boolean }>(
        "/auth/check-email", { email: formData.email }, { silent: true }
      );
      if (result?.available === false) {
        setFieldErrors((prev) => ({ ...prev, email: "이미 사용 중인 이메일입니다." }));
        setDuplicateChecked((prev) => ({ ...prev, email: false }));
      } else {
        setDuplicateChecked((prev) => ({ ...prev, email: true }));
        setFieldErrors((prev) => ({ ...prev, email: undefined }));
      }
    } catch (error) {
      logger.error("Email check failed", error);
      setFieldErrors((prev) => ({ ...prev, email: "이메일 확인 중 오류가 발생했습니다." }));
      setDuplicateChecked((prev) => ({ ...prev, email: false }));
    }
  };

  /**
   * 회원가입 폼 제출 처리.
   * 클라이언트 검증 통과 후 OAuth 여부에 따라 /auth/register 또는 /auth/signup API를 호출한다.
   * 일반 가입 성공 시 자동 로그인(authStore 업데이트)을 수행한다.
   */
  const handleSignup = async () => {
    setServerError(null);
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { apiPost } = await import("@/logic/shared/services/request");

      if (isOAuth && options?.oauthUser) {
        // OAuth 가입
        await apiPost("/auth/register", {
          email: formData.email,
          name: formData.name,
          userType: options.userType || "free",
          socialId: options.oauthUser.socialId,
          provider: options.oauthUser.provider,
          state: options.oauthUser.state,
        });
      } else {
        // 일반 가입
        const response = await apiPost<{ loginInfo: Record<string, unknown> }>(
          "/auth/signup",
          {
            username: formData.username,
            password: formData.password,
            name: formData.name,
            email: formData.email,
            userType: options?.userType || "free",
          },
        );

        // 가입 성공 시 자동 로그인 (쿠키 세션 기반)
        if (response?.loginInfo) {
          const { useAuthStore } = await import("@/logic/common/auth/authStore");
          useAuthStore.getState().setAuthenticated(response.loginInfo);
        }
      }

      options?.onSuccess?.();
    } catch (error: unknown) {
      logger.error("Signup failed", error);
      const msg = extractErrorMessage(error);
      setServerError(msg);
      options?.onError?.(msg);
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
    duplicateChecked,
    setField,
    setCheckbox,
    handleSignup,
    checkUsername,
    checkEmail,
    clearError,
  };
}
