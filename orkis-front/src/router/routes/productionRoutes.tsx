// ============================================
// productionRoutes.tsx — 프로덕션 라우트 정의
// Guard + Connector 패턴의 실제 서비스 라우트
// 각 element는 RouteErrorBoundary로 감싸 페이지 단위 에러 격리.
//
// "/" 루트는 RootRedirect로 인증 상태에 따라 분기:
//   인증됨 → /chat, 비인증 → /auth/login
// ============================================

import { AuthLayout } from "@/layouts/AuthLayout";
import { DefaultLayout } from "@/layouts/DefaultLayout";
import { AuthGuard } from "@/router/guards/AuthGuard";
import { GuestGuard } from "@/router/guards/GuestGuard";
import { RoleGuard } from "@/router/guards/RoleGuard";
import { RouteErrorBoundary } from "@/router/RouteErrorBoundary";
import { GradeRouteSyncBoundary } from "@/router/GradeRouteSyncBoundary";
import { Navigate, type RouteObject } from "react-router-dom";
import { lazyLoad } from "@/router/lazyLoad";
import { useAuthStore } from "@/logic/common/auth/authStore";
import type { ReactElement } from "react";

// --- RootRedirect: 인증 상태에 따라 /chat 또는 /auth/login으로 분기 ---
function RootRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return <Navigate to={isAuthenticated ? "/chat" : "/auth/login"} replace />;
}

// --- 404 ---
const NotFoundPage = lazyLoad(
  () => import("@/pages/error"),
  m => m.NotFoundPage
);

// --- Lazy imports ---

// Auth Connectors — LoginConnector는 진입점이므로 정적 import (Suspense 로딩바 제거)
import { LoginConnector } from "@/connectors/auth/login/LoginConnector";
const SignupConnector = lazyLoad(
  () => import("@/connectors/auth/signup/SignupConnector"),
  m => m.SignupConnector
);
const UserTypeConnector = lazyLoad(
  () => import("@/connectors/auth/userType/UserTypeConnector"),
  m => m.UserTypeConnector
);
const OAuthCallbackConnector = lazyLoad(
  () => import("@/connectors/auth/oauthCallback/OAuthCallbackConnector"),
  m => m.OAuthCallbackConnector
);
const ForgotPasswordConnector = lazyLoad(
  () => import("@/connectors/auth/forgotPassword/ForgotPasswordConnector"),
  m => m.ForgotPasswordConnector
);
const ResetPasswordConnector = lazyLoad(
  () => import("@/connectors/auth/resetPassword/ResetPasswordConnector"),
  m => m.ResetPasswordConnector
);
const EmailVerificationConnector = lazyLoad(
  () => import("@/connectors/auth/emailVerification/EmailVerificationConnector"),
  m => m.EmailVerificationConnector
);

// Chat Connector
const ChatConnector = lazyLoad(
  () => import("@/connectors/chat/main/ChatConnector"),
  m => m.ChatConnector
);

// Pro Mode Connector
const ProModeConnector = lazyLoad(
  () => import("@/connectors/pro/ProModeConnector"),
  m => m.ProModeConnector
);

// --- 헬퍼: 모든 라우트 element를 RouteErrorBoundary로 감싼다 ---
const withErrorBoundary = (element: ReactElement): ReactElement => (
  <RouteErrorBoundary>{element}</RouteErrorBoundary>
);

export const productionRoutes: RouteObject[] = [
  // ─── 루트 리다이렉트: 인증→/chat, 비인증→/auth/login ───
  {
    path: "/",
    element: <RootRedirect />,
  },

  // ─── Auth (GuestGuard: 로그인 사용자 → /chat 리다이렉트) ───
  {
    path: "/auth",
    children: [
      { index: true, element: <Navigate to="/auth/login" replace /> },
      {
        path: "login",
        element: withErrorBoundary(
          <GuestGuard>
            <AuthLayout />
          </GuestGuard>
        ),
        children: [{ index: true, element: <LoginConnector /> }]
      },
      {
        path: "signup",
        element: withErrorBoundary(
          <GuestGuard>
            <DefaultLayout />
          </GuestGuard>
        ),
        children: [{ index: true, element: <SignupConnector /> }]
      },
      {
        path: "user-type",
        element: withErrorBoundary(
          <GuestGuard>
            <DefaultLayout />
          </GuestGuard>
        ),
        children: [{ index: true, element: <UserTypeConnector /> }]
      },
      {
        path: "callback",
        element: withErrorBoundary(<OAuthCallbackConnector />)
      },
      {
        path: "forgot-password",
        element: withErrorBoundary(
          <GuestGuard>
            <AuthLayout formColumns={12} backgroundColumns={0} />
          </GuestGuard>
        ),
        children: [{ index: true, element: <ForgotPasswordConnector /> }]
      },
      {
        path: "reset-password",
        element: withErrorBoundary(
          <GuestGuard>
            <AuthLayout formColumns={12} backgroundColumns={0} />
          </GuestGuard>
        ),
        children: [{ index: true, element: <ResetPasswordConnector /> }]
      },
      {
        path: "verify-email",
        element: withErrorBoundary(<EmailVerificationConnector />)
      }
    ]
  },

  // ─── Chat (AuthGuard: 미인증 사용자 → /auth/login 리다이렉트) ───
  {
    path: "/chat",
    element: withErrorBoundary(
      <AuthGuard>
        <GradeRouteSyncBoundary>
          <ChatConnector />
        </GradeRouteSyncBoundary>
      </AuthGuard>
    )
  },
  {
    path: "/chat/:sessionId",
    element: withErrorBoundary(
      <AuthGuard>
        <GradeRouteSyncBoundary>
          <ChatConnector />
        </GradeRouteSyncBoundary>
      </AuthGuard>
    )
  },

  // ─── Pro Mode (AuthGuard + RoleGuard: pro/admin만 접근 가능) ───
  {
    path: "/pro",
    element: withErrorBoundary(
      <AuthGuard>
        <RoleGuard roles={["pro", "admin"]}>
          <GradeRouteSyncBoundary>
            <ProModeConnector />
          </GradeRouteSyncBoundary>
        </RoleGuard>
      </AuthGuard>
    )
  },
  {
    path: "/pro/:sessionId",
    element: withErrorBoundary(
      <AuthGuard>
        <RoleGuard roles={["pro", "admin"]}>
          <GradeRouteSyncBoundary>
            <ProModeConnector />
          </GradeRouteSyncBoundary>
        </RoleGuard>
      </AuthGuard>
    )
  },

  // ─── 404 Fallback ───
  { path: "*", element: withErrorBoundary(<NotFoundPage />) }
];
