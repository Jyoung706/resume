/**
 * queryPanelStore — SQL 쿼리 탭/결과/히스토리 상태 관리
 * persist: 탭 목록/SQL/히스토리만 저장, 실행 결과는 런타임 전용
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createUserStorage } from "./createUserStorage";
import { showToast } from "@/logic/shared/utils/toast";
import type {
  QueryTab,
  QueryResult,
  QueryHistory,
  PanelState,
  SplitOrientation,
} from "@/logic/common/pro/types/proMode.types";

/**
 * 멀티탭 메모리 가드 — 동시 열기 가능한 탭 수 soft limit.
 * 5만행 결과 + Monaco 에디터가 탭마다 누적되므로 8탭 ≈ ~1GB 메모리 추정.
 * 그 이상에서 저사양 디바이스 OOM 위험 → 사용자에게 안내 + 추가 차단.
 * 시스템 자동 생성 (tabs.length === 0 시) 은 항상 1개 추가이므로 limit 미발동.
 */
export const MAX_TABS = 8;

interface QueryPanelState {
  tabs: QueryTab[];
  activeTabId: string | null;
  historyByTab: Record<string, QueryHistory[]>;

  // runtime only (persist 안 함)
  queryResults: Record<string, QueryResult>;
  isExecuting: Record<string, boolean>;
  errorByTab: Record<string, string | null>;
  // 탭별 진행 중 AbortController — 쿼리 실행 중지(Cancel) 용도.
  // AbortController 는 직렬화 불가능 → partialize 에서 명시적으로 제외됨.
  controllerByTab: Record<string, AbortController>;
  // 탭별 진행 중 executionId — Phase 2 백엔드 SQLite interrupt 추적 ID.
  // 런타임 전용. cancel 시 백엔드 /query/cancel 호출에 사용.
  executionIdByTab: Record<string, string>;

  // 탭 CRUD
  // addTab: MAX_TABS 도달 시 null 반환 + 사용자 토스트. caller 는 null 처리 필요.
  addTab: () => string | null;
  removeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTab: (tabId: string, patch: Partial<Pick<QueryTab, "title" | "sqlQuery" | "selectedDbId" | "selectedSchema" | "rowLimit">>) => void;

  // 패널 상태
  setPanelState: (tabId: string, state: PanelState) => void;
  // 분할 방향 (vertical/horizontal). 사용자가 dockview drag 로 전환 시 store 반영.
  setSplitOrientation: (tabId: string, orientation: SplitOrientation) => void;

  // 실행 결과
  setQueryResult: (tabId: string, result: QueryResult) => void;
  setExecuting: (tabId: string, executing: boolean) => void;
  setError: (tabId: string, error: string | null) => void;
  // AbortController 보관. null 이면 키 삭제 (실행 종료/취소 후 정리).
  setController: (tabId: string, controller: AbortController | null) => void;
  // executionId 보관. null 이면 키 삭제.
  setExecutionId: (tabId: string, executionId: string | null) => void;

  // 히스토리
  addHistory: (tabId: string, entry: QueryHistory) => void;
  clearAllHistory: () => void;

  reset: () => void;
}

let tabCounter = 0;
function generateTabId(): string {
  tabCounter += 1;
  return `tab-${Date.now()}-${tabCounter}`;
}

// 탭 default 제목. 길이 기반 인덱스(`Query ${tabs.length+1}`)는 중간 탭 close 후
// 새 탭 추가 시 같은 번호가 재발급되어 중복 표기되는 문제가 있어 사용 안 함.
// 사용자는 인라인 편집 (DockviewCustomTab) 으로 자유롭게 이름 변경.
const DEFAULT_TAB_TITLE = "NewTab";

function createDefaultTab(id: string): QueryTab {
  return {
    id,
    title: DEFAULT_TAB_TITLE,
    sqlQuery: "",
    selectedDbId: null,
    selectedSchema: null,
    rowLimit: 100,
    panelState: "normal",
    splitOrientation: "vertical",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const INITIAL_TAB_ID = generateTabId();

const INITIAL_STATE = {
  tabs: [createDefaultTab(INITIAL_TAB_ID)],
  activeTabId: INITIAL_TAB_ID,
  historyByTab: {} as Record<string, QueryHistory[]>,
  queryResults: {} as Record<string, QueryResult>,
  isExecuting: {} as Record<string, boolean>,
  errorByTab: {} as Record<string, string | null>,
  controllerByTab: {} as Record<string, AbortController>,
  executionIdByTab: {} as Record<string, string>,
};

export const useQueryPanelStore = create<QueryPanelState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      addTab: () => {
        const { tabs } = get();
        if (tabs.length >= MAX_TABS) {
          // 사용자 트리거 (Pro 모드 UI 의 + 버튼 등) 시에만 발동.
          // 시스템 자동 생성 (tabs.length === 0 → 1) 은 본 분기 도달 불가.
          showToast(
            `최대 ${MAX_TABS}개 탭까지 동시 사용 가능합니다. 기존 탭을 닫은 뒤 다시 시도해 주세요.`,
            "warning",
          );
          return null;
        }
        const id = generateTabId();
        const newTab = createDefaultTab(id);
        set({
          tabs: [...tabs, newTab],
          activeTabId: id,
        });
        return id;
      },

      removeTab: (tabId) => {
        // 마지막 탭의 default 자동 생성은 dockview 레이어(useDockviewLayout)
        // 책임이다. 여기서 자동 생성하면 dockview panel 갯수와 어긋난다.
        const { tabs, activeTabId, queryResults, isExecuting, errorByTab, historyByTab, controllerByTab, executionIdByTab } = get();

        // 진행 중인 쿼리가 있으면 abort — 탭 close 시 자동 cancel.
        // controller.abort() 는 idempotent 이며 useQueryExecution.execute 의 catch 에서
        // signal.aborted=true 분기로 결과·setError 폐기됨.
        // 백엔드 cancel 은 best-effort — useQueryExecution.cancel 이 같이 호출하지만
        // removeTab 경로에서도 일관성을 위해 호출.
        controllerByTab[tabId]?.abort();
        const pendingExecutionId = executionIdByTab[tabId];
        if (pendingExecutionId) {
          // dynamic import — store/service 간 순환 의존 회피.
          // fire-and-forget. cancelQuery 는 fail-soft 라 throw 안 함.
          void import("@/logic/common/chat/services/queryService").then((m) =>
            m.cancelQuery(pendingExecutionId),
          );
        }

        const filtered = tabs.filter((t) => t.id !== tabId);

        let nextActiveId: string | null = activeTabId;
        if (activeTabId === tabId) {
          if (filtered.length === 0) {
            nextActiveId = null;
          } else {
            const removedIndex = tabs.findIndex((t) => t.id === tabId);
            nextActiveId = filtered[Math.min(removedIndex, filtered.length - 1)].id;
          }
        }

        const { [tabId]: _r, ...restResults } = queryResults;
        const { [tabId]: _e, ...restExecuting } = isExecuting;
        const { [tabId]: _err, ...restErrors } = errorByTab;
        const { [tabId]: _h, ...restHistory } = historyByTab;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [tabId]: _c, ...restControllers } = controllerByTab;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [tabId]: _x, ...restExecutionIds } = executionIdByTab;
        set({
          tabs: filtered,
          activeTabId: nextActiveId,
          queryResults: restResults,
          isExecuting: restExecuting,
          errorByTab: restErrors,
          historyByTab: restHistory,
          controllerByTab: restControllers,
          executionIdByTab: restExecutionIds,
        });
      },

      setActiveTab: (tabId) => set({ activeTabId: tabId }),

      updateTab: (tabId, patch) =>
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId
              ? { ...t, ...patch, updatedAt: new Date().toISOString() }
              : t
          ),
        })),

      setPanelState: (tabId, panelState) =>
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId ? { ...t, panelState } : t
          ),
        })),

      setSplitOrientation: (tabId, splitOrientation) =>
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId ? { ...t, splitOrientation } : t
          ),
        })),

      setQueryResult: (tabId, result) =>
        set((state) => ({
          queryResults: { ...state.queryResults, [tabId]: result },
        })),

      setExecuting: (tabId, executing) =>
        set((state) => ({
          isExecuting: { ...state.isExecuting, [tabId]: executing },
        })),

      setError: (tabId, error) =>
        set((state) => ({
          errorByTab: { ...state.errorByTab, [tabId]: error },
        })),

      setController: (tabId, controller) =>
        set((state) => {
          if (controller === null) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [tabId]: _drop, ...rest } = state.controllerByTab;
            return { controllerByTab: rest };
          }
          return {
            controllerByTab: { ...state.controllerByTab, [tabId]: controller },
          };
        }),

      setExecutionId: (tabId, executionId) =>
        set((state) => {
          if (executionId === null) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [tabId]: _drop, ...rest } = state.executionIdByTab;
            return { executionIdByTab: rest };
          }
          return {
            executionIdByTab: { ...state.executionIdByTab, [tabId]: executionId },
          };
        }),

      addHistory: (tabId, entry) =>
        set((state) => {
          // Cancel + 즉시 close 동시 발생 시: removeTab 이 historyByTab[tabId] 를
          // 제거한 직후 microtask 로 도달한 execute() catch 가 stale "사용자 중지"
          // 항목을 다시 추가하면 localStorage(persist) 에 영구 잔존. 탭 존재 가드로 차단.
          if (!state.tabs.some((t) => t.id === tabId)) {
            return {};
          }
          return {
            historyByTab: {
              ...state.historyByTab,
              [tabId]: [entry, ...(state.historyByTab[tabId] ?? [])].slice(0, 100),
            },
          };
        }),

      clearAllHistory: () => set({ historyByTab: {} }),

      reset: () => {
        // 진행 중인 모든 쿼리 abort 후 INITIAL_STATE 로 복원.
        const { controllerByTab } = get();
        for (const controller of Object.values(controllerByTab)) {
          controller.abort();
        }
        set(INITIAL_STATE);
      },
    }),
    {
      name: "orkis-query-panel",
      storage: createJSONStorage(() => createUserStorage()),
      // 인증 결과(useAuthStore.user) 가 비동기로 채워지기 전에 module-load 시점에
      // 자동 hydrate 가 일어나면 createUserStorage 가 anonymous 키로 데이터를
      // 읽어 사용자 분리가 깨진다. useProStoresHydration 에서 수동 rehydrate.
      skipHydration: true,
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        historyByTab: state.historyByTab,
      }),
    }
  )
);
