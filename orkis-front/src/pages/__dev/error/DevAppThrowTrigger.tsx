// ============================================
// __dev/error/DevAppThrowTrigger
// App Root ErrorBoundary 검증 전용 트리거.
//
// RouterProvider(Data Router)는 라우트 내부 throw를 자체적으로 가로채서
// main.tsx의 React ErrorBoundary까지 에러가 올라오지 않는다.
// 따라서 App Root 레이어를 테스트하려면 RouterProvider **바깥**에서
// throw가 발생해야 한다.
//
// 이 컴포넌트는 main.tsx에서 <App /> 과 형제로 마운트되어
// `dev:throw-app` CustomEvent를 수신하고, 다음 렌더에서 throw 한다.
// → main.tsx의 ErrorBoundary가 catch → AppErrorFallback 전체 화면 폴백.
//
// 프로덕션 빌드에서는 main.tsx에서 `import.meta.env.DEV` 가드로 제거된다.
// ============================================

import { useEffect, useState } from "react";

export interface DevAppThrowEventDetail {
  message?: string;
}

export const DEV_APP_THROW_EVENT = "dev:throw-app";

export function DevAppThrowTrigger() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<DevAppThrowEventDetail>;
      setMessage(custom.detail?.message ?? "[dev test] app root error");
    };
    window.addEventListener(DEV_APP_THROW_EVENT, handler);
    return () => window.removeEventListener(DEV_APP_THROW_EVENT, handler);
  }, []);

  if (message) {
    throw new Error(message);
  }

  return null;
}
