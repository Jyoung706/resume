/**
 * useHelpPanel — 도움말(FAQ) 패널 비즈니스 로직 훅
 *
 * 책임:
 * - 도움말 카테고리/항목 API 로드
 * - 검색 디바운스(300ms)
 * - 카테고리 필터 (서버 파라미터로 재요청)
 * - 아코디언 단일 펼침
 * - 항목 펼칠 때 조회수 증가 (silent)
 * - HelpItem(API) → Design HelpItem 매핑
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { helpService } from "@/logic/common/chat/services/helpService";
import type {
  HelpCategory as ApiHelpCategory,
  HelpItem as ApiHelpItem,
} from "@/logic/common/chat/types/help";
import type {
  HelpCategory as DesignHelpCategory,
  HelpItem as DesignHelpItem,
} from "@/pages/chat/panels/help/HelpPanel";
import { showToast } from "@/logic/shared/utils/toast";
import { getLogger } from "@/logic/shared/utils/logger";

const logger = getLogger("useHelpPanel");

const SEARCH_DEBOUNCE_MS = 300;

/** API → Design 매핑 */
const toDesignCategory = (c: ApiHelpCategory): DesignHelpCategory => ({
  id: c.id,
  name: c.displayName || c.name,
});

const toDesignItem = (i: ApiHelpItem): DesignHelpItem => ({
  id: i.id,
  question: i.question,
  answer: i.answer,
  categoryId: i.categoryId,
});

export function useHelpPanel() {
  // ── 원본 API 상태 ──
  const [apiCategories, setApiCategories] = useState<ApiHelpCategory[]>([]);
  const [apiItems, setApiItems] = useState<ApiHelpItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ── UI 상태 ──
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── 디바운스 타이머 ──
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── API 호출 ──
  const fetchHelpList = useCallback(
    async (opts?: { categoryId?: string | null; search?: string }) => {
      try {
        setLoading(true);
        const response = await helpService.getHelpList({
          categoryId: opts?.categoryId ?? undefined,
          search: opts?.search?.trim() || undefined,
          isActive: true,
        });
        setApiCategories(response.categories ?? []);
        setApiItems(response.items ?? []);
      } catch (error) {
        logger.error("도움말 목록 로드 실패", error);
        setApiCategories([]);
        setApiItems([]);
        showToast("도움말 목록을 불러오지 못했습니다.", "error");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ── 초기 로드 ──
  useEffect(() => {
    fetchHelpList();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchHelpList]);

  // ── 검색 (디바운스) ──
  const onSearch = useCallback(
    (term: string) => {
      setSearchTerm(term);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchHelpList({ categoryId: selectedCategory, search: term });
      }, SEARCH_DEBOUNCE_MS);
    },
    [fetchHelpList, selectedCategory]
  );

  // ── 카테고리 선택 ──
  const onSelectCategory = useCallback(
    (id: string | null) => {
      // 검색 디바운스가 진행 중이면 취소 (즉시 fetch 와의 경합 방지)
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      setSelectedCategory(id);
      setExpandedId(null);
      fetchHelpList({ categoryId: id, search: searchTerm });
    },
    [fetchHelpList, searchTerm]
  );

  // ── 펼치기/접기 (단일 펼침) + 조회수 증가 ──
  const onToggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => {
      const next = prev === id ? null : id;
      if (next) helpService.incrementViewCount(next);
      return next;
    });
  }, []);

  // ── Design 매핑 ──
  const categories: DesignHelpCategory[] = useMemo(
    () => apiCategories.map(toDesignCategory),
    [apiCategories]
  );

  const items: DesignHelpItem[] = useMemo(
    () => apiItems.map(toDesignItem),
    [apiItems]
  );

  return {
    categories,
    items,
    selectedCategory,
    searchTerm,
    expandedId,
    loading,
    onSearch,
    onSelectCategory,
    onToggleExpand,
  };
}
