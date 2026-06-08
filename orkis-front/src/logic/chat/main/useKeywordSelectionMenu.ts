/**
 * useKeywordSelectionMenu — 키워드 선택 Popper 로직 훅 (심플 버전)
 *
 * 책임:
 * - Popper open/close 상태 관리
 * - 선택된 키워드 조회 (keywordSelectionStore 연동)
 * - 키워드 삭제 / 전체 초기화
 */

import { useState, useEffect, useCallback } from "react";
import {
  useKeywordSelectionStore,
  useSelectedKeywords,
  useHasSelectedKeywords
} from "@/logic/common/chat/stores/keywordSelectionStore";

export function useKeywordSelectionMenu(sessionId: string | null) {
  // ── open/close 상태 ──
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = !!anchorEl;

  const openMenu = useCallback(
    (el: HTMLElement) => setAnchorEl(el),
    []
  );
  const closeMenu = useCallback(() => setAnchorEl(null), []);

  // ── Store 연동 ──
  const store = useKeywordSelectionStore();
  const selectedFromStore = useSelectedKeywords(sessionId);
  const hasKeywords = useHasSelectedKeywords(sessionId);

  // ── 선택된 키워드 (Design용 변환) ──
  const selectedKeywords = selectedFromStore.map((k) => ({
    id: k.id,
    name: k.name
  }));

  // ── 키워드가 모두 제거되면 자동 닫기 (선언적) ──
  useEffect(() => {
    if (open && !hasKeywords) closeMenu();
  }, [open, hasKeywords, closeMenu]);

  // ── 핸들러 ──
  const onRemoveKeyword = useCallback(
    (id: string) => {
      if (sessionId) store.removeKeyword(sessionId, id);
    },
    [sessionId, store]
  );

  const onClearAll = useCallback(() => {
    if (sessionId) store.clearAllKeywords(sessionId);
  }, [sessionId, store]);

  // ── Selector용 핸들러 (메뉴 닫기 없이 Store만 조작) ──
  const removeKeywordDirect = useCallback(
    (id: string) => {
      if (sessionId) store.removeKeyword(sessionId, id);
    },
    [sessionId, store]
  );

  const clearAllDirect = useCallback(() => {
    if (sessionId) store.clearAllKeywords(sessionId);
  }, [sessionId, store]);

  return {
    // Popper 상태
    anchorEl,
    open,
    openMenu,
    closeMenu,
    // 데이터
    selectedKeywords,
    keywordSelectorVisible: hasKeywords,
    // 메뉴 핸들러 (auto-close 포함)
    onRemoveKeyword,
    onClearAll,
    // Selector용 핸들러 (Store만 조작, 메뉴 무관)
    removeKeywordDirect,
    clearAllDirect
  };
}
