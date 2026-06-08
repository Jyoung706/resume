/**
 * 채팅 세션 스토어 (Zustand + persist)
 * orkis-front chatSessionStore 이식
 *
 * persist 대상: chatItems, selectedChatId, maxDisplayCount
 * 새로고침 후에도 더보기 상태, 선택된 채팅, 목록이 복원됨
 */
import { chatConfig } from "@/logic/shared/config/chatConfig";
import { chatService } from "@/logic/common/chat/services/chatService";
import { useChatMessageStore } from "@/logic/common/chat/stores/chatMessageStore";
import type {
  ChatItem,
  ChatSession
} from "@/logic/common/chat/types/chat";
import { getLogger } from "@/logic/shared/utils/logger";
import { create } from "zustand";
import { persist } from "zustand/middleware";

const logger = getLogger("ChatSessionStore");

const PERSIST_KEY = "chatSessionStore";
const PAGE_SIZE = 10;

// ============================================
// 인터페이스
// ============================================

interface ChatSessionState {
  chatItems: ChatItem[];
  selectedChatId: string | null;
  maxDisplayCount: number;
  isLoading: boolean;
  isCreatingChat: boolean;
  error: string | null;
  sessionsLoaded: boolean;

  // 액션
  loadChatList: (isInitialLogin?: boolean) => Promise<void>;
  /** 더보기 — 클라이언트 전용 (maxDisplayCount += PAGE_SIZE) */
  loadMore: () => void;
  createNewChat: (title?: string) => Promise<ChatItem | null>;
  selectChat: (chatId: string) => void;
  toggleFavorite: (chatId: string) => Promise<void>;
  updateChatTitle: (chatId: string, title: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  updateSessionUpdatedAt: (chatId: string) => void;
  reset: () => void;
  setCreatingChatComplete: () => void;
  clearError: () => void;
}

// ============================================
// 헬퍼
// ============================================

const sessionToChatItem = (
  session: ChatSession,
  selected: boolean = false
): ChatItem => ({
  id: session.sessionId,
  title: session.title,
  selected,
  favorite: session.isFavorite ?? false,
  sessionId: session.sessionId,
  updatedAt: session.updatedAt,
  titleModified: session.titleModified
});

// ============================================
// 스토어
// ============================================

export const useChatSessionStore = create<ChatSessionState>()(
  persist(
    (set, get) => ({
  chatItems: [],
  selectedChatId: null,
  maxDisplayCount: PAGE_SIZE,
  isLoading: false,
  isCreatingChat: false,
  error: null,
  sessionsLoaded: false,

  loadChatList: async (isInitialLogin?: boolean) => {
    if (get().isLoading) return;

    // 초기 로그인 시 persist 데이터 정리
    if (isInitialLogin) {
      localStorage.removeItem(PERSIST_KEY);
      set({ maxDisplayCount: PAGE_SIZE });
    }

    set({ isLoading: true, error: null });

    try {
      const response = await chatService.getChatSessions();
      const items = response.sessions.map((s) => sessionToChatItem(s));

      // 즐겨찾기 상단 정렬
      items.sort((a, b) => {
        if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
        return 0;
      });

      const currentSelectedId = get().selectedChatId;
      if (currentSelectedId) {
        const found = items.find((item) => item.id === currentSelectedId);
        if (found) found.selected = true;
      }

      set({
        chatItems: items,
        isLoading: false,
        sessionsLoaded: true
      });

      // 세션 0개 → 자동 생성
      if (items.length === 0 && chatConfig.session.autoCreateOnEmpty) {
        await get().createNewChat();
        return;
      }

      // 선택된 세션 없으면 첫 번째 자동 선택
      if (
        !get().selectedChatId &&
        items.length > 0 &&
        chatConfig.session.autoSelectFirst
      ) {
        get().selectChat(items[0].id);
      }

      if (isInitialLogin) {
        logger.info("초기 로그인 — 세션 목록 로드 완료");
      }
    } catch (error) {
      logger.error("loadChatList 실패:", error);
      set({ isLoading: false, error: "채팅 목록을 불러올 수 없습니다." });
    }
  },

  // 클라이언트 전용 — API 호출 없음
  loadMore: () => {
    set((state) => ({
      maxDisplayCount: state.maxDisplayCount + PAGE_SIZE
    }));
  },

  createNewChat: async (title?: string) => {
    if (get().isCreatingChat) return null;

    // 최대 개수 제한
    if (get().chatItems.length >= chatConfig.session.maxCount) {
      set({
        error: `채팅은 최대 ${chatConfig.session.maxCount}개까지 생성할 수 있습니다.`
      });
      return null;
    }

    set({ isCreatingChat: true, error: null });

    try {
      const session = await chatService.createChatSession(title);
      const newItem = sessionToChatItem(session, true);

      // 빈 세션을 selectedChatId 설정 이전에 초기화
      // → loadMessages 캐시 히트로 불필요한 API 호출 방지
      useChatMessageStore.getState().initializeEmptySession(newItem.id);

      set((state) => {
        // 중복 방어: 동일 ID가 이미 존재하면 추가하지 않음
        if (state.chatItems.some((i) => i.id === newItem.id)) {
          return {};
        }

        // 새 채팅이 더보기 범위 밖이면 maxDisplayCount 조정
        const newMaxDisplay =
          state.chatItems.length >= state.maxDisplayCount
            ? state.maxDisplayCount + 1
            : state.maxDisplayCount;

        return {
          chatItems: [
            newItem,
            ...state.chatItems.map((i) => ({ ...i, selected: false }))
          ],
          selectedChatId: newItem.id,
          maxDisplayCount: newMaxDisplay
          // isCreatingChat: 호출자가 setCreatingChatComplete()로 해제
        };
      });

      return newItem;
    } catch (error) {
      logger.error("createNewChat 실패:", error);
      set({ isCreatingChat: false, error: "채팅 생성에 실패했습니다." });
      return null;
    }
  },

  selectChat: (chatId: string) => {
    // 렌더 이전에 loading 마킹 — Welcome flash 방지
    useChatMessageStore.getState().markSessionLoading(chatId);
    set((state) => ({
      selectedChatId: chatId,
      chatItems: state.chatItems.map((item) => ({
        ...item,
        selected: item.id === chatId
      }))
    }));
  },

  toggleFavorite: async (chatId: string) => {
    const item = get().chatItems.find((i) => i.id === chatId);
    if (!item) return;

    const newFavorite = !item.favorite;

    // 낙관적 업데이트
    set((state) => ({
      chatItems: state.chatItems.map((i) =>
        i.id === chatId ? { ...i, favorite: newFavorite } : i
      )
    }));

    try {
      await chatService.toggleFavorite(chatId, newFavorite);
    } catch (error) {
      // 롤백
      set((state) => ({
        chatItems: state.chatItems.map((i) =>
          i.id === chatId ? { ...i, favorite: !newFavorite } : i
        )
      }));
      logger.error("toggleFavorite 실패:", error);
    }
  },

  updateChatTitle: async (chatId: string, title: string) => {
    // 낙관적 업데이트
    set((state) => ({
      chatItems: state.chatItems.map((i) =>
        i.id === chatId ? { ...i, title, titleModified: true } : i
      )
    }));

    try {
      await chatService.updateSessionTitle(chatId, title);
    } catch (error) {
      logger.error("updateChatTitle 실패:", error);
    }
  },

  deleteChat: async (chatId: string) => {
    try {
      await chatService.deleteSession(chatId);

      const prevItems = get().chatItems;
      const deletedIdx = prevItems.findIndex((i) => i.id === chatId);
      const wasSelected = get().selectedChatId === chatId;

      set((state) => {
        const newItems = state.chatItems.filter((i) => i.id !== chatId);
        let nextSelectedId = state.selectedChatId;

        if (wasSelected && newItems.length > 0) {
          // 인접 항목 선택: 같은 인덱스 또는 이전
          const nextIdx = Math.min(deletedIdx, newItems.length - 1);
          nextSelectedId = newItems[nextIdx].id;
        } else if (newItems.length === 0) {
          nextSelectedId = null;
        }

        return { chatItems: newItems, selectedChatId: nextSelectedId };
      });

      // 메시지 캐시 정리
      useChatMessageStore.getState().clearSessionMessages(chatId);

      // 목록 비면 자동 생성
      if (get().chatItems.length === 0) {
        await get().createNewChat();
      }
    } catch (error) {
      logger.error("deleteChat 실패:", error);
      set({ error: "채팅 삭제에 실패했습니다." });
    }
  },

  updateSessionUpdatedAt: (chatId: string) => {
    set((state) => {
      const newItems = state.chatItems.map((item) =>
        item.id === chatId
          ? { ...item, updatedAt: new Date().toISOString() }
          : item
      );
      // 즐겨찾기 그룹 내 최신순 재정렬
      newItems.sort((a, b) => {
        if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
        if (a.updatedAt && b.updatedAt)
          return b.updatedAt.localeCompare(a.updatedAt);
        return 0;
      });
      return { chatItems: newItems };
    });
  },

  reset: () => {
    set({
      chatItems: [],
      selectedChatId: null,
      maxDisplayCount: PAGE_SIZE,
      isLoading: false,
      isCreatingChat: false,
      error: null,
      sessionsLoaded: false
    });
  },

  setCreatingChatComplete: () => set({ isCreatingChat: false }),
  clearError: () => set({ error: null })
    }),
    {
      name: PERSIST_KEY,
      partialize: (state) => ({
        chatItems: state.chatItems,
        selectedChatId: state.selectedChatId,
        maxDisplayCount: state.maxDisplayCount
      })
    }
  )
);

// 셀렉터
export const useSelectedChatId = () =>
  useChatSessionStore((state) => state.selectedChatId);
