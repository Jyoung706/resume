// ============================================
// devRoutes.tsx — 개발 전용 검증 라우트
// Error Boundary 각 레이어(App/Page/Section) 동작 확인용.
// 프로덕션 빌드에는 포함되지 않는다 (router/index.tsx에서 isDev 가드).
//
// 구성:
//   /__dev/error        — Hub (Section/App/Modal 트리거 인라인 포함)
//   /__dev/error/page   — Page 레이어 전용 (호스트 파괴 특성상 분리)
// ============================================

import { MainLayout } from "@/layouts/MainLayout";
import { RouteErrorBoundary } from "@/router/RouteErrorBoundary";
import { lazyLoad } from "@/router/lazyLoad";
import { type RouteObject } from "react-router-dom";
import type { ReactElement } from "react";

// --- Lazy imports ---

const ErrorTestHub = lazyLoad(
  () => import("@/pages/__dev/error"),
  m => m.ErrorTestHub
);
const ErrorPageTest = lazyLoad(
  () => import("@/pages/__dev/error"),
  m => m.ErrorPageTest
);

const withRouteBoundary = (element: ReactElement): ReactElement => (
  <RouteErrorBoundary>{element}</RouteErrorBoundary>
);

export const devRoutes: RouteObject[] = [
  {
    path: "/__dev/error",
    element: withRouteBoundary(<MainLayout />),
    children: [
      { index: true, element: <ErrorTestHub /> },
      { path: "page", element: <ErrorPageTest /> }
    ]
  }
];
