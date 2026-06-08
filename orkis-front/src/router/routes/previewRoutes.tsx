// ============================================
// previewRoutes.tsx — 디자인 프리뷰 라우트 정의
// API 연동 없이 UI만 확인하는 개발/디자인 확인용
// ============================================

import { AuthLayout } from "@/layouts/AuthLayout";
import { DefaultLayout } from "@/layouts/DefaultLayout";
import { Navigate, type RouteObject } from "react-router-dom";
import { lazyLoad } from "@/router/lazyLoad";

// --- Lazy imports ---

const LoginPagePreview = lazyLoad(
  () => import("@/pages/auth/login/LoginPage.preview"),
  m => m.LoginPagePreview
);
const SignupPagePreview = lazyLoad(
  () => import("@/pages/auth/signup/SignupPage.preview"),
  m => m.SignupPagePreview
);
const ForgotPasswordPagePreview = lazyLoad(
  () => import("@/pages/auth/forgotPassword/ForgotPasswordPage.preview"),
  m => m.ForgotPasswordPagePreview
);
const ResetPasswordPagePreview = lazyLoad(
  () => import("@/pages/auth/resetPassword/ResetPasswordPage.preview"),
  m => m.ResetPasswordPagePreview
);
const EmailVerificationPagePreview = lazyLoad(
  () => import("@/pages/auth/emailVerification/EmailVerificationPage.preview"),
  m => m.EmailVerificationPagePreview
);
const UserTypeSelectionPagePreview = lazyLoad(
  () => import("@/pages/auth/userType/UserTypeSelectionPage.preview"),
  m => m.UserTypeSelectionPagePreview
);
const ChatPagePreview = lazyLoad(
  () => import("@/pages/chat/main/ChatPage.preview"),
  m => m.ChatPagePreview
);

export const previewRoutes: RouteObject[] = [
  {
    path: "/preview",
    children: [
      { index: true, element: <Navigate to="/preview/login" replace /> },
      {
        path: "login",
        element: <AuthLayout />,
        children: [{ index: true, element: <LoginPagePreview /> }]
      },
      {
        path: "signup",
        element: <DefaultLayout />,
        children: [{ index: true, element: <SignupPagePreview /> }]
      },
      {
        path: "forgot-password",
        element: <AuthLayout formColumns={12} backgroundColumns={0} />,
        children: [{ index: true, element: <ForgotPasswordPagePreview /> }]
      },
      {
        path: "reset-password",
        element: <AuthLayout formColumns={12} backgroundColumns={0} />,
        children: [{ index: true, element: <ResetPasswordPagePreview /> }]
      },
      {
        path: "email-verification",
        element: <DefaultLayout />,
        children: [{ index: true, element: <EmailVerificationPagePreview /> }]
      },
      {
        path: "user-type-selection",
        element: <DefaultLayout />,
        children: [{ index: true, element: <UserTypeSelectionPagePreview /> }]
      },
      {
        path: "chat",
        element: <ChatPagePreview />
      }
    ]
  }
];
