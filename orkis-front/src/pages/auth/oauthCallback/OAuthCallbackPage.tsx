// ============================================
// OAuth 콜백 페이지 — props 기반 Design 컴포넌트
// Design Layer: 로딩/에러 상태만 렌더링 (로직 없음)
// ============================================

import {
  Alert,
  Button,
  CircularProgress,
  FlexBox,
  Stack,
  Typography,
} from "@/components";
import "./OAuthCallbackPage.scss";

// ============================================
// Props 인터페이스
// ============================================
export interface OAuthCallbackPageProps {
  status: "loading" | "success" | "error";
  error?: string | null;
  onRetry?: () => void;
  onNavigateHome?: () => void;
}

// ============================================
// OAuthCallbackPage (Design Only — props 기반)
// ============================================
export function OAuthCallbackPage({
  status,
  error,
  onRetry,
  onNavigateHome,
}: OAuthCallbackPageProps) {
  return (
    <FlexBox
      className="OAuthCallback__root ok-oauth-callback-page"
      justify="center"
      align="center"
    >
      <Stack className="OAuthCallback__content">
        {status === "loading" && (
          <>
            <CircularProgress size="xlarge" />
            <Typography
              className="OAuthCallback__title"
              variant="h6"
              color="var(--text-color)"
            >
              로그인 처리 중...
            </Typography>
            <Typography
              className="OAuthCallback__subtitle"
              color="var(--text-muted)"
            >
              잠시만 기다려주세요
            </Typography>
          </>
        )}

        {status === "success" && (
          <>
            <Typography
              className="OAuthCallback__title"
              variant="h6"
              color="var(--text-color)"
            >
              인증 완료
            </Typography>
            <Typography
              className="OAuthCallback__subtitle"
              color="var(--text-muted)"
            >
              페이지를 이동합니다...
            </Typography>
          </>
        )}

        {status === "error" && (
          <>
            <Alert className="OAuthCallback__alert" severity="error" rounded="sm">
              {error || "인증 처리 중 오류가 발생했습니다."}
            </Alert>
            <FlexBox className="OAuthCallback__actions">
              {onRetry && (
                <Button variant="outlined" onClick={onRetry}>
                  다시 시도
                </Button>
              )}
              {onNavigateHome && (
                <Button variant="contained" onClick={onNavigateHome}>
                  홈으로 돌아가기
                </Button>
              )}
            </FlexBox>
          </>
        )}
      </Stack>
    </FlexBox>
  );
}
