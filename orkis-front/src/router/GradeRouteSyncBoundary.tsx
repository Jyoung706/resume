/**
 * GradeRouteSyncBoundary — /chat · /pro 라우트 element 를 감싸 selectedGrade ↔ 라우트 동기화 훅을 부착.
 *
 * createBrowserRouter 구조에서 RouterProvider 외부(App.tsx)에서는 useLocation/useNavigate 를 쓸 수 없으므로,
 * grade 영향권에 있는 라우트만 본 wrapper 로 감싸 정책을 적용한다.
 */
import type { ReactNode } from "react";
import { useGradeRouteSync } from "@/logic/common/grade/useGradeRouteSync";

interface Props {
  children: ReactNode;
}

export function GradeRouteSyncBoundary({ children }: Props) {
  useGradeRouteSync();
  return <>{children}</>;
}
