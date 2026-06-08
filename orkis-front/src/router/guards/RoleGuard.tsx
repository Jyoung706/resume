/**
 * 역할 가드 — AUTH_CODE 기반 접근 제어
 * AuthGuard 하위에서 사용 (로그인 여부는 이미 확인된 상태).
 *
 * 백엔드 AUTH_CODE 기준:
 *   '1' = free  (일반 사용자)
 *   '2' = pro   (기업 사용자)
 *   '3' = admin (기업 관리자)
 *
 * React Compiler가 메모이제이션을 자동 처리하므로 useMemo 불필요.
 */
import { useAuthStore } from "@/logic/common/auth/authStore";
import { Navigate } from "react-router-dom";
import type { UserType } from "@/logic/common/auth/types/auth";

export function RoleGuard({
  roles,
  fallback = "/chat",
  children,
}: {
  roles: UserType[];
  fallback?: string;
  children: React.ReactNode;
}) {
  const authCode = useAuthStore((s) => s.user?.AUTH_CODE as string | undefined);

  // AUTH_CODE 기준으로 판단 — 백엔드 원시 값을 직접 사용
  const hasAccess = (() => {
    if (!authCode) return false;
    if (roles.includes("admin") && authCode === "3") return true;
    if (roles.includes("pro") && (authCode === "2" || authCode === "3")) return true;
    if (roles.includes("free")) return true;
    return false;
  })();

  if (!hasAccess) {
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
}
