/**
 * 비밀번호 재설정 로직 훅 — JSX/스타일 코드 없음
 * URL의 token 검증 → 새 비밀번호 입력 → /password-reset/reset API 호출
 */
import { useState, useEffect, useRef } from "react";
import { getLogger } from "@/logic/shared/utils/logger";

const logger = getLogger("useResetPassword");

// --- 타입 ---

export type ResetPasswordStatus = "validating" | "input" | "submitting" | "success" | "error" | "expired";

interface UseResetPasswordOptions {
  token: string | null;
  onSuccess?: () => void;
  onError?: (msg: string) => void;
}

interface UseResetPasswordReturn {
  status: ResetPasswordStatus;
  email: string;
  errorMessage: string;
  password: string;
  confirmPassword: string;
  passwordError: string;
  confirmPasswordError: string;
  setPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  submit: () => Promise<void>;
}

// --- 비밀번호 규칙 ---

const PASSWORD_RULES = {
  min: 8,
  pattern: /(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>])/,
} as const;

// --- 훅 ---

/**
 * 비밀번호 재설정 로직을 관리하는 훅.
 * 마운트 시 토큰 유효성을 검증하고, 통과 시 새 비밀번호 입력 → /password-reset/reset API를 호출한다.
 * 토큰 만료/무효 상태를 별도로 구분하여 UI에서 적절한 안내를 표시할 수 있게 한다.
 * @param options - 재설정 토큰 및 성공/실패 콜백
 */
export function useResetPassword(options: UseResetPasswordOptions): UseResetPasswordReturn {
  const { token } = options;

  const [status, setStatus] = useState<ResetPasswordStatus>("validating");
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [password, setPasswordState] = useState("");
  const [confirmPassword, setConfirmPasswordState] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const calledRef = useRef(false);

  // --- 토큰 검증 ---

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    if (!token) {
      setStatus("error");
      setErrorMessage("유효하지 않은 링크입니다. 토큰이 없습니다.");
      return;
    }

    validateToken(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 비밀번호 재설정 토큰의 유효성을 서버에 확인한다.
   * /password-reset/validate API를 호출하여 유효하면 이메일을 표시하고,
   * 만료/무효 시 적절한 에러 상태로 전환한다.
   */
  async function validateToken(t: string) {
    try {
      const { apiPost } = await import("@/logic/shared/services/request");
      const response = await apiPost<{ tokenValid: boolean; email?: string }>("/password-reset/validate", { token: t });

      if (response?.tokenValid) {
        setEmail(response.email || "");
        setStatus("input");
      } else {
        setStatus("error");
        setErrorMessage("유효하지 않은 토큰입니다.");
      }
    } catch (err: unknown) {
      logger.error("토큰 검증 실패:", err);
      const obj = err as Record<string, unknown>;
      const inner = obj?.error as Record<string, unknown> | undefined;
      const code = (inner?.code || obj?.code) as string | undefined;

      if (code === "TOKEN_EXPIRED") {
        setStatus("expired");
        setErrorMessage("비밀번호 재설정 링크가 만료되었습니다. 새로운 링크를 요청해주세요.");
      } else {
        setStatus("error");
        setErrorMessage((inner?.message as string) || (obj?.message as string) || "유효하지 않은 링크입니다.");
      }
    }
  }

  /**
   * 비밀번호 유효성 검증.
   * 필수값, 최소 길이(8자), 대소문자+특수문자 포함 여부를 체크한다.
   * @returns 유효하면 true
   */
  const validatePassword = (value: string): boolean => {
    if (!value) {
      setPasswordError("비밀번호를 입력해주세요");
      return false;
    }
    if (value.length < PASSWORD_RULES.min) {
      setPasswordError(`비밀번호는 ${PASSWORD_RULES.min}글자 이상이어야 합니다`);
      return false;
    }
    if (!PASSWORD_RULES.pattern.test(value)) {
      setPasswordError("비밀번호는 대소문자와 특수문자를 포함해야 합니다");
      return false;
    }
    setPasswordError("");
    return true;
  };

  /**
   * 비밀번호 확인 필드 검증.
   * 빈 값 체크 및 비밀번호 일치 여부를 확인한다.
   * @returns 유효하면 true
   */
  const validateConfirm = (value: string): boolean => {
    if (!value) {
      setConfirmPasswordError("비밀번호 확인을 입력해주세요");
      return false;
    }
    if (value !== password) {
      setConfirmPasswordError("비밀번호가 일치하지 않습니다");
      return false;
    }
    setConfirmPasswordError("");
    return true;
  };

  /**
   * 비밀번호 입력 핸들러.
   * 실시간 유효성 검증을 수행하고, 확인 필드가 입력된 경우 일치 여부도 재검증한다.
   */
  const setPassword = (value: string) => {
    setPasswordState(value);
    if (value) validatePassword(value);
    else setPasswordError("");
    // 확인 필드 재검증
    if (confirmPassword) {
      if (value !== confirmPassword) setConfirmPasswordError("비밀번호가 일치하지 않습니다");
      else setConfirmPasswordError("");
    }
  };

  /**
   * 비밀번호 확인 입력 핸들러.
   * 실시간 유효성 검증(비밀번호 일치 여부)을 수행한다.
   */
  const setConfirmPassword = (value: string) => {
    setConfirmPasswordState(value);
    if (value) validateConfirm(value);
    else setConfirmPasswordError("");
  };

  /**
   * 새 비밀번호 제출 처리.
   * 비밀번호/확인 검증 통과 후 /password-reset/reset API를 호출하여 비밀번호를 변경한다.
   * 토큰 만료 시 expired 상태로, 기타 에러 시 input 상태로 복귀한다.
   */
  const submit = async () => {
    const isPasswordValid = validatePassword(password);
    const isConfirmValid = validateConfirm(confirmPassword);
    if (!isPasswordValid || !isConfirmValid || !token) return;

    setStatus("submitting");
    setErrorMessage("");

    try {
      const { apiPost } = await import("@/logic/shared/services/request");
      await apiPost("/password-reset/reset", { token, newPassword: password, confirmPassword });
      setStatus("success");
      options.onSuccess?.();
    } catch (err: unknown) {
      logger.error("비밀번호 재설정 실패:", err);
      const obj = err as Record<string, unknown>;
      const inner = obj?.error as Record<string, unknown> | undefined;
      const code = (inner?.code || obj?.code) as string | undefined;

      if (code === "TOKEN_EXPIRED") {
        setStatus("expired");
        setErrorMessage("비밀번호 재설정 링크가 만료되었습니다.");
      } else {
        setStatus("input");
        setErrorMessage((inner?.message as string) || (obj?.message as string) || "비밀번호 재설정에 실패했습니다.");
      }
    }
  };

  return {
    status,
    email,
    errorMessage,
    password,
    confirmPassword,
    passwordError,
    confirmPasswordError,
    setPassword,
    setConfirmPassword,
    submit,
  };
}
