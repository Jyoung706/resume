// ============================================
// 로그인 페이지 — orkis.kr/#/auth/login 디자인 재현
// Design Layer: props만 받아서 렌더링 (로직 없음)
// ============================================

import {
  AuthCard,
  Button,
  Divider,
  FlexBox,
  Form,
  Img,
  Input,
  Link,
  PasswordInput,
  Stack,
  Typography
} from "@/components";
import { useThemeModeContext } from "@/design-system";
import { SocialLoginButton, TermsNotice } from "./parts";
import "./LoginPage.scss";

// ============================================
// 소셜 로그인 프로바이더 설정
// ============================================
// Props 인터페이스
// ============================================
export interface LoginFieldErrors {
  username?: string;
  password?: string;
}

export interface LoginPageProps {
  formData: { username: string; password: string };
  loading?: boolean;
  serverError?: string | null;
  fieldErrors?: LoginFieldErrors;
  onFieldChange: (name: string, value: string) => void;
  onSubmit: () => void;
  onSocialLogin: (provider: string) => void;
  onForgotPassword: () => void;
  onSignup: () => void;
}

// ============================================
// LoginPage (Design Only — props 기반)
// ============================================
export function LoginPage({
  formData,
  loading,
  serverError,
  fieldErrors,
  onFieldChange,
  onSubmit,
  onSocialLogin,
  onForgotPassword,
  onSignup,
}: LoginPageProps) {
  
  const { resolvedMode } = useThemeModeContext();

  const socialProviders = [
    {
      provider: "naver",
      icon: "/assets/icons/login/naver-icon.png",
      label: "네이버 로그인",
    },
    {
      provider: "kakao",
      icon: resolvedMode === 'dark' ? '/assets/icons/login/kakao-icon-dark.png' : '/assets/icons/login/kakao-icon.png',
      label: "카카오 로그인",
    },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onFieldChange(name, value);
  };

  return (
    <Stack className="LoginPage__root">
      {/* ORKIS 로고 헤더 */}
      <FlexBox className="LoginPage__logo">
        <Img className="LoginPage__logo-symbol" src={resolvedMode === 'dark' ? '/assets/logo/orkis-symbol-dark.png' : '/assets/logo/orkis-symbol.png'} alt="ORKIS Symbol" />
        <Img className="LoginPage__logo-text" src={resolvedMode === 'dark' ? '/assets/logo/orkis-text-dark.svg' : '/assets/logo/orkis-text.svg'} alt="ORKIS" />
      </FlexBox>

      {/* 로그인 카드 */}
      <AuthCard className="LoginPage__card" title="로그인">
        <Stack className="LoginPage__card-content">
          {/* 서버 에러 메시지 */}
          {serverError && (
            <Typography variant="body2" color="error">
              {serverError}
            </Typography>
          )}

          {/* 로그인 폼 */}
          <Form className="LoginPage__form" onSubmit={onSubmit}>
            <Stack className="LoginPage__form-fields member__form-field">
              <Input
                label="아이디"
                name="username"
                placeholder="아이디를 입력하세요"
                value={formData.username}
                onChange={handleChange}
                autoComplete="username"
                fullWidth
                error={!!fieldErrors?.username}
                helperText={fieldErrors?.username}
              />

              <PasswordInput
                label="비밀번호"
                name="password"
                placeholder="비밀번호를 입력하세요"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                fullWidth
                error={!!fieldErrors?.password}
                helperText={fieldErrors?.password}
              />

              <Button
                className="LoginPage__submit-btn"
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                disabled={loading}
              >
                {loading ? "로그인 중..." : "로그인"}
              </Button>
            </Stack>
          </Form>

          {/* 구분선 */}
          <Divider className="LoginPage__divider" />

          {/* 소셜 로그인 */}
          <Stack className="LoginPage__social">
            {socialProviders.map(({ provider, icon, label }) => (
              <SocialLoginButton
                key={provider}
                icon={icon}
                iconAlt={provider}
                label={label}
                color="inherit"
                onClick={() => onSocialLogin(provider)}
              />
            ))}
          </Stack>

          {/* 비밀번호 찾기 & 회원가입 */}
          <Stack className="LoginPage__links">
            <Link
              className="LoginPage__link"
              href="#"
              underline="hover"
              color="text.secondary"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                onForgotPassword();
              }}
            >
              비밀번호를 잊으셨나요?
            </Link>

            <FlexBox className="LoginPage__signup-row">
              <Typography variant="body2" color="text.secondary">
                계정이 없으신가요?
              </Typography>
              <Link
                className="LoginPage__link--bold"
                href="#"
                underline="hover"
                color="text.secondary"
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  onSignup();
                }}
              >
                가입하기
              </Link>
            </FlexBox>
          </Stack>
        </Stack>
      </AuthCard>

      {/* 약관 동의 (카드 외부 하단) */}
      <TermsNotice />
    </Stack>
  );
}
