/**
 * ResetPasswordPage 디자인 미리보기 래퍼
 */
import { useState } from "react";
import { ResetPasswordPage } from "./ResetPasswordPage";

export function ResetPasswordPagePreview() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  return (
    <ResetPasswordPage
      status="input"
      email="user@example.com"
      errorMessage=""
      password={password}
      confirmPassword={confirmPassword}
      passwordError=""
      confirmPasswordError=""
      onPasswordChange={setPassword}
      onConfirmPasswordChange={setConfirmPassword}
      onSubmit={() => alert("비밀번호 변경 (디자인 미리보기)")}
      onGoToLogin={() => alert("로그인으로 (디자인 미리보기)")}
      onGoToForgotPassword={() => alert("비밀번호 찾기로 (디자인 미리보기)")}
    />
  );
}
