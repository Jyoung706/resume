// ============================================
// 비밀번호 찾기 페이지 — props 기반 Design 컴포넌트
// Design Layer: props만 받아서 렌더링 (로직 없음)
// ============================================

import {
  Alert,
  AuthCard,
  Button,
  FlexBox,
  Form,
  Img,
  Input,
  Link,
  Stack,
  Typography
} from "@/components";
import { useThemeModeContext } from "@/design-system";
import "./ForgotPasswordPage.scss";

// ============================================
// 타입
// ============================================
export type ForgotPasswordStatus = "input" | "sending" | "sent" | "error";

export interface ForgotPasswordError {
  code?: string;
  message: string;
  provider?: string;
}

// ============================================
// Props 인터페이스
// ============================================
export interface ForgotPasswordPageProps {
  email: string;
  status: ForgotPasswordStatus;
  error?: ForgotPasswordError | null;
  emailError?: string;
  onEmailChange: (value: string) => void;
  onSubmit: () => void;
  onBackToLogin: () => void;
}

// ============================================
// ForgotPasswordPage (Design Only — props 기반)
// ============================================
export function ForgotPasswordPage({
  email,
  status,
  error,
  emailError,
  onEmailChange,
  onSubmit,
  onBackToLogin,
}: ForgotPasswordPageProps) {

  const { resolvedMode } = useThemeModeContext();

  // 성공 화면
  if (status === "sent") {
    return (
      <Stack className="ForgotPwPage__root">
        {/* ORKIS 로고 헤더 */}
        <FlexBox className="ForgotPwPage__logo">
          <Img className="ForgotPwPage__logo-symbol" src={resolvedMode === 'dark' ? '/assets/logo/orkis-symbol-dark.png' : '/assets/logo/orkis-symbol.png'} alt="ORKIS Symbol" />
          <Img className="ForgotPwPage__logo-text" src={resolvedMode === 'dark' ? '/assets/logo/orkis-text-dark.svg' : '/assets/logo/orkis-text.svg'} alt="ORKIS" />
        </FlexBox>

        <AuthCard
          className="ForgotPwPage__card"
          title="메일 발송 완료"
          subtitle="비밀번호 재설정 링크가 이메일로 발송되었습니다."
        >
          <Stack className="ForgotPwPage__sent-content member__form-field">
            <Typography className="ForgotPwPage__sent-email" variant="body1" color="primary">
              {email}
            </Typography>
            <Typography className="ForgotPwPage__subtitle" variant="body2" color="text.secondary">
              메일이 도착하지 않았다면 스팸 메일함을 확인해주세요.
              <br />
              링크는 1시간 동안만 유효합니다.
            </Typography>
            <Button className="ForgotPwPage__submit-btn" variant="contained" onClick={onBackToLogin} fullWidth size="large">
              로그인으로 돌아가기
            </Button>
          </Stack>
        </AuthCard>
      </Stack>
    );
  }

  // 입력/에러 화면
  return (
    <Stack className="ForgotPwPage__root ok-forgot-password-page">
      {/* ORKIS 로고 헤더 */}
      <FlexBox className="ForgotPwPage__logo">
        <Img className="ForgotPwPage__logo-symbol" src={resolvedMode === 'dark' ? '/assets/logo/orkis-symbol-dark.png' : '/assets/logo/orkis-symbol.png'} alt="ORKIS Symbol" />
        <Img className="ForgotPwPage__logo-text" src={resolvedMode === 'dark' ? '/assets/logo/orkis-text-dark.svg' : '/assets/logo/orkis-text.svg'} alt="ORKIS" />
      </FlexBox>

      <AuthCard
        className="ForgotPwPage__card"
        title="비밀번호 찾기"
        subtitle={
          <>
            가입하신 이메일 주소를 입력해주세요.
            <br />
            비밀번호 재설정 링크를 보내드립니다.
          </>
        }
      >
        <Form onSubmit={onSubmit}>
          <Stack className="ForgotPwPage__form-content member__form-field">
            {/* 소셜 로그인 / 이메일 미인증 경고 */}
            {error && (error.code === "SOCIAL_LOGIN_ACCOUNT" || error.code === "EMAIL_NOT_VERIFIED") && (
              <Alert className="ForgotPwPage__alert" severity="warning" rounded="sm">
                {error.message}
              </Alert>
            )}

            {/* 일반 에러 */}
            {error && error.code !== "SOCIAL_LOGIN_ACCOUNT" && error.code !== "EMAIL_NOT_VERIFIED" && (
              <Alert className="ForgotPwPage__alert" severity="error" rounded="sm">
                {error.message}
              </Alert>
            )}

            {/* 이메일 입력 필드 */}
            <Input
              label="이메일"
              type="email"
              placeholder="이메일 주소를 입력하세요"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onEmailChange(e.target.value)}
              disabled={status === "sending"}
              fullWidth
              error={!!emailError}
              helperText={emailError}
            />

            {/* 제출 버튼 */}
            <Button
              className="ForgotPwPage__submit-btn"
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              disabled={status === "sending" || !email || !!emailError}
            >
              {status === "sending" ? "발송 중..." : "재설정 링크 받기"}
            </Button>

            {/* 로그인으로 돌아가기 */}
            <Stack className="ForgotPwPage__back-link">
              <Link
                className="ForgotPwPage__link"
                href="#"
                underline="hover"
                color="text.secondary"
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  onBackToLogin();
                }}
              >
                로그인으로 돌아가기
              </Link>
            </Stack>
          </Stack>
        </Form>
      </AuthCard>
    </Stack>
  );
}
