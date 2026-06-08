/**
 * schemaSelectionStore — 세션별 테이블/컬럼 선택 상태 관리
 * keywordSelectionStore 패턴을 따르되, 2단계 계층(테이블→컬럼) 구조 적용
 */
import { create } from "zustand";
import { dbSchemaService } from "@/logic/common/db/dbSchemaService";
import { getLogger } from "@/logic/shared/utils/logger";
import type {
  DbSchemaTable,
  DbSchemaColumn,
  GetDbSchemaResponse,
} from "@/logic/common/db/types/dbSchema";

const logger = getLogger("SchemaSelectionStore");

// ====================================================================
// Types
// ====================================================================

export interface SelectedTable {
  tableName: string;
  tableInfo: DbSchemaTable;
  isWholeTableSelected: boolean;
  selectedColumns: string[];
}

interface SchemaSelectionState {
  // ── DB/스키마 정보 ──
  connectionId: number | null;
  connectionName: string | null;
  databaseName: string | null;
  dbTypeName: string | null;

  // ── 테이블/컬럼 원본 데이터 ──
  tables: DbSchemaTable[];
  tableColumnsCache: Record<string, DbSchemaColumn[]>;

  // ── 선택 정보 (세션별) ──
  selectedTablesBySession: Map<string, SelectedTable[]>;

  // ── 로딩/에러 ──
  isLoadingSchema: boolean;
  loadingTableNames: Set<string>;
  error: string | null;

  // ── 액션 ──
  loadSchema: (connectionId: number) => Promise<GetDbSchemaResponse>;
  loadTableColumns: (connectionId: number, tableName: string) => Promise<DbSchemaColumn[]>;
  toggleTableSelection: (sessionId: string, tableName: string) => void;
  toggleColumnSelection: (sessionId: string, tableName: string, columnName: string) => void;
  selectAllColumns: (sessionId: string, tableName: string) => void;
  deselectAllColumns: (sessionId: string, tableName: string) => void;
  clearSelection: (sessionId: string) => void;
  reset: () => void;
}

// ====================================================================
// Store
// ====================================================================

const INITIAL_STATE = {
  connectionId: null as number | null,
  connectionName: null as string | null,
  databaseName: null as string | null,
  dbTypeName: null as string | null,
  tables: [] as DbSchemaTable[],
  tableColumnsCache: {} as Record<string, DbSchemaColumn[]>,
  selectedTablesBySession: new Map<string, SelectedTable[]>(),
  isLoadingSchema: false,
  loadingTableNames: new Set<string>(),
  error: null as string | null,
};

export const useSchemaSelectionStore = create<SchemaSelectionState>(
  (set, get) => ({
    ...INITIAL_STATE,

    loadSchema: async (connectionId) => {
      set({ isLoadingSchema: true, error: null });
      try {
        const res = await dbSchemaService.getDbSchema(connectionId);
        if (res.success) {
          set({
            connectionId: res.connectionId,
            connectionName: res.connectionName,
            databaseName: res.databaseName,
            dbTypeName: res.dbTypeName,
            tables: res.tables,
            isLoadingSchema: false,
          });
        } else {
          set({
            isLoadingSchema: false,
            error: res.message || "스키마 조회 실패",
          });
        }
        return res;
      } catch (error) {
        const message = error instanceof Error ? error.message : "스키마 조회 실패";
        logger.error("loadSchema 실패:", error);
        set({ isLoadingSchema: false, error: message });
        return {
          success: false,
          connectionId,
          connectionName: "",
          dbTypeName: "",
          databaseName: "",
          tables: [],
          totalTables: 0,
          message,
        };
      }
    },

    loadTableColumns: async (connectionId, tableName) => {
      const cached = get().tableColumnsCache[tableName];
      if (cached) return cached;

      const loadingSet = new Set(get().loadingTableNames);
      loadingSet.add(tableName);
      set({ loadingTableNames: loadingSet });

      try {
        const res = await dbSchemaService.getTableDetail(connectionId, tableName, false);
        const columns = res.columns || [];
        set((state) => {
          const newLoading = new Set(state.loadingTableNames);
          newLoading.delete(tableName);
          return {
            tableColumnsCache: { ...state.tableColumnsCache, [tableName]: columns },
            loadingTableNames: newLoading,
          };
        });
        return columns;
      } catch (error) {
        logger.error(`loadTableColumns(${tableName}) 실패:`, error);
        const loadingSet2 = new Set(get().loadingTableNames);
        loadingSet2.delete(tableName);
        set({ loadingTableNames: loadingSet2 });
        return [];
      }
    },

    toggleTableSelection: (sessionId, tableName) => {
      const map = new Map(get().selectedTablesBySession);
      const list = map.get(sessionId) || [];
      const existing = list.find((t) => t.tableName === tableName);

      if (existing) {
        // 이미 선택됨 → 제거
        const filtered = list.filter((t) => t.tableName !== tableName);
        if (filtered.length === 0) map.delete(sessionId);
        else map.set(sessionId, filtered);
      } else {
        // 미선택 → 전체 선택
        const tableInfo = get().tables.find((t) => t.tableName === tableName);
        if (!tableInfo) return;
        map.set(sessionId, [
          ...list,
          { tableName, tableInfo, isWholeTableSelected: true, selectedColumns: [] },
        ]);
      }
      set({ selectedTablesBySession: map });
    },

    toggleColumnSelection: (sessionId, tableName, columnName) => {
      const map = new Map(get().selectedTablesBySession);
      const list = map.get(sessionId) || [];
      const existingIdx = list.findIndex((t) => t.tableName === tableName);
      const allColumns = get().tableColumnsCache[tableName] || [];
      const allColumnNames = allColumns.map((c) => c.columnName);

      if (existingIdx === -1) {
        // 테이블 미선택 → 해당 컬럼만 선택
        const tableInfo = get().tables.find((t) => t.tableName === tableName);
        if (!tableInfo) return;
        map.set(sessionId, [
          ...list,
          { tableName, tableInfo, isWholeTableSelected: false, selectedColumns: [columnName] },
        ]);
      } else {
        const entry = list[existingIdx];
        const newList = [...list];

        if (entry.isWholeTableSelected) {
          // 전체 선택 → 해당 컬럼 제외 (나머지 개별 선택)
          const remaining = allColumnNames.filter((c) => c !== columnName);
          if (remaining.length === 0) {
            // 모든 컬럼 해제 → 테이블 제거
            newList.splice(existingIdx, 1);
          } else {
            newList[existingIdx] = {
              ...entry,
              isWholeTableSelected: false,
              selectedColumns: remaining,
            };
          }
        } else {
          const hasColumn = entry.selectedColumns.includes(columnName);
          if (hasColumn) {
            // 컬럼 제거
            const updated = entry.selectedColumns.filter((c) => c !== columnName);
            if (updated.length === 0) {
              // 마지막 컬럼 해제 → 테이블 제거
              newList.splice(existingIdx, 1);
            } else {
              newList[existingIdx] = { ...entry, selectedColumns: updated };
            }
          } else {
            // 컬럼 추가
            const updated = [...entry.selectedColumns, columnName];
            // 모든 컬럼 선택 시 전체 선택으로 변환
            if (allColumnNames.length > 0 && updated.length >= allColumnNames.length) {
              newList[existingIdx] = {
                ...entry,
                isWholeTableSelected: true,
                selectedColumns: [],
              };
            } else {
              newList[existingIdx] = { ...entry, selectedColumns: updated };
            }
          }
        }

        if (newList.length === 0) map.delete(sessionId);
        else map.set(sessionId, newList);
      }
      set({ selectedTablesBySession: map });
    },

    selectAllColumns: (sessionId, tableName) => {
      const map = new Map(get().selectedTablesBySession);
      const list = map.get(sessionId) || [];
      const existingIdx = list.findIndex((t) => t.tableName === tableName);

      if (existingIdx === -1) {
        const tableInfo = get().tables.find((t) => t.tableName === tableName);
        if (!tableInfo) return;
        map.set(sessionId, [
          ...list,
          { tableName, tableInfo, isWholeTableSelected: true, selectedColumns: [] },
        ]);
      } else {
        const newList = [...list];
        newList[existingIdx] = {
          ...newList[existingIdx],
          isWholeTableSelected: true,
          selectedColumns: [],
        };
        map.set(sessionId, newList);
      }
      set({ selectedTablesBySession: map });
    },

    deselectAllColumns: (sessionId, tableName) => {
      const map = new Map(get().selectedTablesBySession);
      const list = map.get(sessionId) || [];
      const filtered = list.filter((t) => t.tableName !== tableName);
      if (filtered.length === 0) map.delete(sessionId);
      else map.set(sessionId, filtered);
      set({ selectedTablesBySession: map });
    },

    clearSelection: (sessionId) => {
      const map = new Map(get().selectedTablesBySession);
      map.delete(sessionId);
      set({ selectedTablesBySession: map });
    },

    reset: () => set(INITIAL_STATE),
  })
);

// ====================================================================
// 셀렉터 훅
// ====================================================================

const emptyArray: SelectedTable[] = [];

export const useSelectedTables = (sessionId: string | null): SelectedTable[] =>
  useSchemaSelectionStore((s) =>
    sessionId
      ? s.selectedTablesBySession.get(sessionId) || emptyArray
      : emptyArray
  );

export const useSelectedTableCount = (sessionId: string | null): number =>
  useSchemaSelectionStore((s) => {
    if (!sessionId) return 0;
    const tables = s.selectedTablesBySession.get(sessionId) || [];
    return tables.filter((t) => t.isWholeTableSelected).length;
  });

export const useSelectedColumnCount = (sessionId: string | null): number =>
  useSchemaSelectionStore((s) => {
    if (!sessionId) return 0;
    const tables = s.selectedTablesBySession.get(sessionId) || [];
    return tables.reduce((acc, t) => {
      if (t.isWholeTableSelected) return acc;
      return acc + t.selectedColumns.length;
    }, 0);
  });

export const useHasSelectedSchema = (sessionId: string | null): boolean =>
  useSchemaSelectionStore((s) =>
    sessionId
      ? (s.selectedTablesBySession.get(sessionId)?.length ?? 0) > 0
      : false
  );

// ====================================================================
// AI 전송 포맷
// ====================================================================

export function formatSelectedSchemaForAI(sessionId: string | null): string {
  if (!sessionId) return "";
  const state = useSchemaSelectionStore.getState();
  const tables = state.selectedTablesBySession.get(sessionId);
  if (!tables || tables.length === 0) return "";

  const result: Record<string, string[]> = {};
  for (const t of tables) {
    if (t.isWholeTableSelected) {
      result[t.tableName] = [];
    } else {
      result[t.tableName] = t.selectedColumns;
    }
  }
  return JSON.stringify(result);
}
