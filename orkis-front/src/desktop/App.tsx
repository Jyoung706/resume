// ============================================
// src/desktop/App.tsx — desktop 빌드 전용 앱 루트
// cloud App.tsx 의 로직 + desktop 부트스트랩 분기를 합친 진입점.
// vite alias `@app` 가 desktop 빌드 시 이 파일로 swap.
// ============================================

import { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import { ThemeModeProvider } from "@/design-system";
import { ToastProvider } from "@/components/ui/Toast";
import { ErrorModalProvider } from "@/components/ui/ErrorModal";
import { PageLoading } from "@/components/ui/PageLoading";
import { initAuthListener, useAuthStore } from "@/logic/common/auth/authStore";
import { useSessionRefresh } from "@/logic/common/auth/useSessionRefresh";
import { router } from "@/router";
import { DesktopTitleBar } from "@/desktop/components/DesktopTitleBar";
import { subscribeServiceHealth } from "@/desktop/services/electronHealth";
import { useServiceHealthStore } from "@/desktop/stores/serviceHealthStore";
import { clearElectronSession } from "@/desktop/services/electronAuth";

export default function App() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useSessionRefresh();

  // 컨테이너 준비 완료 대기
  useEffect(() => {
    const electronAPI = window.electronAPI;
    if (!electronAPI?.onAppReady) {
      setIsAppReady(true);
      return;
    }
    electronAPI.onAppReady(() => setIsAppReady(true));
  }, []);

  // ServiceHealth IPC 구독
  useEffect(() => {
    const setStatus = useServiceHealthStore.getState().setStatus;
    return subscribeServiceHealth((event) => {
      setStatus(event.name, event.status);
    });
  }, []);

  // logout 감지 → electron 쿠키 정리
  useEffect(() => {
    let prevAuthed = useAuthStore.getState().isAuthenticated;
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (prevAuthed && !state.isAuthenticated) {
        clearElectronSession();
      }
      prevAuthed = state.isAuthenticated;
    });
    return unsubscribe;
  }, []);

  // 컨테이너 준비 후 인증 초기화
  useEffect(() => {
    if (!isAppReady) return;
    const cleanupListener = initAuthListener();
    useAuthStore
      .getState()
      .checkAuth(true)
      .finally(() => setIsReady(true));
    return () => {
      cleanupListener();
    };
  }, [isAppReady]);

  if (!isAppReady || !isReady) {
    return (
      <ThemeModeProvider>
        <DesktopTitleBar />
        <PageLoading />
      </ThemeModeProvider>
    );
  }

  return (
    <ThemeModeProvider>
      <DesktopTitleBar />
      <ErrorModalProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </ErrorModalProvider>
    </ThemeModeProvider>
  );
}
