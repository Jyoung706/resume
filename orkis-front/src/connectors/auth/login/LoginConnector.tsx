/**
 * LoginConnector — Logic ↔ Design 접착 계층
 * useLogin 훅의 상태/액션을 LoginPage props로 매핑
 * 스타일 코드 없음, 비즈니스 로직 없음
 */
import { useNavigate } from "react-router-dom";
import { useLogin } from "@/logic/auth/login/useLogin";
import { LoginPage } from "@/pages/auth/login";

export function LoginConnector() {
  const navigate = useNavigate();

  const {
    formData,
    loading,
    serverError,
    fieldErrors,
    setField,
    handleLogin,
    handleSocialLogin,
  } = useLogin({
    onSuccess: () => navigate("/chat"),
  });

  return (
    <LoginPage
      formData={formData}
      loading={loading}
      serverError={serverError}
      fieldErrors={fieldErrors}
      onFieldChange={setField}
      onSubmit={handleLogin}
      onSocialLogin={handleSocialLogin}
      onForgotPassword={() => navigate("/auth/forgot-password")}
      onSignup={() => navigate("/auth/user-type")}
    />
  );
}
