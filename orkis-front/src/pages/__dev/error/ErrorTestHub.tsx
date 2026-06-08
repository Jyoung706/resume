// ============================================
// __dev/error/ErrorTestHub
// 에러 바운더리 검증 허브 — Section/App/Modal 트리거를 인라인으로 포함.
// Page 레이어는 호스트 페이지를 파괴하는 특성상 별도 라우트로 분리.
// (DEV 빌드에서만 라우팅 등록됨)
// ============================================

import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  SectionErrorBoundary,
  Stack,
  Typography,
} from "@/components";
import { DEV_APP_THROW_EVENT } from "./DevAppThrowTrigger";
import { ThrowOnRender } from "./ThrowOnRender";
import "./ErrorTest.scss";

function triggerAppRootError() {
  window.dispatchEvent(
    new CustomEvent(DEV_APP_THROW_EVENT, {
      detail: { message: "[dev test] app root error" },
    }),
  );
}

function dispatchModalError(detail: {
  title?: string;
  message: string;
  type?: "error" | "warning" | "info";
}) {
  window.dispatchEvent(new CustomEvent("modal:error", { detail }));
}

export function ErrorTestHub() {
  const navigate = useNavigate();

  return (
    <Box className="ErrorTestPage__container">
      <Stack spacing={4}>
        <Stack spacing={1}>
          <Typography variant="h4" component="h1">
            Error Boundary 검증
          </Typography>
          <Typography variant="body2" color="text.secondary">
            각 레이어별 폴백 UI와 스코프 격리 동작을 확인합니다. Section / App /
            Modal은 이 Hub에서 바로 트리거하고, Page 레이어는 호스트 페이지가
            파괴되는 특성상 별도 라우트로 분리되어 있습니다.
          </Typography>
        </Stack>

        {/* ─── Section 레이어 ─── */}
        <Stack spacing={1}>
          <Typography variant="h6" component="h2">
            Section 레이어 (SectionErrorFallback)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            "에러 트리거" 클릭 → <code>SectionErrorFallback</code>이 대상
            섹션만 대체. 아래 형제 섹션과 Hub의 다른 테스트 버튼은 정상 동작해야
            함.
          </Typography>

          <Box className="ErrorTestPage__section">
            <SectionErrorBoundary
              name="dev-section-test"
              message="이 섹션에서 오류 발생 (정상 동작)"
              minHeight={160}
            >
              <Stack spacing={2} alignItems="flex-start">
                <Typography variant="subtitle1">대상 섹션 (에러 유도)</Typography>
                <ThrowOnRender message="[dev test] section error" />
              </Stack>
            </SectionErrorBoundary>
          </Box>

          <Box className="ErrorTestPage__sibling">
            <Stack spacing={1}>
              <Typography variant="subtitle1">형제 섹션 (정상 유지)</Typography>
              <Typography variant="body2" color="text.secondary">
                위 섹션이 에러 상태여도 이 영역은 계속 렌더됩니다.
              </Typography>
            </Stack>
          </Box>
        </Stack>

        {/* ─── App 레이어 ─── */}
        <Stack spacing={1}>
          <Typography variant="h6" component="h2">
            App 레이어 (AppErrorFallback)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            "에러 트리거" 클릭 → RouterProvider 바깥의{" "}
            <code>DevAppThrowTrigger</code>가 throw →{" "}
            <code>AppErrorFallback</code>이 전체 화면을 덮습니다. Data Router는
            라우트 내부 throw를 자체적으로 가로채므로{" "}
            <code>CustomEvent("{DEV_APP_THROW_EVENT}")</code>로 외부에서 throw를
            유발합니다.
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              color="error"
              onClick={triggerAppRootError}
            >
              에러 트리거
            </Button>
          </Stack>
        </Stack>

        {/* ─── Modal 레이어 ─── */}
        <Stack spacing={1}>
          <Typography variant="h6" component="h2">
            Error Modal (modal:error 이벤트)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <code>window.dispatchEvent(new CustomEvent("modal:error", …))</code>
            로 ErrorModalProvider를 호출합니다. 네트워크/인증/서버 에러 같은
            치명 실패의 정상 UX 경로.
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              color="error"
              onClick={() =>
                dispatchModalError({
                  title: "오류",
                  message: "[dev test] 일반 에러 모달",
                  type: "error",
                })
              }
            >
              Error 모달
            </Button>
            <Button
              variant="outlined"
              color="warning"
              onClick={() =>
                dispatchModalError({
                  message: "[dev test] 경고 모달",
                  type: "warning",
                })
              }
            >
              Warning 모달
            </Button>
            <Button
              variant="outlined"
              onClick={() =>
                dispatchModalError({
                  message: "[dev test] 정보 모달",
                  type: "info",
                })
              }
            >
              Info 모달
            </Button>
          </Stack>
        </Stack>

        {/* ─── Page 레이어 — 별도 라우트 링크 ─── */}
        <Stack spacing={1}>
          <Typography variant="h6" component="h2">
            Page 레이어 (PageErrorFallback)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            페이지 레벨 throw는 라우트 Outlet 전체를 폴백으로 대체하므로 Hub를
            함께 파괴합니다. 따라서 별도 라우트에서 검증합니다.
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              onClick={() => navigate("/__dev/error/page")}
            >
              Page 레이어 테스트로 이동
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}
