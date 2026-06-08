/**
 * LoginPage 디자인 미리보기 래퍼
 * /login 경로에서 기능 없이 디자인만 확인할 때 사용
 * 폼 입력이 동작하도록 최소한의 로컬 상태만 포함
 */
import { useState } from "react";
import { LoginPage } from "./LoginPage";

export function LoginPagePreview() {
  const [formData, setFormData] = useState({ username: "", password: "" });

  return (
    <LoginPage
      formData={formData}
      loading={false}
      serverError={null}
      onFieldChange={(name, value) =>
        setFormData((prev) => ({ ...prev, [name]: value }))
      }
      onSubmit={() => alert("로그인 (디자인 미리보기)")}
      onSocialLogin={(provider) =>
        alert(`${provider} 로그인 (디자인 미리보기)`)
      }
      onForgotPassword={() => alert("비밀번호 찾기 (디자인 미리보기)")}
      onSignup={() => alert("회원가입 (디자인 미리보기)")}
    />
  );
}
