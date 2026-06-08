/**
 * EmailVerificationConnector — Logic ↔ Design 접착 계층
 * useEmailVerification 훅의 상태를 EmailVerificationPage props로 매핑
 * 스타일 코드 없음, 비즈니스 로직 없음
 */
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEmailVerification } from "@/logic/auth/emailVerification/useEmailVerification";
import { EmailVerificationPage } from "@/pages/auth/emailVerification";

export function EmailVerificationConnector() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const { status, message, email, isAuthenticated } = useEmailVerification({
    token,
  });

  const handleContinue = () => {
    if (isAuthenticated) {
      navigate("/chat");
    } else {
      navigate("/auth/login");
    }
  };

  const handleResendEmail = () => {
    if (isAuthenticated) {
      navigate("/chat");
    } else {
      navigate("/auth/login", { state: { showResendVerification: true } });
    }
  };

  return (
    <EmailVerificationPage
      status={status}
      message={message}
      email={email}
      isAuthenticated={isAuthenticated}
      onContinue={handleContinue}
      onResendEmail={handleResendEmail}
    />
  );
}
