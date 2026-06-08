/**
 * RAG 전처리 전역 폴링 스토어 (Zustand)
 *
 * DB별 RAG 히스토리 캐시, 5초 폴링, 전처리 요청/모드 관리.
 * ragPollingManager(모듈 싱글톤 타이머)를 사용하며,
 * 전처리 완료 시 dbSelectionStore.loadRagCompletedConnections()를 dynamic import로 호출한다.
 */
import { create } from "zustand";
import {
  startRagPolling,
  stopRagPolling as stopPollingTimer,
} from "@/logic/common/rag/ragPollingManager";
import { ragService } from "@/logic/common/rag/ragService";
import { getLogger } from "@/logic/shared/utils/logger";
import { showToast } from "@/logic/shared/utils/toast";
import {
  RagType,
  type RagPreprocessingHistory,
  type RagPreprocessingStatus,
  type OverallRagStatus,
} from "@/logic/common/db/types/dbConnection";

const logger = getLogger("RagPollingStore");

/** 연속 실패 허용 횟수 */
const MAX_CONSECUTIVE_FAIL = 3;

// ── 종합 상태 계산 ────────────────────────────
function computeOverallStatus(
  schema: RagPreprocessingStatus | null,
  data: RagPreprocessingStatus | null,
): OverallRagStatus {
  if (!schema && !data) return "not_configured";
  if (schema === "processing" || data === "processing") return "processing";
  if (schema === "pending" || data === "pending") return "pending";
  if (schema === "failed" || data === "failed") return "failed";
  if (schema === "success" && data === "success") return "success";
  if (schema === "success" || data === "success") return "partial";
  return "not_configured";
}

// ── State 인터페이스 ──────────────────────────
interface RagPollingState {
  // 상태
  monitoringDbId: number | null;
  ragHistoryMap: Record<number, RagPreprocessingHistory[]>;
  pollingStatus: "idle" | "polling";
  isRagPollingActive: boolean;
  lastPolledAt: number | null;
  isLoading: boolean;
  error: string | null;
  consecutiveFailCount: number;

  // Computed Getters
  getCurrentSchemaStatus: () => RagPreprocessingStatus | null;
  getCurrentDataStatus: () => RagPreprocessingStatus | null;
  getCurrentOverallStatus: () => OverallRagStatus;
  isCurrentDbRagComplete: () => boolean;

  // Actions
  changeMonitoringDb: (dbId: number | null) => void;
  fetchRagHistory: (dbId: number) => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  requestPreprocessing: (
    connectionId: number,
    type?: RagType,
  ) => Promise<boolean>;
  startPreprocessingMode: (dbId: number) => void;
  clearError: () => void;
  reset: () => void;
}

// ── Store ────────────────────────────────────
export const useRagPollingStore = create<RagPollingState>((set, get) => {
  // ── 내부 헬퍼: 현재 DB 히스토리에서 특정 ragType의 최신 상태 조회 ──
  function getLatestStatus(ragType: RagType): RagPreprocessingStatus | null {
    const { monitoringDbId, ragHistoryMap } = get();
    if (monitoringDbId == null) return null;
    const history = ragHistoryMap[monitoringDbId] ?? [];
    const found = history.find((h) => h.ragType === ragType);
    return found?.status ?? null;
  }

  // ── 내부 헬퍼: 전처리 완료 감지 시 dbSelectionStore 갱신 ──
  async function notifyRagComplete(): Promise<void> {
    try {
      const { useDbSelectionStore } = await import(
        "@/logic/common/db/dbSelectionStore"
      );
      await useDbSelectionStore.getState().loadRagCompletedConnections();
    } catch (e) {
      logger.error("notifyRagComplete failed:", e);
    }
  }

  return {
    monitoringDbId: null,
    ragHistoryMap: {},
    pollingStatus: "idle",
    isRagPollingActive: false,
    lastPolledAt: null,
    isLoading: false,
    error: null,
    consecutiveFailCount: 0,

    // ── Computed ──────────────────────────────
    getCurrentSchemaStatus: () => getLatestStatus(RagType.SCHEMA),
    getCurrentDataStatus: () => getLatestStatus(RagType.DATA),

    getCurrentOverallStatus: () => {
      const schema = getLatestStatus(RagType.SCHEMA);
      const data = getLatestStatus(RagType.DATA);
      return computeOverallStatus(schema, data);
    },

    isCurrentDbRagComplete: () => {
      const schema = getLatestStatus(RagType.SCHEMA);
      const data = getLatestStatus(RagType.DATA);
      return schema === "success" && data === "success";
    },

    // ── Actions ──────────────────────────────

    changeMonitoringDb: (dbId) => {
      const prev = get().monitoringDbId;
      if (prev === dbId) return;

      // 기존 폴링 중지
      get().stopPolling();

      set({ monitoringDbId: dbId, error: null, consecutiveFailCount: 0 });

      if (dbId != null) {
        get().fetchRagHistory(dbId).then(() => {
          // 진행 중이면 폴링 시작
          const overall = get().getCurrentOverallStatus();
          if (overall === "pending" || overall === "processing") {
            get().startPolling();
          }
        });
      }
    },

    fetchRagHistory: async (dbId) => {
      set({ isLoading: true });

      try {
        const response = await ragService.getRagHistory({ connectionId: dbId });
        const history = response.history ?? [];

        set((state) => ({
          ragHistoryMap: { ...state.ragHistoryMap, [dbId]: history },
          lastPolledAt: Date.now(),
          isLoading: false,
          consecutiveFailCount: 0,
          error: null,
        }));

        // 전처리 완료 감지
        const overall = get().getCurrentOverallStatus();
        if (overall === "success" && get().isRagPollingActive) {
          get().stopPolling();
          set({ isRagPollingActive: false });
          await notifyRagComplete();
        }

        // failed 감지 시 폴링 중지 + 전처리 모드 해제
        if (overall === "failed" && get().pollingStatus === "polling") {
          get().stopPolling();
          set({ isRagPollingActive: false });
        }
      } catch (error) {
        const failCount = get().consecutiveFailCount + 1;
        const message =
          error instanceof Error ? error.message : "RAG 히스토리 조회 실패";

        logger.error(`fetchRagHistory 실패 (${failCount}/${MAX_CONSECUTIVE_FAIL}):`, error);

        set({
          isLoading: false,
          error: message,
          consecutiveFailCount: failCount,
        });

        // 3회 연속 실패 시 자동 중지
        if (failCount >= MAX_CONSECUTIVE_FAIL) {
          logger.warn("연속 실패 한도 초과 — 폴링 자동 중지");
          get().stopPolling();
          set({ isRagPollingActive: false });
          showToast("RAG 상태 확인에 실패했습니다. 설정에서 다시 확인해주세요.", "error");
        }
      }
    },

    startPolling: () => {
      const { monitoringDbId } = get();
      if (monitoringDbId == null) return;

      set({ pollingStatus: "polling" });
      startRagPolling(() => {
        const dbId = get().monitoringDbId;
        if (dbId != null) {
          get().fetchRagHistory(dbId);
        }
      });
    },

    stopPolling: () => {
      stopPollingTimer();
      set({ pollingStatus: "idle" });
    },

    requestPreprocessing: async (connectionId, type = RagType.ALL) => {
      set({ isLoading: true, error: null });

      try {
        const response = await ragService.requestPreprocessing({
          connectionId,
          type,
        });

        set({ isLoading: false });

        if (response.success) {
          get().startPreprocessingMode(connectionId);
          return true;
        }

        set({ error: response.message || "전처리 요청 실패" });
        return false;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "전처리 요청 중 오류 발생";
        logger.error("requestPreprocessing:", error);
        set({ isLoading: false, error: message });
        // 실패 시 전처리 모드 미진입
        return false;
      }
    },

    startPreprocessingMode: (dbId) => {
      set({
        monitoringDbId: dbId,
        isRagPollingActive: true,
        // 캐시 전체 클리어 (Cross-Connection 삭제로 다른 DB도 무효화)
        ragHistoryMap: { [dbId]: [] },
        error: null,
        consecutiveFailCount: 0,
      });

      // dbSelectionStore: RAG 완료 목록 비움 + 채팅 DB 선택 해제
      (async () => {
        try {
          const { useDbSelectionStore } = await import(
            "@/logic/common/db/dbSelectionStore"
          );
          useDbSelectionStore.setState({ ragCompletedDbConnections: [] });
          useDbSelectionStore.getState().setSelectedDbConnection(null);
        } catch (e) {
          logger.error("startPreprocessingMode — clear ragCompleted failed:", e);
        }
      })();

      get().startPolling();
    },

    clearError: () => set({ error: null }),

    reset: () => {
      get().stopPolling();
      set({
        monitoringDbId: null,
        ragHistoryMap: {},
        pollingStatus: "idle",
        isRagPollingActive: false,
        lastPolledAt: null,
        isLoading: false,
        error: null,
        consecutiveFailCount: 0,
      });
    },
  };
});
