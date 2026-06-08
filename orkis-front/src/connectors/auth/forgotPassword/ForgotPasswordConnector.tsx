/**
 * ForgotPasswordConnector — Logic ↔ Design 접착 계층
 * useForgotPassword 훅의 상태/액션을 ForgotPasswordPage props로 매핑
 * 스타일 코드 없음, 비즈니스 로직 없음
 */
import { useNavigate } from "react-router-dom";
import { useForgotPassword } from "@/logic/auth/forgotPassword/useForgotPassword";
import { ForgotPasswordPage } from "@/pages/auth/forgotPassword";

export function ForgotPasswordConnector() {
  const navigate = useNavigate();

  const {
    email,
    status,
    error,
    emailError,
    setEmail,
    submit,
  } = useForgotPassword();

  return (
    <ForgotPasswordPage
      email={email}
      status={status}
      error={error}
      emailError={emailError}
      onEmailChange={setEmail}
      onSubmit={submit}
      onBackToLogin={() => navigate("/auth/login")}
    />
  );
}
