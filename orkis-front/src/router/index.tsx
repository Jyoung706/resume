// ============================================
// router/index.tsx — React Router 설정 (조합 진입점)
// productionRoutes: 프로덕션 서비스 라우트
// previewRoutes:    디자인 프리뷰 (개발 환경 전용)
// templateRoutes:   컴포넌트 쇼케이스 (개발 환경 전용)
// ============================================

import { createBrowserRouter } from "react-router-dom";
import { productionRoutes } from "./routes/productionRoutes";
import { previewRoutes } from "./routes/previewRoutes";
import { templateRoutes } from "./routes/templateRoutes";
import { docRoutes } from "./routes/docRoutes";
import { devRoutes } from "./routes/devRoutes";

const isDev = import.meta.env.DEV;

export const router = createBrowserRouter([
  ...productionRoutes,
  ...(isDev ? previewRoutes : []),
  ...(isDev ? templateRoutes : []),
  ...(isDev ? docRoutes : []),
  ...(isDev ? devRoutes : []),
]);
