/**
 * 채팅 메시지 스토어 (Zustand)
 * orkis-front chatMessageStore 이식 — LRU 캐시 포함
 */
import { create } from "zustand";
import { getLogger } from "@/logic/shared/utils/logger";
import { chatService } from "@/logic/common/chat/services/chatService";
import { chatConfig } from "@/logic/shared/config/chatConfig";
import type { ChatMessage, PaginationState } from "@/logic/common/chat/types/chat";

const logger = getLogger("ChatMessageStore");

const MAX_CACHED_SESSIONS = chatConfig.message.lruCacheSize;

// ============================================
// 인터페이스
// ============================================

// [v2.2 Phase 4.7] chatId 단위 cursor 페이지네이션 메타
interface SessionPagination {
  hasOlder: boolean;
  nextCursor: string | null;
  isLoadingOlder: boolean;
  loadError: string | null;
}

interface ChatMessageState {
  messagesBySession: Map<string, ChatMessage[]>;
  selectedSessionId: string | null;
  /** 세션별 로딩 추적 (기존 messagesLoading: boolean 대체) */
  loadingSessionIds: Set<string>;
  messagesError: string | null;
  messagesPagination: PaginationState;

  // 날짜별 메시지 관리
  availableDatesBySession: Map<string, string[]>;
  loadedDatesBySession: Map<string, Set<string>>;
  hasMoreDatesBySession: Map<string, boolean>;

  // [v2.2 Phase 4.7] chatId cursor 기반 lazy-load 페이지네이션 메타
  paginationBySession: Map<string, SessionPagination>;

  // 액션
  loadMessages: (sessionId: string) => Promise<void>;
  loadMessagesByDate: (sessionId: string, date: string) => Promise<void>;
  loadAvailableDates: (sessionId: string) => Promise<string[]>;
  addMessage: (message: ChatMessage, targetSessionId?: string) => void;
  updateMessage: (messageId: string, updates: Partial<ChatMessage>, targetSessionId?: string) => void;
  selectSession: (sessionId: string) => void;
  getSessionMessages: (sessionId: string) => ChatMessage[];
  clearSessionMessages: (sessionId: string) => void;
  /** 동기적 로딩 마킹 — 이벤트 핸들러에서 호출하여 렌더 이전에 loading 상태 확보 */
  markSessionLoading: (sessionId: string) => void;
  /** 빈 세션 초기화 — 새 채팅 생성 시 API 호출 없이 캐시 등록 */
  initializeEmptySession: (sessionId: string) => void;
  reset: () => void;

  // [v2.2 Phase 4.7] chatId cursor 기반 페이지네이션 액션
  /** 세션 진입 시 최근 N개 chatId 메시지만 빠르게 로드 (cache 미사용) */
  loadMessagesPage: (sessionId: string, limit?: number) => Promise<void>;
  /** "지난 대화 더 보기" — 이전 N개 chatId 메시지 prepend */
  loadOlderMessages: (sessionId: string, limit?: number) => Promise<void>;
  /** 페이지네이션 메타 read */
  getSessionPagination: (sessionId: string) => SessionPagination | undefined;
}

// ============================================
// LRU 캐시 관리
// ============================================

class SessionLRU {
  private order: string[] = [];

  touch(sessionId: string) {
    const idx = this.order.indexOf(sessionId);
    if (idx > -1) this.order.splice(idx, 1);
    this.order.push(sessionId);
  }

  evict(map: Map<string, ChatMessage[]>, maxSize: number): Map<string, ChatMessage[]> {
    if (map.size <= maxSize) return map;
    const newMap = new Map(map);
    while (newMap.size > maxSize && this.order.length > 0) {
      const oldest = this.order.shift();
      if (oldest) newMap.delete(oldest);
    }
    return newMap;
  }

  clear() {
    this.order.length = 0;
  }
}

const sessionLRU = new SessionLRU();

/**
 * API 호출 중인 세션 추적 (스토어 외부 — UI 렌더와 무관)
 * loadingSessionIds(UI 로딩 표시)와 분리하여
 * markSessionLoading의 pre-mark와 loadMessages의 중복 호출 방지가 충돌하지 않게 한다.
 */
const inFlightSessions = new Set<string>();

// ============================================
// 스토어
// ============================================

export const useChatMessageStore = create<ChatMessageState>((set, get) => ({
  messagesBySession: new Map(),
  selectedSessionId: null,
  loadingSessionIds: new Set<string>(),
  messagesError: null,
  messagesPagination: { page: 1, size: 50, totalElements: 0, totalPages: 0 },

  availableDatesBySession: new Map(),
  loadedDatesBySession: new Map(),
  hasMoreDatesBySession: new Map(),

  paginationBySession: new Map(),

  loadMessages: async (sessionId: string) => {
    // API 중복 호출 방지 (inFlightSessions — 스토어 외부)
    // loadingSessionIds는 UI 로딩 표시 전용이므로 가드로 사용하지 않는다.
    if (inFlightSessions.has(sessionId)) return;

    // 캐시 히트 — 빈 배열도 캐시로 인정
    const cached = get().messagesBySession.get(sessionId);
    if (cached !== undefined) {
      sessionLRU.touch(sessionId);
      set({ selectedSessionId: sessionId });
      return;
    }

    inFlightSessions.add(sessionId);

    // 세션별 로딩 시작 (UI 표시용)
    set((state) => ({
      loadingSessionIds: new Set(state.loadingSessionIds).add(sessionId),
      messagesError: null,
      selectedSessionId: sessionId,
    }));

    try {
      const messages = await chatService.getChatMessages(sessionId);

      set((state) => {
        const newMap = new Map(state.messagesBySession);
        newMap.set(sessionId, messages);
        sessionLRU.touch(sessionId);
        const newLoading = new Set(state.loadingSessionIds);
        newLoading.delete(sessionId);
        return {
          messagesBySession: sessionLRU.evict(newMap, MAX_CACHED_SESSIONS),
          loadingSessionIds: newLoading,
        };
      });
    } catch (error) {
      logger.error("loadMessages 실패:", error);
      set((state) => {
        const newLoading = new Set(state.loadingSessionIds);
        newLoading.delete(sessionId);
        return { loadingSessionIds: newLoading, messagesError: "메시지를 불러올 수 없습니다." };
      });
    } finally {
      inFlightSessions.delete(sessionId);
    }
  },

  loadMessagesByDate: async (sessionId: string, date: string) => {
    try {
      const response = await chatService.getMessagesByDate(sessionId, date);

      set((state) => {
        const newMap = new Map(state.messagesBySession);
        const existing = newMap.get(sessionId) || [];
        // 기존 메시지에 날짜별 메시지를 앞에 추가 (중복 제거)
        const existingIds = new Set(existing.map((m) => m.id));
        const newMessages = response.messages.filter((m) => !existingIds.has(m.id));
        newMap.set(sessionId, [...newMessages, ...existing]);

        const newLoaded = new Map(state.loadedDatesBySession);
        const dates = newLoaded.get(sessionId) || new Set<string>();
        dates.add(date);
        newLoaded.set(sessionId, dates);

        return {
          messagesBySession: newMap,
          loadedDatesBySession: newLoaded,
        };
      });
    } catch (error) {
      logger.error("loadMessagesByDate 실패:", error);
    }
  },

  loadAvailableDates: async (sessionId: string) => {
    try {
      const response = await chatService.getMessageDates(sessionId);

      set((state) => {
        const newDates = new Map(state.availableDatesBySession);
        newDates.set(sessionId, response.dates);

        const newHasMore = new Map(state.hasMoreDatesBySession);
        newHasMore.set(sessionId, response.hasMoreDates);

        return {
          availableDatesBySession: newDates,
          hasMoreDatesBySession: newHasMore,
        };
      });

      return response.dates;
    } catch (error) {
      logger.error("loadAvailableDates 실패:", error);
      return [];
    }
  },

  addMessage: (message: ChatMessage, targetSessionId?: string) => {
    const sessionId = targetSessionId || message.sessionId || get().selectedSessionId;
    if (!sessionId) return;

    set((state) => {
      const newMap = new Map(state.messagesBySession);
      const existing = newMap.get(sessionId) || [];
      newMap.set(sessionId, [...existing, message]);
      sessionLRU.touch(sessionId);
      return { messagesBySession: sessionLRU.evict(newMap, MAX_CACHED_SESSIONS) };
    });
  },

  updateMessage: (messageId: string, updates: Partial<ChatMessage>, targetSessionId?: string) => {
    const sessionId = targetSessionId || get().selectedSessionId;
    if (!sessionId) return;

    set((state) => {
      const newMap = new Map(state.messagesBySession);
      const messages = newMap.get(sessionId);
      if (!messages) return state;

      const updated = messages.map((m) =>
        m.id === messageId ? { ...m, ...updates } : m
      );
      newMap.set(sessionId, updated);
      return { messagesBySession: newMap };
    });
  },

  selectSession: (sessionId: string) => {
    set({ selectedSessionId: sessionId });
  },

  getSessionMessages: (sessionId: string) => {
    return get().messagesBySession.get(sessionId) || [];
  },

  clearSessionMessages: (sessionId: string) => {
    set((state) => {
      const newMap = new Map(state.messagesBySession);
      newMap.delete(sessionId);
      return { messagesBySession: newMap };
    });
  },

  markSessionLoading: (sessionId: string) => {
    // 이미 캐시되어 있으면 마킹 불필요
    if (get().messagesBySession.has(sessionId)) return;
    set((state) => ({
      loadingSessionIds: new Set(state.loadingSessionIds).add(sessionId),
    }));
  },

  initializeEmptySession: (sessionId: string) => {
    set((state) => {
      const newMap = new Map(state.messagesBySession);
      if (!newMap.has(sessionId)) {
        newMap.set(sessionId, []);
      }
      return { messagesBySession: newMap };
    });
  },

  reset: () => {
    sessionLRU.clear();
    set({
      messagesBySession: new Map(),
      selectedSessionId: null,
      loadingSessionIds: new Set<string>(),
      messagesError: null,
      messagesPagination: { page: 1, size: 50, totalElements: 0, totalPages: 0 },
      availableDatesBySession: new Map(),
      loadedDatesBySession: new Map(),
      hasMoreDatesBySession: new Map(),
      paginationBySession: new Map(),
    });
  },

  // ============================================
  // [v2.2 Phase 4.7] chatId cursor 기반 페이지네이션 액션
  // ============================================

  loadMessagesPage: async (sessionId: string, limit: number = 30) => {
    if (inFlightSessions.has(sessionId)) return;

    // [v2.2 Phase 4.7] 캐시 히트 — Frontend session-lifetime 캐시 보존.
    // 이미 로드된 세션이면 messagesBySession 도 paginationBySession 도 그대로 유지.
    // (사용자가 "더 보기" 로 90 messages 까지 로드한 상태에서 다른 세션 갔다가
    //  돌아와도 그 90 messages + 페이지네이션 상태 보존)
    // Backend 캐시는 Phase 4.7 D13 으로 완전 제거되어 있으므로 매 API 호출은 fresh.
    const cached = get().messagesBySession.get(sessionId);
    if (cached !== undefined) {
      sessionLRU.touch(sessionId);
      set({ selectedSessionId: sessionId });
      return;
    }

    inFlightSessions.add(sessionId);

    set((state) => ({
      loadingSessionIds: new Set(state.loadingSessionIds).add(sessionId),
      messagesError: null,
      selectedSessionId: sessionId,
    }));

    try {
      const result = await chatService.getChatMessagesPage(sessionId, { limit });

      // [HIGH-N1] inProgress dedup: page messages 안에 inProgress chatId가 있으면 무시
      const messageChatIds = new Set(
        result.messages
          .map((m) => (m as unknown as { metadata?: { chatId?: string } }).metadata?.chatId)
          .filter(Boolean)
      );
      const effectiveInProgress = result.inProgress.filter(
        (ip) => !messageChatIds.has(ip.chatId)
      );

      // inProgress 메시지를 messages 끝에 append (newest 위치)
      const inProgressMessages: ChatMessage[] = [];
      for (const ip of effectiveInProgress) {
        inProgressMessages.push(ip.user);
        if (ip.assistant) inProgressMessages.push(ip.assistant);
      }
      const allMessages = [...result.messages, ...inProgressMessages];

      set((state) => {
        const newMap = new Map(state.messagesBySession);
        newMap.set(sessionId, allMessages);
        sessionLRU.touch(sessionId);
        const newLoading = new Set(state.loadingSessionIds);
        newLoading.delete(sessionId);
        const newPaging = new Map(state.paginationBySession);
        newPaging.set(sessionId, {
          hasOlder: result.pageInfo.hasOlder,
          nextCursor: result.pageInfo.nextCursor,
          isLoadingOlder: false,
          loadError: null,
        });
        return {
          messagesBySession: sessionLRU.evict(newMap, MAX_CACHED_SESSIONS),
          loadingSessionIds: newLoading,
          paginationBySession: newPaging,
        };
      });
    } catch (error) {
      logger.error("loadMessagesPage 실패:", error);
      set((state) => {
        const newLoading = new Set(state.loadingSessionIds);
        newLoading.delete(sessionId);
        return { loadingSessionIds: newLoading, messagesError: "메시지를 불러올 수 없습니다." };
      });
    } finally {
      inFlightSessions.delete(sessionId);
    }
  },

  loadOlderMessages: async (sessionId: string, limit: number = 30) => {
    const paging = get().paginationBySession.get(sessionId);
    if (!paging || !paging.hasOlder || paging.isLoadingOlder) return;
    if (!paging.nextCursor) return;

    // 로딩 시작
    set((state) => {
      const newPaging = new Map(state.paginationBySession);
      newPaging.set(sessionId, { ...paging, isLoadingOlder: true, loadError: null });
      return { paginationBySession: newPaging };
    });

    try {
      const result = await chatService.getChatMessagesPage(sessionId, {
        limit,
        cursor: paging.nextCursor!,
      });

      // [HIGH#3] dedup: 기존 메시지 id set 으로 prepend 전 filter
      const existing = get().messagesBySession.get(sessionId) || [];
      const existingIds = new Set(existing.map((m) => m.id));
      const dedupedOlder = result.messages.filter((m) => !existingIds.has(m.id));

      set((state) => {
        const newMap = new Map(state.messagesBySession);
        newMap.set(sessionId, [...dedupedOlder, ...existing]);
        const newPaging = new Map(state.paginationBySession);
        newPaging.set(sessionId, {
          hasOlder: result.pageInfo.hasOlder,
          nextCursor: result.pageInfo.nextCursor,
          isLoadingOlder: false,
          loadError: null,
        });
        return {
          messagesBySession: newMap,
          paginationBySession: newPaging,
        };
      });
    } catch (error) {
      logger.error("loadOlderMessages 실패:", error);
      set((state) => {
        const cur = state.paginationBySession.get(sessionId);
        if (!cur) return state;
        const newPaging = new Map(state.paginationBySession);
        newPaging.set(sessionId, {
          ...cur,
          isLoadingOlder: false,
          loadError: "지난 대화를 불러올 수 없습니다.",
        });
        return { paginationBySession: newPaging };
      });
    }
  },

  getSessionPagination: (sessionId: string) => {
    return get().paginationBySession.get(sessionId);
  },
}));
