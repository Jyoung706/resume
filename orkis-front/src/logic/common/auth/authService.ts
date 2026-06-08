/**
 * 인증 서비스 (싱글톤)
 * orkis-front의 authService 이식 — 간소화 버전
 * AuthStore와 API 서비스를 브릿지
 */
import type { LoginRequest } from "@/logic/common/auth/types/auth";
import { useAuthStore } from "@/logic/common/auth/authStore";
import { apiPost } from "@/logic/shared/services/request";
import { getLogger } from "@/logic/shared/utils/logger";

const logger = getLogger("AuthService");

class AuthService {
  /**
   * 일반 로그인
   */
  async login(credentials: LoginRequest): Promise<void> {
    const { username, password } = credentials;
    const store = useAuthStore.getState();

    try {
      // authStore.login 호출 (내부에서 API 호출 + 상태 업데이트)
      await store.login(username, password);
    } catch (error) {
      logger.error("Login failed", error);
      throw error;
    }
  }

  /**
   * OAuth 리다이렉트 로그인
   * window.location.href 이후 Promise가 resolve되지 않도록 하여
   * 호출부(useLogin)의 onSuccess/setLoading 등 후속 코드 실행을 차단한다.
   */
  async loginWithOAuthRedirect(provider: string): Promise<void> {
    const store = useAuthStore.getState();
    store.setOAuthProcessing(true);

    try {
      const response = await apiPost<{ url: string }>("/auth/oauthToken", {
        type: provider,
      });
      if (response?.url) {
        window.location.href = response.url;
        // 페이지가 이동하므로 이후 코드가 실행되지 않도록 대기
        await new Promise<never>(() => {});
      }
    } catch (error) {
      store.setOAuthProcessing(false);
      logger.error(`OAuth login failed: ${provider}`, error);
      throw error;
    }
  }

  /**
   * 로그아웃
   */
  logout(): void {
    useAuthStore.getState().logout();
  }

  /**
   * 현재 인증 상태
   */
  get isAuthenticated(): boolean {
    return useAuthStore.getState().isAuthenticated;
  }
}

// 싱글톤 인스턴스
export const authService = new AuthService();
