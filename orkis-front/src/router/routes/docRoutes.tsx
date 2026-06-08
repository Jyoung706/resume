// ============================================
// docRoutes.tsx — 컴포넌트 API 문서 라우트 (dev-only)
// 개발 환경에서만 포함. router/index.tsx에서 isDev 가드.
// ============================================

import { MainLayout } from "@/layouts/MainLayout";
import { type RouteObject } from "react-router-dom";
import { lazyLoad } from "@/router/lazyLoad";

// --- Lazy imports ---

const DocPage = lazyLoad(
  () => import("@/pages/__dev/doc/DocPage"),
  m => m.DocPage
);
const DocDetailPage = lazyLoad(
  () => import("@/pages/__dev/doc/DocDetailPage"),
  m => m.DocDetailPage
);

export const docRoutes: RouteObject[] = [
  {
    path: "/doc",
    element: <MainLayout />,
    children: [
      { index: true, element: <DocPage /> },
      { path: ":name", element: <DocDetailPage /> }
    ]
  }
];
