// ============================================
// ui/ErrorFallback/AppErrorFallback
// Layer 3 — App Root용 풀스크린 폴백.
// ThemeProvider 외부에서 렌더될 수 있으므로 base/ 컴포넌트 사용 불가 →
// 네이티브 HTML + 전용 SCSS(리터럴 값 유지).
// ============================================

import "./AppErrorFallback.scss";

export interface AppErrorFallbackProps {
  error: Error;
  reset: () => void;
}

const isDev = import.meta.env.DEV;

export function AppErrorFallback({ error, reset }: AppErrorFallbackProps) {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="AppErrorFallback__container" role="alert" aria-live="assertive">
      <h1 className="AppErrorFallback__title">문제가 발생했습니다</h1>
      <p className="AppErrorFallback__desc">
        예기치 않은 오류가 발생했습니다. 다시 시도하거나 페이지를 새로고침해주세요.
      </p>
      <div className="AppErrorFallback__button-row">
        <button
          type="button"
          className="AppErrorFallback__button AppErrorFallback__button--primary"
          onClick={reset}
        >
          다시 시도
        </button>
        <button type="button" className="AppErrorFallback__button" onClick={handleReload}>
          새로고침
        </button>
      </div>
      {isDev && (
        <details className="AppErrorFallback__details">
          <summary className="AppErrorFallback__summary">오류 상세 (개발 모드)</summary>
          <pre className="AppErrorFallback__pre">{error.message}</pre>
          {error.stack && <pre className="AppErrorFallback__pre">{error.stack}</pre>}
        </details>
      )}
    </div>
  );
}
