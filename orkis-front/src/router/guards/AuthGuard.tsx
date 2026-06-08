/**
 * 인증 가드 — 미인증 시 로그인 페이지로 리다이렉트
 * Logic Layer만 사용, Design Layer 의존 없음
 *
 * 인증 상태 초기화(checkAuth)는 App.tsx에서 1회 실행.
 * AuthGuard는 초기화가 완료된 상태를 전제로 isAuthenticated만 확인한다.
 *
 * 이미지 로딩 게이트: 인증 통과 후 프로필/배경 이미지 로드 완료까지
 * children 렌더를 지연하여 깜빡임을 방지한다.
 */
import { useEffect } from "react";
import { useAuthStore } from "@/logic/common/auth/authStore";
import { useUserBootstrap } from "@/logic/common/auth/useUserBootstrap";
import { useProfileImageStore } from "@/logic/common/profile/profileImageStore";
import { useBackgroundImageStore } from "@/logic/common/background/backgroundImageStore";
import { Navigate, useLocation } from "react-router-dom";
import { getLogger } from "@/logic/shared/utils/logger";

const logger = getLogger("AuthGuard");

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  // 로그인 사용자 변경 시 DB/LLM/세션 부트스트랩 (동일 탭 계정 전환 stale 차단)
  useUserBootstrap();

  // 이미지 로드 상태 구독
  const profileInitialized = useProfileImageStore((s) => s.isInitialized);
  const backgroundInitialized = useBackgroundImageStore((s) => s.isInitialized);
  const imagesReady = profileInitialized && backgroundInitialized;

  // 인증 확인 후, 이미지가 아직 초기화되지 않았으면 fetch 트리거
  // (프리로드가 이미 진행 중이면 스킵됨)
  useEffect(() => {
    if (isAuthenticated && !imagesReady) {
      Promise.resolve(useProfileImageStore.getState().fetchImage()).catch((e) => {
        logger.warn("profile image fetch failed:", e);
      });
      Promise.resolve(useBackgroundImageStore.getState().fetchImage()).catch((e) => {
        logger.warn("background image fetch failed:", e);
      });
    }
  }, [isAuthenticated, imagesReady]);

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // 인증 완료 + 이미지 로드 대기
  if (!imagesReady) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>로딩 중...</div>;
  }

  return <>{children}</>;
}
