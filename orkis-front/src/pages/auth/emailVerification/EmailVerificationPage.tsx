// ============================================
// 이메일 인증 페이지 — props 기반 Design 컴포넌트
// Design Layer: props만 받아서 렌더링 (로직 없음)
// ============================================

import {
  AuthCard,
  Button,
  CheckCircleOutlineIcon,
  CircularProgress,
  ErrorOutlineIcon,
  FlexBox,
  Img,
  Stack,
  Typography
} from "@/components";
import { useThemeModeContext } from "@/design-system";
import "./EmailVerificationPage.scss";

// ============================================
// 타입
// ============================================
export type EmailVerificationStatus = "loading" | "success" | "error" | "expired";

// ============================================
// Props 인터페이스
// ============================================
export interface EmailVerificationPageProps {
  status: EmailVerificationStatus;
  message: string;
  email?: string;
  isAuthenticated?: boolean;
  onContinue: () => void;
  onResendEmail?: () => void;
}

// ============================================
// EmailVerificationPage (Design Only — props 기반)
// ============================================
export function EmailVerificationPage({
  status,
  message,
  email,
  isAuthenticated,
  onContinue,
  onResendEmail,
}: EmailVerificationPageProps) {

  const { resolvedMode } = useThemeModeContext();

  const getStatusIcon = () => {
    switch (status) {
      case "loading":
        return <CircularProgress size="xlarge" />;
      case "success":
        return <CheckCircleOutlineIcon className="EmailVerifyPage__status-icon EmailVerifyPage__status-icon--success" />;
      case "error":
      case "expired":
        return <ErrorOutlineIcon className="EmailVerifyPage__status-icon EmailVerifyPage__status-icon--error" />;
      default:
        return null;
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case "loading": return "인증 처리 중";
      case "success": return "인증 완료";
      case "expired": return "링크 만료";
      case "error": return "인증 실패";
      default: return "";
    }
  };

  return (
    <Stack className="EmailVerifyPage__root">
      {/* ORKIS 로고 헤더 */}
      <FlexBox className="EmailVerifyPage__logo">
        <Img className="EmailVerifyPage__logo-symbol" src={resolvedMode === 'dark' ? '/assets/logo/orkis-symbol-dark.png' : '/assets/logo/orkis-symbol.png'} alt="ORKIS Symbol" />
        <Img className="EmailVerifyPage__logo-text" src={resolvedMode === 'dark' ? '/assets/logo/orkis-text-dark.svg' : '/assets/logo/orkis-text.svg'} alt="ORKIS" />
      </FlexBox>

      <AuthCard
        className="EmailVerifyPage__card"
        leadingIcon={getStatusIcon()}
        title={getStatusTitle()}
        subtitle={message}
      >
        <Stack className="EmailVerifyPage__content">
          {/* 인증된 이메일 표시 */}
          {status === "success" && email && (
            <Typography className="EmailVerifyPage__email" color="primary">
              {email}
            </Typography>
          )}

          {/* 버튼 영역 */}
          {status === "success" && (
            <Button className="EmailVerifyPage__submit-btn" variant="contained" onClick={onContinue} fullWidth size="large">
              {isAuthenticated ? "메인으로 이동" : "로그인하기"}
            </Button>
          )}

          {status === "expired" && (
            <Stack className="EmailVerifyPage__btn-group">
              {onResendEmail && (
                <Button variant="outlined" onClick={onResendEmail} fullWidth size="large">
                  인증 메일 재발송
                </Button>
              )}
              <Button variant="contained" onClick={onContinue} fullWidth size="large">
                {isAuthenticated ? "메인으로 이동" : "로그인으로 이동"}
              </Button>
            </Stack>
          )}

          {status === "error" && (
            <Button className="EmailVerifyPage__submit-btn" variant="contained" onClick={onContinue} fullWidth size="large">
              {isAuthenticated ? "메인으로 이동" : "로그인으로 이동"}
            </Button>
          )}
        </Stack>
      </AuthCard>
    </Stack>
  );
}
