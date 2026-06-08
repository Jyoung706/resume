/**
 * SignupPage 디자인 미리보기 래퍼
 * /signup 경로에서 기능 없이 디자인만 확인할 때 사용
 * 폼 입력이 동작하도록 최소한의 로컬 상태만 포함
 */
import { useState } from "react";
import { SignupPage } from "./SignupPage";

export function SignupPagePreview() {
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    password: "",
    confirmPassword: "",
    email: "",
    useIdAsName: false,
  });

  return (
    <SignupPage
      formData={formData}
      loading={false}
      serverError={null}
      fieldErrors={{}}
      duplicateChecked={{ username: false, email: false }}
      userType="free"
      onFieldChange={(name, value) =>
        setFormData((prev) => {
          const next = { ...prev, [name]: value };
          if (name === "username" && prev.useIdAsName) {
            next.name = value;
          }
          return next;
        })
      }
      onCheckboxChange={(name, checked) => {
        if (name === "useIdAsName") {
          setFormData((prev) => ({
            ...prev,
            useIdAsName: checked,
            name: checked ? prev.username : prev.name,
          }));
        }
      }}
      onSubmit={() => alert("가입하기 (디자인 미리보기)")}
      onCheckUsername={() => alert("아이디 중복확인 (디자인 미리보기)")}
      onCheckEmail={() => alert("이메일 중복확인 (디자인 미리보기)")}
      onNavigateHome={() => alert("첫화면으로 (디자인 미리보기)")}
    />
  );
}
