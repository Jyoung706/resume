/**
 * 비밀번호 찾기 로직 훅 — JSX/스타일 코드 없음
 * 이메일 입력 → /password-reset/request API 호출
 */
import { useState } from "react";
import { getLogger } from "@/logic/shared/utils/logger";

const logger = getLogger("useForgotPassword");

// --- 타입 ---

export type ForgotPasswordStatus = "input" | "sending" | "sent" | "error";

export interface ForgotPasswordError {
  code?: string;
  message: string;
  provider?: string;
}

interface UseForgotPasswordOptions {
  onSuccess?: () => void;
  onError?: (error: ForgotPasswordError) => void;
}

interface UseForgotPasswordReturn {
  email: string;
  status: ForgotPasswordStatus;
  error: ForgotPasswordError | null;
  emailError: string;
  setEmail: (value: string) => void;
  submit: () => Promise<void>;
  clearError: () => void;
}

// --- 유효성 검사 ---

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 서버 에러 객체에서 사용자 친화적 에러 정보를 추출한다.
 * SOCIAL_LOGIN_ACCOUNT, EMAIL_NOT_VERIFIED, USER_NOT_FOUND 등
 * 에러 코드별로 적절한 메시지와 코드를 반환한다.
 */
function extractError(err: unknown): ForgotPasswordError {
  const obj = err as Record<string, unknown>;

  if (obj?.code === "SOCIAL_LOGIN_ACCOUNT") {
    return {
      code: "SOCIAL_LOGIN_ACCOUNT",
      message: (obj.message as string) || "소셜 로그인 계정은 비밀번호를 재설정할 수 없습니다.",
      provider: obj.provider as string | undefined,
    };
  }

  if (obj?.code === "EMAIL_NOT_VERIFIED") {
    return {
      code: "EMAIL_NOT_VERIFIED",
      message: (obj.message as string) || "이메일 인증이 완료되지 않아 비밀번호 재설정 메일을 발송할 수 없습니다.",
    };
  }

  const inner = obj?.error as Record<string, unknown> | undefined;
  if (inner?.code === "USER_NOT_FOUND") {
    return {
      code: "USER_NOT_FOUND",
      message: "등록되지 않은 이메일 주소입니다.",
    };
  }

  return {
    message: (inner?.message as string) || (obj?.message as string) || "비밀번호 재설정 요청 중 오류가 발생했습니다.",
  };
}

// --- 훅 ---

/**
 * 비밀번호 찾기(재설정 요청) 로직을 관리하는 훅.
 * 이메일 입력·유효성 검증 후 /password-reset/request API를 호출하여
 * 비밀번호 재설정 메일 발송을 요청한다.
 * @param options - 성공/실패 시 호출할 콜백
 */
export function useForgotPassword(options?: UseForgotPasswordOptions): UseForgotPasswordReturn {
  const [email, setEmailState] = useState("");
  const [status, setStatus] = useState<ForgotPasswordStatus>("input");
  const [error, setError] = useState<ForgotPasswordError | null>(null);
  const [emailError, setEmailError] = useState("");

  /**
   * 이메일 유효성 검증. 빈 값 및 형식 체크 후 emailError 상태를 업데이트한다.
   * @returns 유효하면 true
   */
  const validateEmail = (value: string): boolean => {
    if (!value) {
      setEmailError("이메일을 입력해주세요");
      return false;
    }
    if (!EMAIL_PATTERN.test(value)) {
      setEmailError("올바른 이메일 형식이 아닙니다");
      return false;
    }
    setEmailError("");
    return true;
  };

  /**
   * 이메일 입력 핸들러. 값 변경 시 실시간 유효성 검증을 수행하고,
   * 기존 에러 상태가 있으면 자동으로 초기화한다.
   */
  const setEmail = (value: string) => {
    setEmailState(value);
    if (value) {
      validateEmail(value);
    } else {
      setEmailError("");
    }
    if (error) {
      setError(null);
      setStatus("input");
    }
  };

  /**
   * 비밀번호 재설정 요청 제출.
   * 이메일 유효성 검증 후 /password-reset/request API를 호출하고
   * 성공 시 status를 "sent"로 변경한다.
   */
  const submit = async () => {
    if (!validateEmail(email)) return;

    setStatus("sending");
    setError(null);

    try {
      const { apiPost } = await import("@/logic/shared/services/request");
      await apiPost("/password-reset/request", { email });
      setStatus("sent");
      options?.onSuccess?.();
    } catch (err: unknown) {
      logger.error("재설정 요청 실패:", err);
      const parsedError = extractError(err);
      setError(parsedError);
      setStatus("error");
      options?.onError?.(parsedError);
    }
  };

  /**
   * 에러 상태 및 이메일 에러를 모두 초기화하고 상태를 "input"으로 되돌린다.
   */
  const clearError = () => {
    setError(null);
    setEmailError("");
    setStatus("input");
  };

  return {
    email,
    status,
    error,
    emailError,
    setEmail,
    submit,
    clearError,
  };
}
