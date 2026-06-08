/**
 * 인증 상태 접근 훅
 */
import { useAuthStore } from "@/logic/common/auth/authStore";
import { useEffect, useState } from "react";

/**
 * authStore의 인증 상태를 React 컴포넌트에 바인딩하는 훅.
 * 마운트 시 checkAuth를 호출하여 쿠키 기반 인증 상태를 확인하고,
 * 100ms 초기화 지연 동안 isLoading=true를 유지하여 깜빡임을 방지한다.
 * getUserName/getUserEmail/getUserId 헬퍼로 대소문자 혼용 필드를 통합 접근할 수 있다.
 */
export const useAuth = () => {
  const authStore = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    authStore.checkAuth();
    const timer = setTimeout(() => setIsInitializing(false), 100);
    return () => clearTimeout(timer);
  }, [authStore]);

  return {
    user: authStore.user,
    isAuthenticated: authStore.isAuthenticated,
    isLoading: authStore.isLoading || isInitializing,
    error: authStore.error,

    login: authStore.login,
    logout: authStore.logout,
    clearError: authStore.clearError,

    getUserName: () => authStore.user?.name || authStore.user?.NAME,
    getUserEmail: () => authStore.user?.email || authStore.user?.EMAIL,
    getUserId: () => authStore.user?.id || authStore.user?.ID
  };
};
