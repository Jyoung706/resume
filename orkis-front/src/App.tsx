// ============================================
// App.tsx — 앱 루트 (ThemeProvider + Router)
// Phase 2: GET /auth/me API로 쿠키 기반 인증 확인
// ============================================

import { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import { ThemeModeProvider } from "@/design-system";
import { ToastProvider } from "@/components/ui/Toast";
import { ErrorModalProvider } from "@/components/ui/ErrorModal";
import { PageLoading } from "@/components/ui/PageLoading";
import { initAuthListener, useAuthStore } from "@/logic/common/auth/authStore";
import { useSessionRefresh } from "@/logic/common/auth/useSessionRefresh";
import { router } from "./router";

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useSessionRefresh();

  useEffect(() => {
    const cleanupListener = initAuthListener();

    // 쿠키 기반 인증 확인 (서버에 GET /auth/me 호출)
    // broadcast: true — 결과를 다른 탭에 알림 (auth_recovered / session_invalid)
    useAuthStore
      .getState()
      .checkAuth(true)
      .finally(() => setIsReady(true));

    return () => {
      cleanupListener();
    };
  }, []);

  if (!isReady) {
    return (
      <ThemeModeProvider>
        <PageLoading />
      </ThemeModeProvider>
    );
  }

  return (
    <ThemeModeProvider>
      <ErrorModalProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </ErrorModalProvider>
    </ThemeModeProvider>
  );
}
