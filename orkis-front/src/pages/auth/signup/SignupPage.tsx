// ============================================
// 회원가입 페이지 — props 기반 Design 컴포넌트
// Design Layer: props만 받아서 렌더링 (로직 없음)
// ============================================

import {
  Alert,
  AuthCard,
  Button,
  Checkbox,
  Divider,
  FlexBox,
  Form,
  FormControlLabel,
  FormField,
  Input,
  Link,
  PasswordInput,
  Stack
} from "@/components";
import { SignupHeader } from "./parts";
import "./SignupPage.scss";

// ============================================
// 타입 (Design Layer 자체 선언 — @/logic 의존 없음)
// ============================================
export interface SignupFieldErrors {
  username?: string;
  name?: string;
  password?: string;
  confirmPassword?: string;
  email?: string;
}

export interface OAuthUser {
  email: string;
  name: string;
  provider: string;
  socialId: string;
  state: string;
}

// ============================================
// Props 인터페이스
// ============================================
export interface SignupPageProps {
  formData: {
    username: string;
    name: string;
    password: string;
    confirmPassword: string;
    email: string;
    useIdAsName: boolean;
  };
  loading?: boolean;
  fieldErrors?: SignupFieldErrors;
  serverError?: string | null;
  duplicateChecked?: { username: boolean; email: boolean };
  userType?: string;
  oauthUser?: OAuthUser | null;
  onFieldChange: (name: string, value: string) => void;
  onCheckboxChange: (name: string, checked: boolean) => void;
  onSubmit: () => void;
  onCheckUsername: () => void;
  onCheckEmail: () => void;
  onNavigateHome: () => void;
  onNavigateLogin?: () => void;
}

// ============================================
// SignupPage (Design Only — props 기반)
// ============================================
export function SignupPage({
  formData,
  loading,
  fieldErrors,
  serverError,
  duplicateChecked,
  userType = "free",
  oauthUser,
  onFieldChange,
  onCheckboxChange,
  onSubmit,
  onCheckUsername,
  onCheckEmail,
  onNavigateHome,
  onNavigateLogin
}: SignupPageProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFieldChange(e.target.name, e.target.value);
  };

  const isOAuth = !!oauthUser;

  return (
    <Stack className="SignupPage__root">
      {/* 헤더: 로고 */}
      <SignupHeader userType={userType} oauthUser={oauthUser} logoOnly />

      {/* 메인 카드 */}
      <AuthCard className="SignupPage__card">
        {/* 타이틀 + Chip + sub text */}
        <SignupHeader
          userType={userType}
          oauthUser={oauthUser}
          titleOnly
        />

        <Form onSubmit={onSubmit}>
          <Stack className="SignupPage__form-content member__form-field">
            {/* 제출 에러 알림 */}
            {serverError && (
              <Alert
                className="SignupPage__error-alert"
                severity="error"
                rounded="sm"
              >
                {serverError}
                {isOAuth && onNavigateLogin && (
                  <Link
                    component="button"
                    underline="hover"
                    color="inherit"
                    onClick={onNavigateLogin}
                    className="SignupPage__error-login-link"
                  >
                    로그인으로 돌아가기
                  </Link>
                )}
              </Alert>
            )}

            {/* ==============================
                필수 입력 폼 (Divider 위)
            ============================== */}
            <Stack className="SignupPage__required">
              {/* 아이디 필드 (OAuth 시 숨김) */}
              {!isOAuth && (
                <FormField
                  label="아이디"
                  required
                  error={fieldErrors?.username}
                >
                  <FlexBox className="SignupPage__field-with-btn">
                    <Input
                      name="username"
                      placeholder="아이디 (6글자 이상 20글자 내외)"
                      value={formData.username}
                      onChange={handleChange}
                      fullWidth
                      grow
                      error={!!fieldErrors?.username}
                    />
                    <Button
                      variant="outlined"
                      color={duplicateChecked?.username ? "success" : "inherit"}
                      className="SignupPage__check-btn"
                      onClick={onCheckUsername}
                    >
                      {duplicateChecked?.username ? "확인완료" : "중복확인"}
                    </Button>
                  </FlexBox>
                </FormField>
              )}

              {/* 이름에 아이디 사용하기 (OAuth 시 숨김) */}
              {!isOAuth && (
                <FormField label="">
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.useIdAsName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          onCheckboxChange("useIdAsName", e.target.checked)
                        }
                      />
                    }
                    label="이름에 아이디 사용하기"
                    slotProps={{
                      typography: {
                        fontSize: "var(--text-xs)",
                        color: "var(--text-faint)"
                      }
                    }}
                  />
                </FormField>
              )}

              {/* 이름(닉네임) 필드 */}
              <FormField
                label="이름(닉네임)"
                required
                error={fieldErrors?.name}
              >
                <Input
                  name="name"
                  placeholder="닉네임 (문자/숫자/띄워쓰기 가능)"
                  value={formData.name}
                  onChange={handleChange}
                  readOnly={formData.useIdAsName}
                  fullWidth
                  error={!!fieldErrors?.name}
                />
              </FormField>

              {/* 비밀번호 필드 (OAuth 시 숨김) */}
              {!isOAuth && (
                <FormField
                  label="비밀번호"
                  required
                  error={fieldErrors?.password}
                >
                  <PasswordInput
                    name="password"
                    placeholder="비밀번호 (8글자 이상 특수문자/대소문자 포함)"
                    value={formData.password}
                    onChange={handleChange}
                    fullWidth
                    error={!!fieldErrors?.password}
                  />
                </FormField>
              )}

              {/* 비밀번호 확인 필드 (OAuth 시 숨김) */}
              {!isOAuth && (
                <FormField
                  label="비밀번호 확인"
                  required
                  error={fieldErrors?.confirmPassword}
                >
                  <PasswordInput
                    name="confirmPassword"
                    placeholder="비밀번호 한번 더 입력"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    fullWidth
                    error={!!fieldErrors?.confirmPassword}
                  />
                </FormField>
              )}
            </Stack>

            {/* 구분선 */}
            <Divider />

            {/* ==============================
                추가 입력 폼 (Divider 아래)
            ============================== */}
            <Stack className="SignupPage__additional">
              {/* 이메일 필드 */}
              <FormField label="이메일" required error={fieldErrors?.email}>
                <FlexBox className="SignupPage__field-with-btn">
                  <Input
                    name="email"
                    type="email"
                    placeholder="이메일 (형식에 맞는 이메일 입력)"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isOAuth}
                    fullWidth
                    grow
                    error={!!fieldErrors?.email}
                  />
                  {!isOAuth && (
                    <Button
                      variant="outlined"
                      color={duplicateChecked?.email ? "success" : "inherit"}
                      className="SignupPage__check-btn"
                      onClick={onCheckEmail}
                    >
                      {duplicateChecked?.email ? "확인완료" : "중복확인"}
                    </Button>
                  )}
                </FlexBox>
              </FormField>
            </Stack>

            {/* 가입하기 버튼 */}
            <FlexBox className="SignupPage__submit">
              <Button
                className="SignupPage__submit-btn"
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading}
              >
                {loading ? "가입 중..." : "가입하기"}
              </Button>
            </FlexBox>
          </Stack>
        </Form>

        {/* 하단 링크 */}
        <FlexBox className="SignupPage__home-link">
          <Link
            className="SignupPage__home-link-text"
            component="button"
            underline="hover"
            color="var(--text-color)"
            onClick={onNavigateHome}
          >
            첫화면으로 돌아가기
          </Link>
        </FlexBox>
      </AuthCard>
    </Stack>
  );
}
