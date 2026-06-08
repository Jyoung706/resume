/**
 * EmailVerificationPage 디자인 미리보기 래퍼
 */
import { EmailVerificationPage } from "./EmailVerificationPage";

export function EmailVerificationPagePreview() {
  return (
    <EmailVerificationPage
      status="success"
      message="이메일 인증이 완료되었습니다."
      email="user@example.com"
      isAuthenticated={false}
      onContinue={() => alert("계속하기 (디자인 미리보기)")}
      onResendEmail={() => alert("재발송 (디자인 미리보기)")}
    />
  );
}
