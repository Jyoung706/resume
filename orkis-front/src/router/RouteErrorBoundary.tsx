// ============================================
// router/RouteErrorBoundary
// Layer 2 — 라우트(페이지) 단위 Error Boundary 래퍼.
// pathname 변경 시 에러 상태 자동 초기화 (resetKeys).
// ============================================

import { type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ErrorBoundary } from "@/components/base/ErrorBoundary";
import { PageErrorFallback } from "@/components/ui/ErrorFallback";
import { reportError } from "@/logic/shared/monitoring/errorReporter";

export interface RouteErrorBoundaryProps {
  children: ReactNode;
}

export function RouteErrorBoundary({ children }: RouteErrorBoundaryProps) {
  const location = useLocation();

  return (
    <ErrorBoundary
      resetKeys={[location.pathname]}
      fallback={(error, reset) => (
        <PageErrorFallback error={error} reset={reset} />
      )}
      onError={(error, info) =>
        reportError(error, {
          source: "route",
          componentStack: info.componentStack ?? undefined,
          extra: { path: location.pathname },
        })
      }
    >
      {children}
    </ErrorBoundary>
  );
}
