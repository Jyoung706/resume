/**
 * ForgotPasswordPage 디자인 미리보기 래퍼
 */
import { useState } from "react";
import { ForgotPasswordPage, type ForgotPasswordStatus } from "./ForgotPasswordPage";

export function ForgotPasswordPagePreview() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<ForgotPasswordStatus>("input");

  return (
    <ForgotPasswordPage
      email={email}
      status={status}
      error={null}
      emailError=""
      onEmailChange={setEmail}
      onSubmit={() => {
        setStatus("sent");
        setTimeout(() => setStatus("input"), 3000);
      }}
      onBackToLogin={() => alert("로그인으로 (디자인 미리보기)")}
    />
  );
}
