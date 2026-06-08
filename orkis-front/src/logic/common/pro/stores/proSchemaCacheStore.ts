/**
 * proSchemaCacheStore — Pro 모드 Schema Browser 용 connection 별 테이블·컬럼 캐시
 *
 * chat 의 schemaSelectionStore 와는 책임이 다르다(chat 은 단일 connection +
 * 사용자가 AI 에 보낼 테이블/컬럼을 토글). 여기서는 다중 connection 의 테이블
 * 목록 + Phase B 의 컬럼 상세 조회까지 담는다. persist 없음 — 매 진입 fresh
 * fetch 가 안전한 데이터.
 */
import { create } from "zustand";
import { dbSchemaService } from "@/logic/common/db/dbSchemaService";
import { getLogger } from "@/logic/shared/utils/logger";
import type {
  DbSchemaTable,
  DbSchemaColumn,
} from "@/logic/common/db/types/dbSchema";

const logger = getLogger("ProSchemaCacheStore");

interface ConnectionEntry {
  tables: DbSchemaTable[];
  isLoading: boolean;
  error: string | null;
  loadedAt: number | null;
  /** tableName → columns 캐시 (Phase B) */
  columnsByTable: Record<string, DbSchemaColumn[]>;
  /** 현재 컬럼을 로드 중인 tableName 들 */
  loadingColumnTables: string[];
  /** tableName → 컬럼 로드 에러 메시지 */
  columnsErrorByTable: Record<string, string>;
}

interface ProSchemaCacheState {
  byConnection: Record<number, ConnectionEntry>;
  loadSchema: (
    connectionId: number,
    opts?: { force?: boolean },
  ) => Promise<void>;
  loadTableColumns: (
    connectionId: number,
    tableName: string,
    opts?: { force?: boolean },
  ) => Promise<void>;
  reset: () => void;
}

const EMPTY_ENTRY: ConnectionEntry = {
  tables: [],
  isLoading: false,
  error: null,
  loadedAt: null,
  columnsByTable: {},
  loadingColumnTables: [],
  columnsErrorByTable: {},
};

function getOrInitEntry(
  byConnection: Record<number, ConnectionEntry>,
  connectionId: number,
): ConnectionEntry {
  return byConnection[connectionId] ?? { ...EMPTY_ENTRY };
}

export const useProSchemaCacheStore = create<ProSchemaCacheState>((set, get) => ({
  byConnection: {},

  loadSchema: async (connectionId, opts) => {
    const existing = get().byConnection[connectionId];
    if (existing?.isLoading) return;
    if (existing?.loadedAt && !opts?.force) return;

    set((state) => ({
      byConnection: {
        ...state.byConnection,
        [connectionId]: {
          ...getOrInitEntry(state.byConnection, connectionId),
          isLoading: true,
          error: null,
        },
      },
    }));

    try {
      const res = await dbSchemaService.getDbSchema(connectionId);
      set((state) => {
        const prev = getOrInitEntry(state.byConnection, connectionId);
        return {
          byConnection: {
            ...state.byConnection,
            [connectionId]: {
              ...prev,
              tables: res.success ? res.tables : [],
              isLoading: false,
              error: res.success ? null : res.message ?? "스키마 조회 실패",
              loadedAt: res.success ? Date.now() : null,
            },
          },
        };
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "스키마 조회 실패";
      logger.error(`loadSchema(${connectionId}) 실패:`, error);
      set((state) => {
        const prev = getOrInitEntry(state.byConnection, connectionId);
        return {
          byConnection: {
            ...state.byConnection,
            [connectionId]: {
              ...prev,
              tables: [],
              isLoading: false,
              error: message,
              loadedAt: null,
            },
          },
        };
      });
    }
  },

  loadTableColumns: async (connectionId, tableName, opts) => {
    const entry = get().byConnection[connectionId];
    if (entry) {
      if (entry.loadingColumnTables.includes(tableName)) return;
      if (entry.columnsByTable[tableName] && !opts?.force) return;
    }

    set((state) => {
      const prev = getOrInitEntry(state.byConnection, connectionId);
      const { [tableName]: _drop, ...restErrors } = prev.columnsErrorByTable;
      return {
        byConnection: {
          ...state.byConnection,
          [connectionId]: {
            ...prev,
            loadingColumnTables: [...prev.loadingColumnTables, tableName],
            columnsErrorByTable: restErrors,
          },
        },
      };
    });

    try {
      const res = await dbSchemaService.getTableDetail(
        connectionId,
        tableName,
        false,
      );
      set((state) => {
        const prev = getOrInitEntry(state.byConnection, connectionId);
        const success = res.success !== false;
        return {
          byConnection: {
            ...state.byConnection,
            [connectionId]: {
              ...prev,
              loadingColumnTables: prev.loadingColumnTables.filter(
                (t) => t !== tableName,
              ),
              columnsByTable: success
                ? {
                    ...prev.columnsByTable,
                    [tableName]: res.columns ?? [],
                  }
                : prev.columnsByTable,
              columnsErrorByTable: success
                ? prev.columnsErrorByTable
                : {
                    ...prev.columnsErrorByTable,
                    [tableName]: res.message ?? "컬럼 조회 실패",
                  },
            },
          },
        };
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "컬럼 조회 실패";
      logger.error(
        `loadTableColumns(${connectionId}, ${tableName}) 실패:`,
        error,
      );
      set((state) => {
        const prev = getOrInitEntry(state.byConnection, connectionId);
        return {
          byConnection: {
            ...state.byConnection,
            [connectionId]: {
              ...prev,
              loadingColumnTables: prev.loadingColumnTables.filter(
                (t) => t !== tableName,
              ),
              columnsErrorByTable: {
                ...prev.columnsErrorByTable,
                [tableName]: message,
              },
            },
          },
        };
      });
    }
  },

  reset: () => set({ byConnection: {} }),
}));

// 셀렉터 ──
export const useConnectionSchemaEntry = (
  connectionId: number | null,
): ConnectionEntry =>
  useProSchemaCacheStore((s) =>
    connectionId != null
      ? s.byConnection[connectionId] ?? EMPTY_ENTRY
      : EMPTY_ENTRY,
  );
