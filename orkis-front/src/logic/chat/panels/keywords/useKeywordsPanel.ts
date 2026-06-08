/**
 * useKeywordsPanel — 키워드 패널 전용 비즈니스 로직 훅
 *
 * 책임:
 * - 전체 키워드 목록 API 로드
 * - 검색 필터링 (실시간)
 * - 키워드 선택/해제 (keywordSelectionStore 연동)
 * - 즐겨찾기 토글 (낙관적 업데이트 + 롤백)
 * - Enter Quick Add (store 임시 추가, API 미호출)
 * - Keyword → KeywordData 매핑
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { keywordService } from "@/logic/common/chat/services/keywordService";
import {
  useKeywordSelectionStore,
  useSelectedKeywords
} from "@/logic/common/chat/stores/keywordSelectionStore";
import type { Keyword } from "@/logic/common/chat/types/recommendation";
import type { KeywordData } from "@/pages/chat/panels/keywords/KeywordSection";
import { showToast } from "@/logic/shared/utils/toast";
import { getLogger } from "@/logic/shared/utils/logger";

const logger = getLogger("useKeywordsPanel");

/** Keyword(API) → KeywordData(Design) 변환 */
const toKeywordData = (k: Keyword): KeywordData => ({
  id: k.id,
  text: k.text,
  isFavorite: k.isFavorite
});

export function useKeywordsPanel(sessionId: string | null) {
  // ── 전체 키워드 로드 ──
  const [allKeywords, setAllKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchKeywords = useCallback(async () => {
    try {
      setLoading(true);
      const response = await keywordService.getKeywords({ limit: 200 });
      setAllKeywords(response.keywords);
    } catch (error) {
      logger.error("키워드 목록 로드 실패", error);
      setAllKeywords([]);
      showToast("키워드 목록을 불러오지 못했습니다.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeywords();
  }, [fetchKeywords]);

  // ── Store 연동 ──
  const store = useKeywordSelectionStore();
  const selectedFromStore = useSelectedKeywords(sessionId);

  // ── selectedKeywords: store 선택 → KeywordData 매핑 ──
  const selectedKeywords: KeywordData[] = useMemo(() => {
    return selectedFromStore.map((sk) => {
      const full = allKeywords.find((k) => k.id === sk.id);
      return full
        ? toKeywordData(full)
        : { id: sk.id, text: sk.name, isFavorite: false };
    });
  }, [selectedFromStore, allKeywords]);

  // ── 필터링: 검색어 + 선택 제외 + 즐겨찾기 우선 정렬 ──
  const filteredKeywords: KeywordData[] = useMemo(() => {
    const selectedIds = new Set(selectedFromStore.map((k) => k.id));
    return allKeywords
      .filter((k) => !selectedIds.has(k.id))
      .filter(
        (k) =>
          !searchTerm ||
          k.text.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0))
      .map(toKeywordData);
  }, [allKeywords, selectedFromStore, searchTerm]);

  // ── Quick Add (Enter) — store 임시 추가, API 미호출 ──
  const onQuickAddKeyword = useCallback(
    (text: string) => {
      if (!sessionId || !text.trim()) return;
      const trimmed = text.trim().slice(0, 100);
      // 중복 검사 (대소문자 무시)
      const exists = selectedFromStore.some(
        (k) => k.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (exists) return;
      store.addKeyword(sessionId, {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: trimmed
      });
      setSearchTerm("");
    },
    [sessionId, selectedFromStore, store]
  );

  // ── 키워드 선택/해제 ──
  const onToggleKeyword = useCallback(
    (id: string) => {
      if (!sessionId) return;
      if (store.isKeywordSelected(sessionId, id)) {
        store.removeKeyword(sessionId, id);
      } else {
        const kw = allKeywords.find((k) => k.id === id);
        if (kw) store.addKeyword(sessionId, { id: kw.id, name: kw.text });
      }
    },
    [sessionId, allKeywords, store]
  );

  // ── 키워드 삭제 (선택 해제) ──
  const onRemoveKeyword = useCallback(
    (id: string) => {
      if (sessionId) store.removeKeyword(sessionId, id);
    },
    [sessionId, store]
  );

  // ── 즐겨찾기 토글 (낙관적 업데이트 + 롤백) ──
  const onToggleFavorite = useCallback(
    async (id: string) => {
      const keyword = allKeywords.find((k) => k.id === id);
      if (!keyword) return;
      const prev = keyword.isFavorite;

      // 낙관적 업데이트
      setAllKeywords((ks) =>
        ks.map((k) => (k.id === id ? { ...k, isFavorite: !prev } : k))
      );

      try {
        const result = await keywordService.toggleFavorite(id);
        if (result.isFavorite !== !prev) {
          setAllKeywords((ks) =>
            ks.map((k) =>
              k.id === id ? { ...k, isFavorite: result.isFavorite } : k
            )
          );
        }
      } catch {
        // 롤백
        setAllKeywords((ks) =>
          ks.map((k) => (k.id === id ? { ...k, isFavorite: prev } : k))
        );
        showToast("즐겨찾기 변경에 실패했습니다.", "error");
      }
    },
    [allKeywords]
  );

  return {
    keywords: filteredKeywords,
    selectedKeywords,
    searchTerm,
    knowledgeBase: "금융 / 자금세탁방지",
    loading,
    onSearch: setSearchTerm,
    onQuickAddKeyword,
    onToggleKeyword,
    onToggleFavorite,
    onRemoveKeyword,
    refreshKeywords: fetchKeywords
  };
}
