// ============================================
// ui/ErrorFallback/SectionErrorBoundary
// Layer 1 — 섹션 단위 Error Boundary 래퍼.
// ErrorBoundary + SectionErrorFallback + errorReporter 결합.
// ============================================

import { type ReactNode } from "react";
import { ErrorBoundary } from "@/components/base/ErrorBoundary";
import { SectionErrorFallback } from "./SectionErrorFallback";
import { reportError } from "@/logic/shared/monitoring/errorReporter";

export interface SectionErrorBoundaryProps {
  children: ReactNode;
  /** 섹션 식별자 (errorReporter 컨텍스트용) */
  name?: string;
  /** 커스텀 메시지 */
  message?: string;
  /** 최소 높이 (기본 120px) */
  minHeight?: number | string;
  /** 이 값이 변경되면 에러 상태 자동 초기화 */
  resetKeys?: ReadonlyArray<unknown>;
}

export function SectionErrorBoundary({
  children,
  name,
  message,
  minHeight,
  resetKeys,
}: SectionErrorBoundaryProps) {
  return (
    <ErrorBoundary
      resetKeys={resetKeys}
      fallback={(error, reset) => (
        <SectionErrorFallback
          error={error}
          reset={reset}
          message={message}
          minHeight={minHeight}
        />
      )}
      onError={(error, info) =>
        reportError(error, {
          source: "section",
          componentStack: info.componentStack ?? undefined,
          extra: { name },
        })
      }
    >
      {children}
    </ErrorBoundary>
  );
}
