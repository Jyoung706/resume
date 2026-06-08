import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Agentation } from "agentation";
import "@fontsource/roboto/latin.css";
import "@fontsource/noto-sans-kr/latin.css";
import "@fontsource/noto-sans-kr/korean.css";
import "@fontsource/nanum-myeongjo/latin.css";
import "@fontsource/nanum-myeongjo/korean.css";
import "@/design-system/core/index.scss";
import App from "@app";
import { ErrorBoundary } from "@/components/base/ErrorBoundary";
import { AppErrorFallback } from "@/components/ui/ErrorFallback";
import { setupGlobalErrorHandlers } from "@/logic/shared/utils/globalErrorHandler";
import { reportError } from "@/logic/shared/monitoring/errorReporter";
// DEV 전용: App Root ErrorBoundary 검증 트리거
// (RouterProvider 바깥에서 throw해야 ErrorBoundary까지 버블링됨)
import { DevAppThrowTrigger } from "@/pages/__dev/error/DevAppThrowTrigger";

// 앱 마운트 이전에 전역 에러 핸들러 등록 (unhandledrejection, window.onerror 등)
setupGlobalErrorHandlers();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* Layer 3 — App Root Error Boundary.
        ThemeProvider가 로드되기 전 단계 오류도 포착해야 하므로
        AppErrorFallback은 인라인 스타일만 사용한다. */}
    <ErrorBoundary
      fallback={(error, reset) => (
        <AppErrorFallback error={error} reset={reset} />
      )}
      onError={(error, info) =>
        reportError(error, {
          source: "app_root",
          componentStack: info.componentStack ?? undefined,
        })
      }
    >
      {import.meta.env.VITE_ENABLE_AGENTATION === "true" && <Agentation />}
      {/* DEV 전용: `dev:throw-app` CustomEvent 수신 시 throw → AppErrorFallback */}
      {import.meta.env.DEV && <DevAppThrowTrigger />}
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
