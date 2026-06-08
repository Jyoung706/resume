// ============================================
// __dev/error/ErrorPageTest
// Page 레이어 검증 — 라우트를 RouteErrorBoundary로 감싼 상태에서 throw.
// 에러 시 페이지 전체가 PageErrorFallback으로 대체되지만,
// MainLayout(헤더·사이드바)은 정상 유지.
// ============================================

import { Box, Stack, Typography } from "@/components";
import { ThrowOnRender } from "./ThrowOnRender";
import "./ErrorTest.scss";

export function ErrorPageTest() {
  return (
    <Box className="ErrorTestPage__container">
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="h5" component="h1">
            Page 레이어 테스트
          </Typography>
          <Typography variant="body2" color="text.secondary">
            "에러 트리거" 클릭 → <code>PageErrorFallback</code>이 라우트
            Outlet을 대체. Layout(헤더/사이드바)은 유지.
          </Typography>
        </Stack>
        <ThrowOnRender message="[dev test] page error" />
      </Stack>
    </Box>
  );
}
