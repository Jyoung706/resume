import { useState, useEffect } from "react";
import { keywordService } from "@/logic/common/chat/services/keywordService";
import { useKeywordSelectionStore } from "@/logic/common/chat/stores/keywordSelectionStore";
import type { Keyword } from "@/logic/common/chat/types/recommendation";
import type { RecommendedKeywordItem } from "@/pages/chat/main/parts";

/**
 * 배열을 Fisher-Yates 알고리즘으로 무작위 셔플한다.
 * 원본 배열을 변경하지 않고 새 배열을 반환한다.
 */
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 추천 키워드 목록 로드 및 선택 상태를 관리하는 훅.
 * 마운트 시 키워드를 API에서 로드하여 즐겨찾기 → 커스텀 → 나머지(셔플) 순으로 정렬하고,
 * keywordSelectionStore를 통해 세션별 키워드 선택/해제 토글을 지원한다.
 * @param sessionId - 현재 채팅 세션 ID (키워드 선택 상태는 세션별로 독립)
 */
export function useRecommendedKeywords(sessionId: string | null) {
  const [rawKeywords, setRawKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);

  // 키워드 목록 로드
  useEffect(() => {
    let cancelled = false;

    keywordService
      .getKeywords({ limit: 100, offset: 0 })
      .then((res) => {
        if (cancelled) return;
        const favorites = res.keywords.filter((k) => k.isFavorite);
        const custom = res.keywords.filter(
          (k) => !k.isFavorite && k.type === "custom"
        );
        const others = shuffleArray(
          res.keywords.filter((k) => !k.isFavorite && k.type !== "custom")
        );
        setRawKeywords([...favorites, ...custom, ...others].slice(0, 10));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 선택 상태를 반영한 최종 목록
  const selectedKeywords = useKeywordSelectionStore(
    (s) => s.selectedKeywords
  );
  const keywords: RecommendedKeywordItem[] = rawKeywords.map((k) => ({
    id: k.id,
    text: k.text,
    isSelected: sessionId
      ? (selectedKeywords.get(sessionId) || []).some((sk) => sk.id === k.id)
      : false,
  }));

  /**
   * 키워드 선택/해제 토글 핸들러.
   * 이미 선택된 키워드면 해제하고, 미선택이면 추가한다.
   * @param keyword - 토글할 키워드 아이템
   */
  const toggleKeyword = (keyword: RecommendedKeywordItem) => {
    if (!sessionId) return;
    const store = useKeywordSelectionStore.getState();
    if (store.isKeywordSelected(sessionId, keyword.id)) {
      store.removeKeyword(sessionId, keyword.id);
    } else {
      store.addKeyword(sessionId, { id: keyword.id, name: keyword.text });
    }
  };

  return { keywords, loading, toggleKeyword };
}
