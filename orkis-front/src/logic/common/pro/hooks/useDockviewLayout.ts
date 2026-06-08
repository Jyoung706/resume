/**
 * useDockviewLayout — Outer dockview API 래핑 훅
 * 레이아웃 저장/복원/초기화 + 탭 동기화
 */
import { useCallback, useRef, useEffect } from "react";
import type { DockviewApi } from "dockview-react";
import { useProModeLayoutStore } from "@/logic/common/pro/stores/proModeLayoutStore";
import { useQueryPanelStore } from "@/logic/common/pro/stores/queryPanelStore";
import { useDbSelectionStore } from "@/logic/common/db/dbSelectionStore";

const SAVE_DEBOUNCE_MS = 500;

const panelIdOf = (tabId: string) => `query-tab-${tabId}`;

// QueryWorkspace 패널 1건을 dockview 에 추가. position 옵션은 batch 추가 시
// 첫 패널 이후의 패널을 동일 그룹에 붙이기 위함.
function addQueryPanel(
  api: DockviewApi,
  tab: { id: string; title: string },
  options?: { referencePanelId?: string },
) {
  api.addPanel({
    id: panelIdOf(tab.id),
    component: "QueryWorkspace",
    title: tab.title,
    params: { tabId: tab.id },
    ...(options?.referencePanelId && {
      position: { referencePanel: options.referencePanelId },
    }),
  });
}

// 여러 탭을 동일 그룹에 순차 배치. 첫 탭이 reference 가 됨.
function addPanelsFromTabs(api: DockviewApi, tabs: Array<{ id: string; title: string }>) {
  if (tabs.length === 0) return;
  const referenceId = panelIdOf(tabs[0].id);
  tabs.forEach((tab, index) => {
    addQueryPanel(api, tab, index > 0 ? { referencePanelId: referenceId } : undefined);
  });
}

export function useDockviewLayout() {
  const apiRef = useRef<DockviewApi | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disposablesRef = useRef<Array<{ dispose: () => void }>>([]);
  const isResettingRef = useRef(false);

  const setSavedLayoutJson = useProModeLayoutStore((s) => s.setSavedLayoutJson);
  const savedLayoutJson = useProModeLayoutStore((s) => s.savedLayoutJson);

  // ── 레이아웃 저장 (debounce) ──
  const saveLayout = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const api = apiRef.current;
      if (api) {
        setSavedLayoutJson(api.toJSON() as object);
      }
    }, SAVE_DEBOUNCE_MS);
  }, [setSavedLayoutJson]);

  // ── 기본 레이아웃 초기화 (저장 데이터 없을 때) ──
  const initializeDefaultLayout = useCallback((api: DockviewApi) => {
    const store = useQueryPanelStore.getState();
    const tabs = store.tabs;

    if (tabs.length === 0) {
      const tabId = store.addTab();
      // 시스템 자동 생성 (0 → 1) 이므로 MAX_TABS 제한 미발동 → tabId 는 항상 string.
      // 단 타입 안전성 위해 null 가드.
      if (tabId === null) return;
      // store 의 default title (NewTab) 을 그대로 사용해 dockview/store 일관성 유지
      const newTab = useQueryPanelStore.getState().tabs.find((t) => t.id === tabId);
      addQueryPanel(api, { id: tabId, title: newTab?.title ?? "NewTab" });
      // 채팅에서 선택된 DB를 초기 탭에도 적용
      const chatDb = useDbSelectionStore.getState().selectedDbConnection;
      if (chatDb) {
        store.updateTab(tabId, { selectedDbId: String(chatDb.connectionId) });
      }
    } else {
      addPanelsFromTabs(api, tabs);

      // 활성 탭 복원
      if (store.activeTabId) {
        const activePanel = api.getPanel(panelIdOf(store.activeTabId));
        activePanel?.api.setActive();
      }
    }
  }, []);

  // ── 저장된 레이아웃 복원 ──
  const restoreLayout = useCallback(
    (api: DockviewApi): boolean => {
      if (!savedLayoutJson) return false;
      try {
        api.fromJSON(savedLayoutJson as Parameters<DockviewApi["fromJSON"]>[0]);
        return true;
      } catch {
        return false;
      }
    },
    [savedLayoutJson]
  );

  // ── 레이아웃 초기화 (기존 탭/데이터 유지, 배치만 리셋) ──
  const resetLayout = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;

    const store = useQueryPanelStore.getState();
    const existingTabs = [...store.tabs]; // snapshot before clear
    const activeTabId = store.activeTabId;

    // clear 중 이벤트로 store 탭 삭제 방지
    isResettingRef.current = true;
    try {
      api.clear();
    } finally {
      isResettingRef.current = false;
    }

    addPanelsFromTabs(api, existingTabs);

    // 활성 탭 복원
    if (activeTabId) {
      const activePanel = api.getPanel(panelIdOf(activeTabId));
      activePanel?.api.setActive();
    }

    // 각 탭 panelState normal로 리셋
    existingTabs.forEach((tab) => {
      store.setPanelState(tab.id, "normal");
    });

    setSavedLayoutJson(null);
  }, [setSavedLayoutJson]);

  // ── 새 탭 추가 (옵션: SQL 쿼리 포함) ──
  const addTab = useCallback((options?: { sqlQuery?: string }) => {
    const api = apiRef.current;
    if (!api) return;

    const tabId = useQueryPanelStore.getState().addTab();
    // MAX_TABS soft limit 도달 시 store 가 null 반환 + 사용자 토스트 발행.
    // 여기서는 panel 추가 없이 종료 — store 와 dockview panel 갯수 일관성 유지.
    if (tabId === null) return;
    // addTab 이후 최신 상태에서 새 탭 정보 읽기 (stale snapshot 방지)
    const newTab = useQueryPanelStore.getState().tabs.find((t) => t.id === tabId);

    addQueryPanel(api, { id: tabId, title: newTab?.title ?? "NewTab" });

    // 채팅에서 선택된 DB를 새 탭의 초기 DB로 설정
    const chatDb = useDbSelectionStore.getState().selectedDbConnection;
    const patch: Record<string, unknown> = {};
    if (chatDb) {
      patch.selectedDbId = String(chatDb.connectionId);
    }
    if (options?.sqlQuery) {
      patch.sqlQuery = options.sqlQuery;
    }
    if (Object.keys(patch).length > 0) {
      useQueryPanelStore.getState().updateTab(tabId, patch);
    }
  }, []);

  // ── 현재 활성 탭 닫기 ──
  const closeActiveTab = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    const activeTabId = useQueryPanelStore.getState().activeTabId;
    if (!activeTabId) return;
    const panel = api.getPanel(panelIdOf(activeTabId));
    if (panel) {
      api.removePanel(panel);
    }
  }, []);

  // ── 탭 인덱스로 이동 (Alt+1~9) ──
  const activateTabByIndex = useCallback((index: number) => {
    const api = apiRef.current;
    if (!api) return;
    const tabs = useQueryPanelStore.getState().tabs;
    if (index < 0 || index >= tabs.length) return;
    const panel = api.getPanel(panelIdOf(tabs[index].id));
    if (panel) {
      panel.api.setActive();
    }
  }, []);

  // ── dockview ready 핸들러 ──
  const handleReady = useCallback(
    (api: DockviewApi) => {
      apiRef.current = api;

      // 저장 레이아웃 복원 시도, 실패 시 기본 레이아웃
      const restored = restoreLayout(api);
      if (!restored) {
        initializeDefaultLayout(api);
      }

      // 이벤트 구독
      disposablesRef.current = [
        api.onDidLayoutChange(() => saveLayout()),
        api.onDidActivePanelChange((event) => {
          if (isResettingRef.current || !event) return;
          // event 는 IDockviewPanel 자체. `event.panel` 은 존재하지 않으므로
          // 이전 코드는 항상 tabId=undefined 였고 store sync 가 동작하지 않았다.
          const tabId = event.params?.tabId as string | undefined;
          if (tabId) {
            useQueryPanelStore.getState().setActiveTab(tabId);
          }
        }),
        api.onDidRemovePanel((event) => {
          if (isResettingRef.current) return;
          const tabId = event?.params?.tabId as string | undefined;
          if (tabId) {
            useQueryPanelStore.getState().removeTab(tabId);
          }
          // 모든 패널이 닫혔다면 default 탭을 즉시 추가해 store↔dockview 동기 유지
          if (api.panels.length === 0) {
            addTab();
          }
        }),
      ];

      // 초기 복원/기본 배치 시점에는 listener 가 아직 없어 onDidActivePanelChange
      // 가 store 까지 도달하지 못한다. dockview 의 현재 활성 패널을 source of truth
      // 로 삼아 store activeTabId 와 강제 동기화한다.
      const initialActiveTabId = api.activePanel?.params?.tabId as string | undefined;
      if (initialActiveTabId) {
        useQueryPanelStore.getState().setActiveTab(initialActiveTabId);
      }

      // 복원된 dockview 패널 갯수 vs store.tabs 가 어긋날 수 있다(이전 버전의
      // removeTab 자동 default 생성으로 누적된 stale tabs). dockview 패널을
      // source of truth 로 삼아 store 의 stale 탭을 정리한다.
      const dockviewTabIds = new Set(
        api.panels
          .map((p) => p.params?.tabId as string | undefined)
          .filter((id): id is string => Boolean(id))
      );
      const storeTabs = useQueryPanelStore.getState().tabs;
      const staleTabs = storeTabs.filter((t) => !dockviewTabIds.has(t.id));
      if (staleTabs.length > 0 && dockviewTabIds.size > 0) {
        for (const tab of staleTabs) {
          useQueryPanelStore.getState().removeTab(tab.id);
        }
      }
    },
    [restoreLayout, initializeDefaultLayout, saveLayout, addTab]
  );

  // ── 외부에서 enqueue된 addTabWithSql 큐를 drain ──
  // store는 단순 큐만 보유 (콜백 등록 X). 컨슈머인 useDockviewLayout이 dockview
  // API 준비 후 큐를 비워가며 탭을 추가한다. 이전 _addTabFn 콜백 등록 패턴 제거.
  const drainPendingSql = useCallback(() => {
    if (!apiRef.current) return;
    const queue = useProModeLayoutStore.getState().flushPendingSql();
    for (const sql of queue) {
      addTab({ sqlQuery: sql });
    }
  }, [addTab]);

  // dockview ready 직후 즉시 drain (handleReady 이후 첫 effect 실행에서 잡힘)
  // + store 큐 변경 감시 (ChatMiniConnector 등에서 신규 enqueue 시 자동 처리)
  useEffect(() => {
    drainPendingSql();
    return useProModeLayoutStore.subscribe(drainPendingSql);
  }, [drainPendingSql]);

  // ── cleanup ──
  useEffect(() => {
    return () => {
      disposablesRef.current.forEach((d) => d.dispose());
      disposablesRef.current = [];
      // pending save timer는 cancel 대신 flush — unmount 직전 변경된 레이아웃이
      // 다음 mount의 restoreLayout에 반영되지 않으면 dockview 내부 활성 그룹/패널
      // 상태가 store와 어긋나 탭/헤더 시각이 일관성을 잃을 수 있다.
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        const api = apiRef.current;
        if (api) {
          try {
            setSavedLayoutJson(api.toJSON() as object);
          } catch {
            // dockview가 이미 dispose된 경우 무시
          }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    apiRef,
    handleReady,
    resetLayout,
    addTab,
    closeActiveTab,
    activateTabByIndex,
  };
}
