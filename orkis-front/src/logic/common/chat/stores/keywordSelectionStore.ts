import { create } from "zustand";
import type { SelectedKeyword } from "@/logic/common/chat/types/recommendation";

interface KeywordSelectionState {
  selectedKeywords: Map<string, SelectedKeyword[]>;
  addKeyword: (sessionId: string, keyword: SelectedKeyword) => void;
  removeKeyword: (sessionId: string, keywordId: string) => void;
  clearAllKeywords: (sessionId: string) => void;
  getKeywords: (sessionId: string) => SelectedKeyword[];
  isKeywordSelected: (sessionId: string, keywordId: string) => boolean;
  reset: () => void;
}

export const useKeywordSelectionStore = create<KeywordSelectionState>(
  (set, get) => ({
    selectedKeywords: new Map(),

    addKeyword: (sessionId, keyword) => {
      const map = new Map(get().selectedKeywords);
      const list = map.get(sessionId) || [];
      if (list.some((k) => k.id === keyword.id)) return;
      map.set(sessionId, [...list, keyword]);
      set({ selectedKeywords: map });
    },

    removeKeyword: (sessionId, keywordId) => {
      const map = new Map(get().selectedKeywords);
      const list = (map.get(sessionId) || []).filter(
        (k) => k.id !== keywordId
      );
      if (list.length === 0) map.delete(sessionId);
      else map.set(sessionId, list);
      set({ selectedKeywords: map });
    },

    clearAllKeywords: (sessionId) => {
      const map = new Map(get().selectedKeywords);
      map.delete(sessionId);
      set({ selectedKeywords: map });
    },

    getKeywords: (sessionId) => get().selectedKeywords.get(sessionId) || [],

    isKeywordSelected: (sessionId, keywordId) =>
      (get().selectedKeywords.get(sessionId) || []).some(
        (k) => k.id === keywordId
      ),

    reset: () => set({ selectedKeywords: new Map() })
  })
);

// 선택자 훅
const emptyArray: SelectedKeyword[] = [];
export const useSelectedKeywords = (sessionId: string | null) =>
  useKeywordSelectionStore((s) =>
    sessionId
      ? s.selectedKeywords.get(sessionId) || emptyArray
      : emptyArray
  );

/** 키워드가 1개 이상 선택되었는지 여부 (boolean만 반환 → 배열 변경 시 불필요 리렌더 방지) */
export const useHasSelectedKeywords = (sessionId: string | null) =>
  useKeywordSelectionStore((s) =>
    sessionId
      ? (s.selectedKeywords.get(sessionId)?.length ?? 0) > 0
      : false
  );
