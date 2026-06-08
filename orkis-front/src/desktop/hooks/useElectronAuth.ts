import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { isElectron } from "@/desktop/utils/platform";
import {
  startElectronOAuth,
  cancelElectronOAuth
} from "@/desktop/services/electronAuth";
import { apiPost } from "@/logic/shared/services/request";
import { useAuthStore } from "@/logic/common/auth/authStore";
import type { OAuthProviderName } from "@/logic/common/auth/types/auth";
import { getLogger } from "@/logic/shared/utils/logger";

const logger = getLogger("useElectronAuth");

interface UseElectronAuthReturn {
  isElectronEnv: boolean;
  loading: boolean;
  oauthProvider: OAuthProviderName | null;
  handleElectronOAuth: (provider: OAuthProviderName) => Promise<void>;
  cancelOAuth: () => void;
}

export function useElectronAuth(): UseElectronAuthReturn {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<OAuthProviderName | null>(
    null
  );

  const handleElectronOAuth = async (
    provider: OAuthProviderName
  ): Promise<void> => {
    setLoading(true);
    setOauthProvider(provider);

    try {
      const result = await startElectronOAuth(provider);

      // 사용자가 인증 창을 닫으면 cancellation, 정상 종료 흐름
      if ("cancelled" in result) {
        return;
      }

      const response = await apiPost<any>("/auth/loginCheck", {
        code: result.code,
        state: result.state
      });

      // 신규 사용자 체크 — main 의 useOAuthCallback 과 동일한 oauth_new_user key
      if (response?.isNewUser && response?.oauthUser) {
        sessionStorage.setItem(
          "oauth_new_user",
          JSON.stringify(response.oauthUser)
        );

        navigate("/auth/user-type", { replace: true });
        return;
      }

      if (!response?.loginInfo) {
        logger.error("응답 구조 오류:", {
          hasLoginInfo: !!response?.loginInfo,
          response
        });
        throw new Error("로그인 정보 처리에 실패했습니다.");
      }

      // main 의 쿠키 기반 인증 모델 — token 별도 저장 없음, set-cookie 가 backend 에서 발급됨
      useAuthStore.getState().setAuthenticated(response.loginInfo);

      sessionStorage.setItem(
        "login_success",
        JSON.stringify({
          type: "oauth",
          method: `${provider} 로그인`,
          timestamp: Date.now()
        })
      );
      sessionStorage.setItem("is_initial_login", "true");

      navigate("/chat");
    } catch (error) {
      logger.error("Electron OAuth 실패:", error);
      throw error;
    } finally {
      setLoading(false);
      setOauthProvider(null);
    }
  };

  const cancelOAuth = () => {
    cancelElectronOAuth();
    setLoading(false);
    setOauthProvider(null);
  };

  return {
    isElectronEnv: isElectron(),
    loading,
    oauthProvider,
    handleElectronOAuth,
    cancelOAuth
  };
}
