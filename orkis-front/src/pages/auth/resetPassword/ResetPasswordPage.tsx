// ============================================
// 비밀번호 재설정 페이지 — props 기반 Design 컴포넌트
// Design Layer: props만 받아서 렌더링 (로직 없음)
// ============================================

import {
  Alert,
  AuthCard,
  Button,
  CheckCircleOutlineIcon,
  CircularProgress,
  ErrorOutlineIcon,
  FlexBox,
  Form,
  Img,
  Link,
  Paper,
  PasswordInput,
  Stack,
  Typography
} from "@/components";
import { useThemeModeContext } from "@/design-system";
import "./ResetPasswordPage.scss";

// ============================================
// 타입
// ============================================
export type ResetPasswordStatus = "validating" | "input" | "submitting" | "success" | "error" | "expired";

// ============================================
// Props 인터페이스
// ============================================
export interface ResetPasswordPageProps {
  status: ResetPasswordStatus;
  email?: string;
  errorMessage?: string;
  password: string;
  confirmPassword: string;
  passwordError?: string;
  confirmPasswordError?: string;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onGoToLogin: () => void;
  onGoToForgotPassword: () => void;
}

// ============================================
// 공통 로고 헤더
// ============================================
function LogoHeader() {
  
  const { resolvedMode } = useThemeModeContext();

  return (
    <FlexBox className="ResetPwPage__logo">
      <Img className="ResetPwPage__logo-symbol" src={resolvedMode === 'dark' ? '/assets/logo/orkis-symbol-dark.png' : '/assets/logo/orkis-symbol.png'} alt="ORKIS Symbol" />
      <Img className="ResetPwPage__logo-text" src={resolvedMode === 'dark' ? '/assets/logo/orkis-text-dark.svg' : '/assets/logo/orkis-text.svg'} alt="ORKIS" />
    </FlexBox>
  );
}

// ============================================
// ResetPasswordPage (Design Only — props 기반)
// ============================================
export function ResetPasswordPage({
  status,
  email,
  errorMessage,
  password,
  confirmPassword,
  passwordError,
  confirmPasswordError,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  onGoToLogin,
  onGoToForgotPassword,
}: ResetPasswordPageProps) {

  // 로딩 화면 (토큰 검증 중)
  if (status === "validating") {
    return (
      <Stack className="ResetPwPage__root">
        <LogoHeader />
        <Paper className="ResetPwPage__card">
          <FlexBox className="ResetPwPage__loading" direction="column" align="center" justify="center">
            <CircularProgress size="xlarge" />
            <Typography className="ResetPwPage__loading-text" variant="body2" color="text.secondary">
              링크 확인 중...
            </Typography>
          </FlexBox>
        </Paper>
      </Stack>
    );
  }

  // 성공 화면
  if (status === "success") {
    return (
      <Stack className="ResetPwPage__root">
        <LogoHeader />
        <AuthCard
          className="ResetPwPage__card"
          leadingIcon={<CheckCircleOutlineIcon className="ResetPwPage__status-icon ResetPwPage__status-icon--success" />}
          title="비밀번호 변경 완료"
          subtitle={
            <>
              비밀번호가 성공적으로 변경되었습니다.
              <br />
              새 비밀번호로 로그인해주세요.
            </>
          }
        >
          <Stack className="ResetPwPage__content">
            <Button className="ResetPwPage__submit-btn" variant="contained" onClick={onGoToLogin} fullWidth size="large">
              로그인하기
            </Button>
          </Stack>
        </AuthCard>
      </Stack>
    );
  }

  // 에러/만료 화면
  if (status === "error" || status === "expired") {
    return (
      <Stack className="ResetPwPage__root">
        <LogoHeader />
        <AuthCard
          className="ResetPwPage__card"
          leadingIcon={<ErrorOutlineIcon className="ResetPwPage__status-icon ResetPwPage__status-icon--error" />}
          title={status === "expired" ? "링크 만료" : "오류 발생"}
          subtitle={errorMessage}
        >
          <Stack className="ResetPwPage__content">
            <Stack className="ResetPwPage__btn-group">
              {status === "expired" && (
                <Button variant="outlined" onClick={onGoToForgotPassword} fullWidth size="large">
                  새 링크 요청
                </Button>
              )}
              <Button variant="contained" onClick={onGoToLogin} fullWidth size="large">
                로그인으로 이동
              </Button>
            </Stack>
          </Stack>
        </AuthCard>
      </Stack>
    );
  }

  // 비밀번호 입력 화면
  return (
    <Stack className="ResetPwPage__root ok-reset-password-page">
      <LogoHeader />
      <AuthCard
        className="ResetPwPage__card"
        title="새 비밀번호 설정"
        subtitle="8자 이상, 대문자, 소문자, 특수문자를 포함해야 합니다"
      >
        <Form onSubmit={onSubmit}>
          <Stack className="ResetPwPage__form-content">
            {email && (
              <Typography className="ResetPwPage__email" color="primary">
                {email}
              </Typography>
            )}

            {/* 에러 메시지 */}
            {errorMessage && (
              <Alert className="ResetPwPage__alert" severity="error" rounded="sm">
                {errorMessage}
              </Alert>
            )}

            {/* 새 비밀번호 */}
            <PasswordInput
              label="새 비밀번호"
              placeholder="새 비밀번호를 입력하세요"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onPasswordChange(e.target.value)}
              disabled={status === "submitting"}
              fullWidth
              error={!!passwordError}
              helperText={passwordError}
            />

            {/* 비밀번호 확인 */}
            <PasswordInput
              label="비밀번호 확인"
              placeholder="비밀번호를 다시 입력하세요"
              value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onConfirmPasswordChange(e.target.value)}
              disabled={status === "submitting"}
              fullWidth
              error={!!confirmPasswordError}
              helperText={confirmPasswordError}
            />

            {/* 제출 버튼 */}
            <Button
              className="ResetPwPage__submit-btn"
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={status === "submitting" || !password || !confirmPassword || !!passwordError || !!confirmPasswordError}
            >
              {status === "submitting" ? "처리 중..." : "비밀번호 변경"}
            </Button>

            {/* 로그인으로 돌아가기 */}
            <Stack className="ResetPwPage__back-link">
              <Link
                className="ResetPwPage__link"
                href="#"
                underline="hover"
                color="text.secondary"
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  onGoToLogin();
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
