/**
 * useSchemaSelectionMenu — 스키마 선택 Popper 로직 훅
 *
 * 책임:
 * - Popper open/close 상태 관리
 * - SelectedTable[] → SelectedSchemaItem[] 변환
 * - 항목 삭제 (테이블/컬럼 구분)
 * - 선택 0건 시 Popper 자동 닫기
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  useSchemaSelectionStore,
  useSelectedTables,
  useSelectedTableCount,
  useSelectedColumnCount,
  useHasSelectedSchema,
} from "@/logic/common/chat/stores/schemaSelectionStore";

// ====================================================================
// Types
// ====================================================================

export interface SelectedSchemaItem {
  id: string;
  label: string;
  type: "table" | "column";
  tableName: string;
  columnName?: string;
}

// ====================================================================
// Hook
// ====================================================================

export function useSchemaSelectionMenu(sessionId: string | null) {
  // ── open/close 상태 ──
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = !!anchorEl;

  const openMenu = useCallback(
    (el: HTMLElement) => setAnchorEl(el),
    []
  );
  const closeMenu = useCallback(() => setAnchorEl(null), []);

  // ── Store 연동 ──
  const store = useSchemaSelectionStore();
  const selectedFromStore = useSelectedTables(sessionId);
  const selectedTableCount = useSelectedTableCount(sessionId);
  const selectedColumnCount = useSelectedColumnCount(sessionId);
  const hasSchema = useHasSelectedSchema(sessionId);

  // ── SelectedTable[] → SelectedSchemaItem[] 변환 ──
  const selectedItems: SelectedSchemaItem[] = useMemo(() => {
    const items: SelectedSchemaItem[] = [];
    for (const t of selectedFromStore) {
      if (t.isWholeTableSelected) {
        items.push({
          id: `table-${t.tableName}`,
          label: t.tableName,
          type: "table",
          tableName: t.tableName,
        });
      } else {
        for (const col of t.selectedColumns) {
          items.push({
            id: `column-${t.tableName}-${col}`,
            label: `${t.tableName}.${col}`,
            type: "column",
            tableName: t.tableName,
            columnName: col,
          });
        }
      }
    }
    return items;
  }, [selectedFromStore]);

  // ── 선택 0건 → Popper 자동 닫기 ──
  useEffect(() => {
    if (open && !hasSchema) closeMenu();
  }, [open, hasSchema, closeMenu]);

  // ── 항목 삭제 핸들러 ──
  const removeItem = useCallback(
    (item: SelectedSchemaItem) => {
      if (!sessionId) return;
      if (item.type === "table") {
        store.toggleTableSelection(sessionId, item.tableName);
      } else if (item.columnName) {
        store.toggleColumnSelection(sessionId, item.tableName, item.columnName);
      }
    },
    [sessionId, store]
  );

  const onRemoveItem = useCallback(
    (item: SelectedSchemaItem) => removeItem(item),
    [removeItem]
  );

  const onClearAll = useCallback(() => {
    if (sessionId) store.clearSelection(sessionId);
  }, [sessionId, store]);

  // ── Selector용 핸들러 (메뉴 닫기 없이 Store만 조작) ──
  const removeItemDirect = useCallback(
    (item: SelectedSchemaItem) => removeItem(item),
    [removeItem]
  );

  const clearAllDirect = useCallback(() => {
    if (sessionId) store.clearSelection(sessionId);
  }, [sessionId, store]);

  return {
    // Popper 상태
    anchorEl,
    open,
    openMenu,
    closeMenu,
    // 데이터
    selectedItems,
    selectedTableCount,
    selectedColumnCount,
    schemaSelectorVisible: hasSchema,
    // 메뉴 핸들러 (auto-close 포함)
    onRemoveItem,
    onClearAll,
    // Selector용 핸들러 (Store만 조작, 메뉴 무관)
    removeItemDirect,
    clearAllDirect,
  };
}
