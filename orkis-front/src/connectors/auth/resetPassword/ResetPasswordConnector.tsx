/**
 * ResetPasswordConnector — Logic ↔ Design 접착 계층
 * useResetPassword 훅의 상태/액션을 ResetPasswordPage props로 매핑
 * 스타일 코드 없음, 비즈니스 로직 없음
 */
import { useNavigate, useSearchParams } from "react-router-dom";
import { useResetPassword } from "@/logic/auth/resetPassword/useResetPassword";
import { ResetPasswordPage } from "@/pages/auth/resetPassword";

export function ResetPasswordConnector() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const {
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
  } = useResetPassword({
    token,
    onSuccess: () => {},
  });

  return (
    <ResetPasswordPage
      status={status}
      email={email}
      errorMessage={errorMessage}
      password={password}
      confirmPassword={confirmPassword}
      passwordError={passwordError}
      confirmPasswordError={confirmPasswordError}
      onPasswordChange={setPassword}
      onConfirmPasswordChange={setConfirmPassword}
      onSubmit={submit}
      onGoToLogin={() => navigate("/auth/login")}
      onGoToForgotPassword={() => navigate("/auth/forgot-password")}
    />
  );
}
