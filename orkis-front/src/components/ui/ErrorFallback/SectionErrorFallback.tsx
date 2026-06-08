// ============================================
// ui/ErrorFallback/SectionErrorFallback
// Layer 1 — 섹션(부분 영역) 단위 폴백.
// 페이지 나머지는 정상 동작 유지, 해당 영역만 에러 표시.
// minHeight는 prop으로 주입되므로 inline style 유지, 나머지는 SCSS.
// ============================================

import { Box } from "@/components/base/Box";
import { Button } from "@/components/base/Button";
import { Stack } from "@/components/base/Stack";
import { Typography } from "@/components/base/Typography";
import "./SectionErrorFallback.scss";

const isDev = import.meta.env.DEV;

export interface SectionErrorFallbackProps {
  error: Error;
  reset: () => void;
  /** 커스텀 메시지 */
  message?: string;
  /** 최소 높이 (기본 120px) */
  minHeight?: number | string;
}

export function SectionErrorFallback({
  error,
  reset,
  message = "이 영역을 불러올 수 없습니다.",
  minHeight = 120,
}: SectionErrorFallbackProps) {
  return (
    <Box
      className="SectionErrorFallback__container"
      role="alert"
      style={{ minHeight }}
    >
      <Stack spacing={1} alignItems="center">
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
        {isDev && (
          <Typography
            className="SectionErrorFallback__error-message"
            variant="caption"
            color="error"
          >
            [Dev] {error.message}
          </Typography>
        )}
        <Button size="small" variant="outlined" onClick={reset}>
          다시 시도
        </Button>
      </Stack>
    </Box>
  );
}
