// ============================================
// pages/error/NotFoundPage
// 매칭되지 않는 모든 경로(*)를 처리하는 404 페이지.
// 조용한 리다이렉트 대신 명시적 안내 + errorReporter 기록을 수행한다.
// ============================================

import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Button, Stack, Typography } from "@/components";
import { reportError } from "@/logic/shared/monitoring/errorReporter";
import { getLogger } from "@/logic/shared/utils/logger";
import "./NotFoundPage.scss";

const logger = getLogger("NotFoundPage");

export function NotFoundPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const attemptedPath = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    // DEV: 콘솔 경고로 즉시 가시화
    if (import.meta.env.DEV) {
      logger.warn(`Route not matched: ${attemptedPath}`);
    }
    // 프로덕션/개발 공통: 모니터링에 기록 (추후 Sentry 집계 대상)
    reportError(new Error(`Route not found: ${attemptedPath}`), {
      source: "route_not_found",
      extra: {
        path: location.pathname,
        search: location.search,
        hash: location.hash,
        referrer: document.referrer || null,
      },
    });
  }, [attemptedPath, location.pathname, location.search, location.hash]);

  return (
    <Box
      className="NotFoundPage__container"
      role="alert"
      aria-live="polite"
    >
      <Stack spacing={2} alignItems="center">
        <Typography className="NotFoundPage__code" component="h1" color="error">
          404
        </Typography>
        <Typography variant="h5" component="h2">
          페이지를 찾을 수 없습니다
        </Typography>
        <Typography variant="body2" color="text.secondary">
          요청하신 경로에 해당하는 페이지가 없습니다.
        </Typography>
        <Typography
          className="NotFoundPage__path"
          variant="caption"
          color="text.secondary"
        >
          {attemptedPath}
        </Typography>
        <Stack
          className="NotFoundPage__actions"
          direction="row"
          spacing={1}
        >
          <Button variant="contained" onClick={() => navigate("/")}>
            홈으로
          </Button>
          <Button variant="outlined" onClick={() => navigate(-1)}>
            이전 페이지
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
