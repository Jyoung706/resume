// ============================================
// base/ErrorBoundary — 순수 React Error Boundary
// MUI/SCSS 의존 없음. fallback UI는 외부에서 주입.
// ============================================

import { Component, type ErrorInfo, type ReactNode } from "react";

export type ErrorBoundaryFallback =
  | ReactNode
  | ((error: Error, reset: () => void) => ReactNode);

export interface ErrorBoundaryProps {
  /** 자식 컴포넌트 */
  children: ReactNode;
  /** 에러 발생 시 표시할 폴백 UI (ReactNode 또는 render prop) */
  fallback: ErrorBoundaryFallback;
  /** 에러 발생 시 호출 (로깅/리포팅 연결점) */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** 이 값이 변경되면 에러 상태 자동 초기화 (예: location.pathname) */
  resetKeys?: ReadonlyArray<unknown>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (!this.state.hasError) return;
    const { resetKeys } = this.props;
    const prevKeys = prevProps.resetKeys;
    if (!resetKeys || !prevKeys) return;
    if (resetKeys.length !== prevKeys.length) {
      this.reset();
      return;
    }
    const changed = resetKeys.some((key, i) => key !== prevKeys[i]);
    if (changed) this.reset();
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props;
      if (typeof fallback === "function") {
        return fallback(this.state.error, this.reset);
      }
      return fallback;
    }
    return this.props.children;
  }
}
