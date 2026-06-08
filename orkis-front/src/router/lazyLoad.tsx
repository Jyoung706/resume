import { lazy, Suspense, type ComponentType } from "react";
import { PageLoading } from "@/components/ui/PageLoading";
import { getLogger } from "@/logic/shared/utils/logger";

const logger = getLogger("lazyLoad");

const RETRY_COUNT = 2;
const RETRY_DELAY_MS = 1000;

/**
 * 동적 import 실패 시 N회 재시도.
 * 신규 배포 직후 chunk 경로가 바뀌어 로드 실패하는 경우에 대비.
 * 최종 실패 시에는 throw → 상위 ErrorBoundary가 포착.
 */
async function loadWithRetry<T>(importFn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
    try {
      return await importFn();
    } catch (error) {
      lastError = error;
      logger.warn(
        `[lazyLoad] chunk load failed (attempt ${attempt + 1}/${RETRY_COUNT + 1})`,
        error,
      );
      if (attempt < RETRY_COUNT) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }
  throw lastError;
}

/**
 * named export 컴포넌트를 React.lazy로 감싸고 Suspense를 적용하는 헬퍼
 *
 * @example
 * const LoginPage = lazyLoad(
 *   () => import("@/pages/login/LoginPage.preview"),
 *   m => m.LoginPagePreview
 * );
 *
 * // router에서 사용
 * { path: "/login", element: <LoginPage /> }
 */
export function lazyLoad<T extends Record<string, unknown>>(
  importFn: () => Promise<T>,
  selector: (module: T) => ComponentType<unknown>
) {
  const LazyComponent = lazy(() =>
    loadWithRetry(importFn).then(m => ({ default: selector(m) as ComponentType<unknown> }))
  );

  return function LazyWrapper(props: Record<string, unknown>) {
    return (
      <Suspense fallback={<PageLoading />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}
