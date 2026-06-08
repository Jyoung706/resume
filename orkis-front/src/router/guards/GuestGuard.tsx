/**
 * 게스트 가드 — 이미 인증된 사용자는 메인 페이지로 리다이렉트
 * Logic Layer(useAuth)만 사용, Design Layer ��존 없음
 *
 * 인증 상태 초기화(checkAuth)는 App.tsx에서 1회 실행.
 * GuestGuard는 초기화가 완료된 상태를 전제로 isAuthenticated만 확인한다.
 */
import { useAuthStore } from "@/logic/common/auth/authStore";
import { Navigate, useLocation } from "react-router-dom";

export function GuestGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (isAuthenticated) {
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/chat";
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
}

