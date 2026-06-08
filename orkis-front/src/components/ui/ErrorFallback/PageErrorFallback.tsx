// ============================================
// ui/ErrorFallback/PageErrorFallback
// Layer 2 — 라우트(페이지) 단위 폴백.
// ThemeProvider 내부이므로 base/ 컴포넌트 사용 가능.
// ============================================

import { useNavigate } from "react-router-dom";
import { Box } from "@/components/base/Box";
import { Button } from "@/components/base/Button";
import { Stack } from "@/components/base/Stack";
import { Typography } from "@/components/base/Typography";
import "./PageErrorFallback.scss";

const isDev = import.meta.env.DEV;

export interface PageErrorFallbackProps {
  error: Error;
  reset: () => void;
  /** 커스텀 제목 */
  title?: string;
  /** 커스텀 설명 */
  description?: string;
}

export function PageErrorFallback({
  error,
  reset,
  title = "페이지를 불러올 수 없습니다",
  description = "일시적인 오류가 발생했습니다. 다시 시도하거나 다른 페이지로 이동해주세요.",
}: PageErrorFallbackProps) {
  const navigate = useNavigate();

  const handleHome = () => {
    reset();
    navigate("/");
  };

  return (
    <Box
      className="PageErrorFallback__container"
      role="alert"
      aria-live="assertive"
    >
      <Stack spacing={2} alignItems="center">
        <Typography variant="h5" component="h1">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
        {isDev && (
          <Typography
            className="PageErrorFallback__error-message"
            variant="caption"
            color="error"
          >
            [Dev] {error.message}
          </Typography>
        )}
        <Stack
          className="PageErrorFallback__actions"
          direction="row"
          spacing={1}
        >
          <Button variant="contained" onClick={reset}>
            다시 시도
          </Button>
          <Button variant="outlined" onClick={handleHome}>
            홈으로
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
