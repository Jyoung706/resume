/**
 * OAuthCallbackConnector — Logic ↔ Design 접착 계층
 * useOAuthCallback 훅의 상태를 OAuthCallbackPage props로 매핑
 * 스타일 코드 없음, 비즈니스 로직 없음
 */
import { useNavigate, useSearchParams } from "react-router-dom";
import { useOAuthCallback } from "@/logic/auth/oauthCallback/useOAuthCallback";
import { OAuthCallbackPage } from "@/pages/auth/oauthCallback";

export function OAuthCallbackConnector() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const { status, error } = useOAuthCallback({
    code,
    state,
    onExistingUser: () => navigate("/chat", { replace: true }),
    onNewUser: () => navigate("/auth/user-type", { replace: true }),
    onError: () => {},
  });

  return (
    <OAuthCallbackPage
      status={status}
      error={error}
      onRetry={() => window.location.reload()}
      onNavigateHome={() => navigate("/auth/login")}
    />
  );
}
