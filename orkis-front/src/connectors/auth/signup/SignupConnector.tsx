/**
 * SignupConnector — Logic ↔ Design 접착 계층
 * useSignup 훅의 상태/액션을 SignupPage props로 매핑
 * 스타일 코드 없음, 비즈니스 로직 없음
 */
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useSignup } from "@/logic/auth/signup/useSignup";
import { SignupPage } from "@/pages/auth/signup";

export function SignupConnector() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // userType이 URL param에도 sessionStorage에도 없으면 유형 선택 페이지로 redirect
  const hasUserType = searchParams.has("userType") || sessionStorage.getItem("selectedUserType") !== null;
  if (!hasUserType) {
    return <Navigate to="/auth/user-type" replace />;
  }

  // sessionStorage에서 OAuth 사용자 정보 복원
  const oauthUserRaw = sessionStorage.getItem("oauth_new_user");
  const oauthUser = oauthUserRaw ? JSON.parse(oauthUserRaw) : null;

  const userType = searchParams.get("userType") || sessionStorage.getItem("selectedUserType") || "free";

  const {
    formData,
    loading,
    serverError,
    fieldErrors,
    duplicateChecked,
    setField,
    setCheckbox,
    handleSignup,
    checkUsername,
    checkEmail,
  } = useSignup({
    userType,
    oauthUser,
    onSuccess: () => {
      // OAuth 임시 데이터 정리
      sessionStorage.removeItem("oauth_new_user");
      sessionStorage.removeItem("selectedUserType");
      navigate("/chat");
    },
    onError: () => {
      // OAuth 가입 실패 시 stale 데이터 정리 (토큰 1회성이므로 재사용 불가)
      if (oauthUser) {
        sessionStorage.removeItem("oauth_new_user");
      }
    },
  });

  return (
    <SignupPage
      formData={formData}
      loading={loading}
      serverError={serverError}
      fieldErrors={fieldErrors}
      duplicateChecked={duplicateChecked}
      userType={userType}
      oauthUser={oauthUser}
      onFieldChange={setField}
      onCheckboxChange={setCheckbox}
      onSubmit={handleSignup}
      onCheckUsername={checkUsername}
      onCheckEmail={checkEmail}
      onNavigateHome={() => navigate("/")}
      onNavigateLogin={() => navigate("/auth/login")}
    />
  );
}
