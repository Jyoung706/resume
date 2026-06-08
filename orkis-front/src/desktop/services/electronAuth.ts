import type { OAuthProviderName } from "@/logic/common/auth/types/auth";
import { apiPost } from "@/logic/shared/services/request";

type ElectronOAuthResult =
  | { code: string; state?: string }
  | { cancelled: true };

const REDIRECT_URI = "http://localhost:5173/auth/callback";

function generateState(provider: string): string {
  return `${provider}_${Date.now()}_${Math.random().toString(36).substring(2)}`;
}

async function getOAuthUrlFromBackend(
  provider: OAuthProviderName,
  state: string
): Promise<string> {
  const response = await apiPost<{ url: string }>(
    "/auth/oauthToken",
    {
      type: provider,
      state: state
    },
    {
      skipAuth: true
    }
  );

  if (!response?.url) {
    throw new Error("OAuth URL을 받지 못했습니다.");
  }

  return response.url;
}

export async function startElectronOAuth(
  provider: OAuthProviderName
): Promise<ElectronOAuthResult> {
  if (!window.electronAPI?.auth) {
    throw new Error("Electron API not available");
  }

  const state = generateState(provider);
  const authUrl = await getOAuthUrlFromBackend(provider, state);

  return window.electronAPI.auth.startOAuth({
    authUrl,
    redirectUrl: REDIRECT_URI
  });
}

export function cancelElectronOAuth(): void {
  window.electronAPI?.auth?.cancelOAuth();
}

/**
 * Electron Main 프로세스의 Backend 쿠키 저장소를 비운다.
 * 웹 환경에서는 no-op.
 */
export async function clearElectronSession(): Promise<void> {
  try {
    await window.electronAPI?.auth?.clearSession?.();
  } catch {
    // 쿠키 정리 실패해도 로그아웃 흐름은 계속 진행
  }
}
