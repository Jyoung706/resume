/**
 * chatRoomStateStore — 채팅방별 UI 상태 외부화
 * Activity 퇴출(LRU) 시 폴백용 + 새로고침 시 draft 복원
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ChatRoomStateStore {
  /** 채팅방별 입력 초안 */
  drafts: Record<string, string>;
  saveDraft: (sessionId: string, text: string) => void;
  getDraft: (sessionId: string) => string;
  deleteDraft: (sessionId: string) => void;
}

export const useChatRoomStateStore = create<ChatRoomStateStore>()(
  persist(
    (set, get) => ({
      drafts: {},
      saveDraft: (sessionId, text) =>
        set((state) => ({
          drafts: { ...state.drafts, [sessionId]: text },
        })),
      getDraft: (sessionId) => get().drafts[sessionId] ?? "",
      deleteDraft: (sessionId) =>
        set((state) => {
          const { [sessionId]: _, ...rest } = state.drafts;
          return { drafts: rest };
        }),
    }),
    {
      name: "chatRoomStateStore",
      version: 2,
      // PR `/chat freeze 해소` 의 scrollPositions 제거 후 기존 사용자 localStorage 잔존 key cleanup
      migrate: (persistedState: unknown, version: number) => {
        if (version < 2 && persistedState && typeof persistedState === "object") {
          const cleaned = { ...(persistedState as Record<string, unknown>) };
          delete cleaned.scrollPositions;
          return cleaned as unknown as ChatRoomStateStore;
        }
        return persistedState as ChatRoomStateStore;
      },
      partialize: (state) => ({ drafts: state.drafts }),
    }
  )
);
