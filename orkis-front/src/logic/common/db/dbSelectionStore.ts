/**
 * DB 선택 상태 관리 Store (Zustand)
 * orkis-front dbSelectionStore 이식 — 핵심 기능만
 *
 * 이식 범위:
 *   O: selectedDbConnection, ragCompletedDbConnections, loadDbConnections,
 *      loadRagCompletedConnections, setSelectedDbConnection, extractDbId
 *   △: testDbConnection, RAG 폴링 (후순위 — TODO_LIST.md 연동 시 추가)
 */
import { create } from "zustand";
import { dbConnectionService } from "@/logic/common/db/dbConnectionService";
import { getLogger } from "@/logic/shared/utils/logger";
import type {
  DbConnection,
  CreateDbConnectionRequest,
  UpdateDbConnectionRequest,
  RagPreprocessingHistory,
  RagReadiness,
} from "@/logic/common/db/types/dbConnection";
import { RagType } from "@/logic/common/db/types/dbConnection";

const logger = getLogger("DbSelectionStore");

interface DbSelectionState {
  // 상태
  selectedDbConnection: DbConnection | null;
  dbConnections: DbConnection[];
  ragCompletedDbConnections: DbConnection[];
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  setSelectedDbConnection: (connection: DbConnection | null) => void;
  loadDbConnections: () => Promise<void>;
  loadRagCompletedConnections: () => Promise<void>;
  /** DB 목록 강제 갱신 (CRUD 후 호출) — isInitialized 무시, 삭제된 DB 자동 해제 */
  refreshDbConnections: () => Promise<void>;

  // CRUD Actions
  createConnection: (data: CreateDbConnectionRequest) => Promise<{ connectionId: number; ragReadiness?: RagReadiness }>;
  updateConnection: (connectionId: number, data: UpdateDbConnectionRequest) => Promise<void>;
  deleteConnection: (connectionId: number) => Promise<void>;
}

export const useDbSelectionStore = create<DbSelectionState>((set, get) => ({
  selectedDbConnection: null,
  dbConnections: [],
  ragCompletedDbConnections: [],
  isLoading: false,
  isInitialized: false,
  error: null,

  setSelectedDbConnection: (connection) => {
    const prev = get().selectedDbConnection;
    if (prev?.connectionId === connection?.connectionId) return;

    set({ selectedDbConnection: connection });

    // sessionStorage 저장 — 탭 단위 격리로 다른 사용자 로그인 시 영향 차단.
    // 빈 sessionStorage 일 때는 loadDbConnections() 가 isDefault DB 로 fallback 한다.
    if (connection) {
      sessionStorage.setItem("selectedDbConnectionId", connection.connectionId.toString());
    } else {
      sessionStorage.removeItem("selectedDbConnectionId");
    }
  },

  loadDbConnections: async () => {
    const { isLoading, isInitialized } = get();
    if (isLoading || isInitialized) return;

    set({ isLoading: true, error: null });

    try {
      const response = await dbConnectionService.getDbConnections();
      const connections = response.connections || [];

      set({ dbConnections: connections, isLoading: false, isInitialized: true });

      // sessionStorage에서 이전 선택 복원 (탭 단위 격리)
      const savedId = sessionStorage.getItem("selectedDbConnectionId");
      if (savedId) {
        const saved = connections.find(
          (c) => c.connectionId.toString() === savedId
        );
        if (saved) {
          set({ selectedDbConnection: saved });
        }
      }

      // 선택된 DB 없으면 기본 DB 자동 선택
      if (!get().selectedDbConnection) {
        const defaultConn = connections.find((c) => c.isDefault);
        if (defaultConn) {
          get().setSelectedDbConnection(defaultConn);
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "DB 연결 목록 로드 실패";
      logger.error("loadDbConnections:", error);
      set({ error: message, isLoading: false, isInitialized: true });
    }
  },

  refreshDbConnections: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await dbConnectionService.getDbConnections();
      const connections = response.connections || [];

      set({ dbConnections: connections, isLoading: false, isInitialized: true });

      // 삭제된 DB가 selectedDbConnection이었으면 자동 해제
      const current = get().selectedDbConnection;
      if (current) {
        const stillExists = connections.some(
          (c) => c.connectionId === current.connectionId,
        );
        if (!stillExists) {
          get().setSelectedDbConnection(null);
        }
      }

      // RAG 완료 목록도 갱신
      await get().loadRagCompletedConnections();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "DB 연결 목록 갱신 실패";
      logger.error("refreshDbConnections:", error);
      set({ error: message, isLoading: false });
    }
  },

  createConnection: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await dbConnectionService.createDbConnection(data);
      await get().refreshDbConnections();
      // 새로 생성된 연결 자동 선택
      const newConn = get().dbConnections.find(
        (c) => c.connectionId === response.connectionId
      );
      if (newConn) {
        get().setSelectedDbConnection(newConn);
      }
      return { connectionId: response.connectionId, ragReadiness: response.ragReadiness };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "DB 연결 생성 실패";
      logger.error("createConnection:", error);
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  updateConnection: async (connectionId, data) => {
    set({ isLoading: true, error: null });
    try {
      await dbConnectionService.updateDbConnection(connectionId, data);
      await get().refreshDbConnections();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "DB 연결 수정 실패";
      logger.error("updateConnection:", error);
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  deleteConnection: async (connectionId) => {
    set({ isLoading: true, error: null });
    try {
      await dbConnectionService.deleteDbConnection(connectionId);

      // ── RAG 관련 stale state 정리 (cross-store) ──
      // refreshDbConnections() 호출 전에 정리해야 stale ID 가 먼저 비워진 상태에서
      // 후속 selector 들이 일관된 값을 읽음.
      const { useRagPollingStore } = await import(
        "@/logic/common/rag/ragPollingStore"
      );
      const { useSettingsStore } = await import(
        "@/logic/common/ui/settingsStore"
      );

      // 1) ragPollingStore: 모니터링 중인 DB 가 삭제 대상이면 polling 중단 + monitoringDbId=null
      const ragStore = useRagPollingStore.getState();
      if (ragStore.monitoringDbId === connectionId) {
        ragStore.changeMonitoringDb(null);
      }
      // 2) ragHistoryMap 의 삭제된 DB 엔트리 제거 (stale "완료" 카드 표시 방지)
      useRagPollingStore.setState((s) => {
        if (!(connectionId in s.ragHistoryMap)) return s;
        const next = { ...s.ragHistoryMap };
        delete next[connectionId];
        return { ragHistoryMap: next };
      });
      // 3) settingsStore 의 stale ragSelectedDbId 정리 (persist 정리)
      if (useSettingsStore.getState().ragSelectedDbId === connectionId) {
        useSettingsStore.getState().setRagSelectedDbId(null);
      }

      await get().refreshDbConnections();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "DB 연결 삭제 실패";
      logger.error("deleteConnection:", error);
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  loadRagCompletedConnections: async () => {
    const { dbConnections } = get();
    if (dbConnections.length === 0) {
      set({ ragCompletedDbConnections: [] });
      return;
    }

    try {
      const batch = await dbConnectionService.getAllRagPreprocessingHistory();
      const { historyByConnection } = batch;
      const completed: DbConnection[] = [];

      for (const conn of dbConnections) {
        const history: RagPreprocessingHistory[] =
          historyByConnection[conn.connectionId] || [];
        const schema = history.find((h) => h.ragType === RagType.SCHEMA);
        const data = history.find((h) => h.ragType === RagType.DATA);

        if (schema?.status === "success" && data?.status === "success") {
          completed.push(conn);
        }
      }

      set({ ragCompletedDbConnections: completed });

      // 채팅 DB 선택을 RAG 완료 목록과 동기화
      const current = get().selectedDbConnection;
      if (completed.length > 0) {
        // 현재 선택된 DB가 RAG 완료 목록에 없으면 첫 번째로 자동 선택
        const isCurrentCompleted = completed.some(
          (c) => c.connectionId === current?.connectionId
        );
        if (!isCurrentCompleted) {
          get().setSelectedDbConnection(completed[0]);
        }
      } else if (current) {
        // RAG 완료 DB가 0건이면 채팅 DB 선택 해제
        get().setSelectedDbConnection(null);
      }
    } catch (error) {
      logger.error("loadRagCompletedConnections:", error);
    }
  },
}));

/**
 * 선택된 DB의 db_id 경로 추출 (AI 서버 전송용)
 */
export function extractDbId(connection: DbConnection | null): string | null {
  if (!connection) return null;

  if (connection.filePath) {
    const normalized = connection.filePath.replace(/\\/g, "/");
    const sqliteIdx = normalized.indexOf("share/sqlite/");

    if (sqliteIdx !== -1) {
      const after = normalized.substring(sqliteIdx + "share/sqlite/".length);
      const lastSlash = after.lastIndexOf("/");

      if (lastSlash !== -1) {
        return after.substring(0, lastSlash);
      }
      const firstSlash = after.indexOf("/");
      return firstSlash !== -1
        ? after.substring(0, firstSlash)
        : after.replace(/\.(db|sqlite|sqlite3)$/i, "");
    }

    const parts = normalized.split("/");
    if (parts.length > 1) {
      parts.pop();
      return parts[parts.length - 1];
    }
    return normalized.replace(/\.(db|sqlite|sqlite3)$/i, "");
  }

  return connection.databaseName || null;
}
