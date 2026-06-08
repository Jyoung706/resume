/**
 * 인증 상태 스토어 (Zustand, Phase 2 — 쿠키 기반 인증)
 * token/tokenExpiry 삭제 — 서버 HttpOnly 쿠키로 관리
 * checkAuth() 추가 — GET /auth/me로 인증 상태 확인
 */
import { create } from "zustand";
import type { User, UserType } from "@/logic/common/auth/types/auth";
import { apiGet, apiPost } from "@/logic/shared/services/request";
import { useChatMessageStore } from "@/logic/common/chat/stores/chatMessageStore";
import { useChatSessionStore } from "@/logic/common/chat/stores/chatSessionStore";
import { streamManager } from "@/logic/common/chat/services/streamManager";
import { useQuestionCountStore } from "@/logic/common/chat/stores/questionCountStore";
import { useBackgroundImageStore } from "@/logic/common/background/backgroundImageStore";
import { useProfileImageStore } from "@/logic/common/profile/profileImageStore";
import { useGradeStore } from "@/logic/common/grade/gradeStore";
import {
  useSettingsStore,
  SETTINGS_SECTION
} from "@/logic/common/ui/settingsStore";
import { useChatRoomStateStore } from "@/logic/common/chat/stores/chatRoomStateStore";
import { useInputMenuStore } from "@/logic/common/chat/stores/inputMenuStore";
import { useDbSelectionStore } from "@/logic/common/db/dbSelectionStore";
import { useLlmModelStore } from "@/logic/common/llm/llmModelStore";
import { useRagPollingStore } from "@/logic/common/rag/ragPollingStore";
import { useKeywordSelectionStore } from "@/logic/common/chat/stores/keywordSelectionStore";
import { useSchemaSelectionStore } from "@/logic/common/chat/stores/schemaSelectionStore";
import { useRightSidebarStore } from "@/logic/common/ui/rightSidebarStore";
import { useHealthStatusStore } from "@/logic/common/health/healthStatusStore";
import { clearAllUserData } from "@/logic/shared/utils/tokenUtils";
import { authChannel } from "./authChannel";

// --- AUTH_CODE → UserType 변환 (백엔드 AuthConstants.ts 기준) ---

const authCodeToUserType = (code?: string): UserType => {
  if (code === "3") return "admin";
  if (code === "2") return "pro";
  return "free";
};

// --- 사용자 필드 매핑 헬퍼 ---

const mapUser = (user: Record<string, unknown>): User =>
  ({
    ...user,
    name: (user.USER_NAME || user.NAME || user.name) as string,
    email: (user.USER_EMAIL || user.EMAIL || user.email) as string,
    id: (user.USER_ID || user.ID || user.id) as string,
    profileImage: (user.PROFILE_IMAGE || user.profileImage || null) as
      | string
      | null,
    backgroundImage: (user.BACKGROUND_IMAGE ||
      user.backgroundImage ||
      null) as string | null,
    userType: (user.USER_TYPE ||
      user.userType ||
      authCodeToUserType(user.AUTH_CODE as string | undefined)) as UserType
  }) as User;

// --- 스토어 인터페이스 ---

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  oauthProcessing: boolean;

  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: (broadcast?: boolean) => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
  reset: () => void;
  setAuthenticated: (loginInfo: Record<string, unknown>) => void;
  setOAuthProcessing: (processing: boolean) => void;
}

// --- 스토어 생성 ---

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  oauthProcessing: false,

  setAuthenticated: (loginInfo: Record<string, unknown>) => {
    const userObj = (loginInfo?.user || loginInfo) as Record<string, unknown>;
    if (!userObj) {
      clearAllUserData();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });
      return;
    }

    set({
      user: mapUser(userObj),
      isAuthenticated: true,
      isLoading: false,
      error: null
    });

    // 다른 탭에 로그인 알림
    authChannel.postMessage({ type: "login" });

    // 이미지 프리로드 (로그인 직후 즉시 시작 → AuthGuard에서 대기)
    useProfileImageStore.getState().fetchImage();
    useBackgroundImageStore.getState().fetchImage();
  },

  setOAuthProcessing: (processing: boolean) =>
    set({ oauthProcessing: processing }),

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiPost<{
        token: string;
        loginInfo: Record<string, unknown>;
      }>("/auth/login", { username, password });

      if (response?.loginInfo) {
        const userObj = (response.loginInfo.user ||
          response.loginInfo) as Record<string, unknown>;
        if (userObj) {
          set({
            user: mapUser(userObj),
            isAuthenticated: true,
            isLoading: false,
            error: null
          });

          // 다른 탭에 로그인 알림
          authChannel.postMessage({ type: "login" });

          // 이미지 프리로드
          useProfileImageStore.getState().fetchImage();
          useBackgroundImageStore.getState().fetchImage();
        }
      }
      set({ isLoading: false });
    } catch (error: unknown) {
      set({
        isLoading: false,
        error: (error as Error)?.message || "로그인에 실패했습니다."
      });
      throw error;
    }
  },

  logout: () => {
    const state = get();
    if (!state.isAuthenticated) return;

    // 다른 탭에 로그아웃 알림 (BroadcastChannel — 보낸 탭에서는 이벤트 미발생)
    authChannel.postMessage({ type: "logout" });

    // 백엔드 로그아웃 (세션 파기 + 쿠키 삭제)
    apiPost("/auth/logout", {}).catch(() => {});

    // 채팅 관련 스토어 정리
    streamManager.cancelAll();
    useChatSessionStore.getState().reset();
    useChatMessageStore.getState().reset();
    useQuestionCountStore.getState().reset();
    useBackgroundImageStore.getState().reset();
    useProfileImageStore.getState().reset();

    // persist 스토어 인메모리 초기화 (localStorage 삭제 전에 수행)
    useGradeStore.getState().resetGrade();
    useSettingsStore.setState({
      expandedSection: SETTINGS_SECTION.USER,
      ragSelectedDbId: null
    });
    useChatRoomStateStore.setState({ drafts: {} });
    useInputMenuStore.setState({ selectedOptions: {} });

    // 사용자 종속 store 전체 reset — 동일 탭 logout→login 시 stale data 차단
    useDbSelectionStore.setState({
      selectedDbConnection: null,
      dbConnections: [],
      ragCompletedDbConnections: [],
      isInitialized: false,
      isLoading: false,
      error: null
    });
    useLlmModelStore.setState({
      models: [],
      selectedModel: null,
      defaultModel: null,
      isInitialized: false,
      loading: false,
      error: null,
      checkResult: null,
      checkLoading: false
    });
    // ragPolling 은 setInterval 타이머도 함께 정리해야 하므로 reset() 사용
    useRagPollingStore.getState().reset();
    useKeywordSelectionStore.getState().reset();
    useSchemaSelectionStore.getState().reset();
    useRightSidebarStore.getState().reset();
    // wire 캐시 + consecutiveFailures 초기화 — 다음 사용자 로그인 시 stale 잔존 차단 (F1/F8)
    useHealthStatusStore.getState().reset();

    clearAllUserData();

    set({
      user: null,
      isAuthenticated: false,
      oauthProcessing: false,
      error: null
    });
  },

  // 쿠키 기반 인증 확인 — 앱 시작 시 호출
  // broadcast: true면 결과를 다른 탭에 알림 (auth_recovered / session_invalid)
  checkAuth: async (broadcast = false) => {
    try {
      const response = await apiGet<{ user: Record<string, unknown> }>(
        "/auth/me",
        {},
        { silent: true }
      );
      if (response?.user) {
        set({
          user: mapUser(response.user),
          isAuthenticated: true,
          isLoading: false
        });

        if (broadcast) {
          authChannel.postMessage({ type: "auth_recovered" });
        }

        // 이미지 프리로드
        useProfileImageStore.getState().fetchImage();
        useBackgroundImageStore.getState().fetchImage();
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
        if (broadcast) {
          authChannel.postMessage({ type: "session_invalid" });
        }
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
      if (broadcast) {
        authChannel.postMessage({ type: "session_invalid" });
      }
    }
  },

  refreshSession: async () => {
    try {
      const response = await apiPost<{
        expiresIn: number;
        loginInfo: Record<string, unknown>;
      }>("/auth/refresh", {}, { silent: true });
      if (response?.loginInfo) {
        const userObj = (response.loginInfo.user ||
          response.loginInfo) as Record<string, unknown>;
        set({ user: mapUser(userObj), isAuthenticated: true });
      }
    } catch {
      // 401 → request.ts의 forceLogout이 "auth:logout" 이벤트로 처리
      // 네트워크 오류 → 다음 주기에서 재시도
    }
  },

  clearError: () => set({ error: null }),

  setUser: (user: User) => {
    set({
      user: mapUser(user as unknown as Record<string, unknown>),
      isAuthenticated: true,
      isLoading: false,
      error: null
    });
  },

  reset: () => {
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      oauthProcessing: false
    });
  }
}));

// --- 파생 셀렉터 ---

export const useUserType = () => useAuthStore((s) => s.user?.userType);
export const useIsUserType = (t: UserType) =>
  useAuthStore((s) => s.user?.userType === t);

// --- auth:logout 이벤트 리스너 초기화 ---

export function initAuthListener(): () => void {
  const logoutHandler = () => {
    const store = useAuthStore.getState();
    if (store.isAuthenticated) {
      store.logout();
    } else {
      clearAllUserData();
      useHealthStatusStore.getState().reset();
    }
  };

  // 이미지 스토어 → authStore 단방향 이벤트 (순환 의존 해소)
  const updateUserHandler = (e: Event) => {
    const detail = (e as CustomEvent).detail as Record<string, unknown>;
    const { user, setUser } = useAuthStore.getState();
    if (user && detail) {
      setUser({ ...user, ...detail } as User);
    }
  };

  // 다른 탭의 로그인/로그아웃 감지 (BroadcastChannel)
  const onChannelMessage = (e: MessageEvent) => {
    if (e.data?.type === "logout") {
      // logout() 대신 상태만 변경 (postMessage 재전송 방지)
      clearAllUserData();
      useHealthStatusStore.getState().reset();
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        oauthProcessing: false,
        error: null
      });
    } else if (e.data?.type === "session_invalid") {
      // 백엔드 장애 등 — 이미 비인증 상태면 무시, 인증 상태일 때만 초기화
      if (useAuthStore.getState().isAuthenticated) {
        useHealthStatusStore.getState().reset();
        useAuthStore.setState({
          user: null,
          isAuthenticated: false,
          oauthProcessing: false,
          error: null
        });
      }
    } else if (e.data?.type === "auth_recovered") {
      // 다른 탭에서 인증 복구됨 — 이미 인증 상태면 무시 (핑퐁 방지)
      const { isAuthenticated, isLoading } = useAuthStore.getState();
      if (!isAuthenticated && !isLoading) {
        window.location.reload();
      }
    } else if (e.data?.type === "login") {
      // 다른 탭에서 명시적 로그인됨 — 새로고침으로 인증 반영
      window.location.reload();
    }
  };
  authChannel.addEventListener("message", onChannelMessage);

  window.addEventListener("auth:logout", logoutHandler as EventListener);
  window.addEventListener(
    "auth:updateUser",
    updateUserHandler as EventListener
  );
  return () => {
    authChannel.removeEventListener("message", onChannelMessage);
    window.removeEventListener("auth:logout", logoutHandler as EventListener);
    window.removeEventListener(
      "auth:updateUser",
      updateUserHandler as EventListener
    );
  };
}
