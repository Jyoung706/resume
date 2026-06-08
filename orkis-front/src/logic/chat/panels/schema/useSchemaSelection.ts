/**
 * useSchemaSelection — 스키마 패널 전용 비즈니스 로직 훅
 *
 * 책임:
 * - DB 변경 감지 → 스키마 로드
 * - 테이블 확장 시 컬럼 로드 (캐시 우선)
 * - 검색 필터링 (테이블명 + 컬럼명, isHighlighted 계산)
 * - DbSchema* → Schema* 타입 변환 (Design용)
 * - 선택 상태 계산 (all/partial/none)
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useDbSelectionStore } from "@/logic/common/db/dbSelectionStore";
import {
  useSchemaSelectionStore,
  useSelectedTables,
  useSelectedTableCount,
  useSelectedColumnCount,
} from "@/logic/common/chat/stores/schemaSelectionStore";
import type { SchemaTable } from "@/pages/chat/panels/schema/SchemaTableItem";
import type { SchemaColumn } from "@/pages/chat/panels/schema/SchemaColumnItem";

export function useSchemaSelection(sessionId: string | null) {
  const { selectedDbConnection } = useDbSelectionStore();
  const store = useSchemaSelectionStore();
  const selectedTablesFromStore = useSelectedTables(sessionId);
  const selectedTableCount = useSelectedTableCount(sessionId);
  const selectedColumnCount = useSelectedColumnCount(sessionId);

  const [searchTerm, setSearchTerm] = useState("");
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);
  const prevConnectionIdRef = useRef<number | null>(null);

  // ── DB 변경 감지 → 스키마 로드 ──
  const connectionId = selectedDbConnection?.connectionId ?? null;

  useEffect(() => {
    if (connectionId && connectionId !== prevConnectionIdRef.current) {
      prevConnectionIdRef.current = connectionId;
      store.loadSchema(connectionId);
      setExpandedTables(new Set());
      setSearchTerm("");
    }
  }, [connectionId, store]);

  // ── 테이블 확장/축소 ──
  const onExpandTable = useCallback(
    (tableName: string) => {
      setExpandedTables((prev) => {
        const next = new Set(prev);
        if (next.has(tableName)) {
          next.delete(tableName);
        } else {
          next.add(tableName);
          // 확장 시 컬럼 로드 (캐시 우선)
          if (connectionId && !store.tableColumnsCache[tableName]) {
            store.loadTableColumns(connectionId, tableName);
          }
        }
        return next;
      });
    },
    [connectionId, store]
  );

  // ── 선택 핸들러 ──
  const onToggleTable = useCallback(
    (tableName: string) => {
      if (!sessionId) return;
      store.toggleTableSelection(sessionId, tableName);
    },
    [sessionId, store]
  );

  const onToggleColumn = useCallback(
    (tableName: string, columnName: string) => {
      if (!sessionId) return;
      store.toggleColumnSelection(sessionId, tableName, columnName);
    },
    [sessionId, store]
  );

  const onSelectAllColumns = useCallback(
    (tableName: string) => {
      if (!sessionId) return;
      const selected = selectedTablesFromStore.find((t) => t.tableName === tableName);
      if (selected?.isWholeTableSelected) {
        store.deselectAllColumns(sessionId, tableName);
      } else {
        store.selectAllColumns(sessionId, tableName);
      }
    },
    [sessionId, selectedTablesFromStore, store]
  );

  const onClearSelection = useCallback(() => {
    if (sessionId) store.clearSelection(sessionId);
  }, [sessionId, store]);

  // ── DbSchema* → Design Schema* 변환 + 검색 필터링 ──
  const tables: SchemaTable[] = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    const selectedMap = new Map(
      selectedTablesFromStore.map((t) => [t.tableName, t])
    );

    return store.tables
      .map((dbTable) => {
        const columns = store.tableColumnsCache[dbTable.tableName] || [];
        const selected = selectedMap.get(dbTable.tableName);
        const isExpanded = expandedTables.has(dbTable.tableName);
        const isLoadingColumns = store.loadingTableNames.has(dbTable.tableName);

        // 컬럼 → Design 타입 변환
        const designColumns: SchemaColumn[] = columns.map((col) => {
          let isSelected = false;
          if (selected) {
            isSelected = selected.isWholeTableSelected
              || selected.selectedColumns.includes(col.columnName);
          }
          const isHighlighted =
            lowerSearch !== "" &&
            col.columnName.toLowerCase().includes(lowerSearch);

          return {
            name: col.columnName,
            dataType: col.dataType,
            isPK: col.isPrimaryKey,
            isFK: col.isForeignKey ?? false,
            isNullable: col.isNullable,
            ordinal: col.ordinalPosition,
            comment: col.columnComment,
            isSelected,
            isHighlighted,
          };
        });

        // 선택 상태 계산
        let selectionState: "all" | "partial" | "none" = "none";
        if (selected) {
          if (selected.isWholeTableSelected) {
            selectionState = "all";
          } else if (selected.selectedColumns.length > 0) {
            if (columns.length > 0 && selected.selectedColumns.length >= columns.length) {
              selectionState = "all";
            } else {
              selectionState = "partial";
            }
          }
        }

        return {
          name: dbTable.tableName,
          type: dbTable.tableType,
          comment: dbTable.tableComment,
          columns: designColumns,
          selectionState,
          isExpanded,
          isLoadingColumns,
        } satisfies SchemaTable;
      })
      .filter((table) => {
        if (!lowerSearch) return true;
        // 테이블명 매칭
        if (table.name.toLowerCase().includes(lowerSearch)) return true;
        // 컬럼명 매칭
        return table.columns.some((c) => c.isHighlighted);
      });
  }, [store.tables, store.tableColumnsCache, store.loadingTableNames, selectedTablesFromStore, expandedTables, searchTerm]);

  return {
    // SchemaPanel props
    dbName: store.connectionName ?? undefined,
    dbType: store.dbTypeName ?? undefined,
    tables,
    selectedTableCount,
    selectedColumnCount,
    searchTerm,
    loading: store.isLoadingSchema,
    error: store.error ?? undefined,
    isExpanded: isPanelExpanded,
    // 핸들러
    onSearch: setSearchTerm,
    onToggleTable,
    onToggleColumn,
    onExpandTable,
    onSelectAllColumns,
    onClearSelection,
    onToggleExpand: () => setIsPanelExpanded((p) => !p),
  };
}
