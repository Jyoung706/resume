declare global {
  type ElectronOAuthResponse =
    | { code: string; state?: string }
    | { cancelled: true };

  interface ElectronAuthApi {
    startOAuth: (params: { authUrl: string; redirectUrl: string }) => Promise<ElectronOAuthResponse>;

    cancelOAuth: () => Promise<void>;

    /**
     * Electron Main 프로세스의 Chromium 쿠키 스토어에서 Backend 쿠키를 전부 비운다.
     * 로그아웃 시 호출하여 다음 API 요청에 이전 세션 쿠키가 포함되지 않도록 한다.
     * 웹 환경에서는 undefined이므로 호출 측은 optional chaining을 사용할 것.
     */
    clearSession: () => Promise<void>;
  }

  type ServiceName = "backend" | "ai";
  type ServiceStatus = "starting" | "healthy" | "unhealthy" | "down";

  interface ServiceStatusEvent {
    name: ServiceName;
    status: ServiceStatus;
  }

  interface ElectronHealthApi {
    /**
     * 메인 프로세스의 service:status IPC 를 구독한다.
     * 반환값은 unsubscribe 함수. 웹 환경에선 undefined.
     */
    subscribe: (callback: (event: ServiceStatusEvent) => void) => () => void;
  }

  interface ElectronAPI {
    platform: string;
    auth: ElectronAuthApi;
    health: ElectronHealthApi;
    /**
     * 메인 프로세스의 `app:ready` IPC 를 구독한다.
     * preload 레벨에서 캐싱하므로 React 마운트 전에 도착해도 유실되지 않음.
     */
    onAppReady: (callback: () => void) => void;
  }

  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
