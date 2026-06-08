/**
 * proModeLayoutStore — Pro Mode 레이아웃 상태 관리
 * 좌측 사이드바 상태 + Outer dockview 레이아웃 직렬화 데이터
 * persist: localStorage (userId별 키 분리)
 *
 * dockview 와의 협업:
 *   - addTabWithSql 은 단순 큐 enqueue 만 한다 (콜백 등록 X).
 *   - 컨슈머(useDockviewLayout)는 store 변경을 subscribe 하면서 dockview API
 *     준비 시점에 flushPendingSql() 로 큐를 비워가며 탭을 추가한다.
 *   - 이전 버전에서 store 가 React 콜백(_addTabFn)을 보관하던 안티패턴 제거.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SideBarPanel } from "@/logic/common/pro/types/proMode.types";
import { createUserStorage } from "./createUserStorage";

interface ProModeLayoutState {
  leftSideBar: {
    activePanel: SideBarPanel;
    isCollapsed: boolean;
  };
  savedLayoutJson: object | null;

  /** 단축키 도움말 onboarding 토스트 노출 여부 (사용자별 1회) */
  hasSeenShortcutsOnboarding: boolean;

  /**
   * dockview 가 준비되기 전(또는 다른 사유로 즉시 처리 불가)에 누적되는
   * SQL 텍스트 큐. 컨슈머(useDockviewLayout)가 flushPendingSql() 로 비운다.
   * persist 대상 아님 — 새로고침 시 드롭.
   */
  pendingSqlQueue: string[];

  setActivePanel: (panel: SideBarPanel) => void;
  togglePanel: (panel: SideBarPanel) => void;
  setSavedLayoutJson: (json: object | null) => void;
  markShortcutsOnboardingSeen: () => void;
  /** "SQL 보기 → 새 쿼리 탭" 같이 외부에서 SQL을 탭으로 열고 싶을 때 enqueue */
  addTabWithSql: (sqlQuery: string) => void;
  /** 큐를 모두 꺼내 반환하고 비운다 (컨슈머 전용) */
  flushPendingSql: () => string[];
  reset: () => void;
}

const INITIAL_STATE = {
  leftSideBar: {
    activePanel: "chat" as SideBarPanel,
    isCollapsed: false,
  },
  savedLayoutJson: null,
  hasSeenShortcutsOnboarding: false,
  pendingSqlQueue: [] as string[],
};

export const useProModeLayoutStore = create<ProModeLayoutState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      setActivePanel: (panel) =>
        set({
          leftSideBar: { ...get().leftSideBar, activePanel: panel, isCollapsed: false },
        }),

      // 같은 패널 + 열림 → 접기, 다른 패널 or 접힘 → 해당 패널로 열기
      togglePanel: (panel) => {
        const { leftSideBar } = get();
        if (!leftSideBar.isCollapsed && leftSideBar.activePanel === panel) {
          set({ leftSideBar: { ...leftSideBar, isCollapsed: true } });
        } else {
          set({ leftSideBar: { activePanel: panel, isCollapsed: false } });
        }
      },

      setSavedLayoutJson: (json) => set({ savedLayoutJson: json }),

      markShortcutsOnboardingSeen: () =>
        set({ hasSeenShortcutsOnboarding: true }),

      addTabWithSql: (sqlQuery) =>
        set((state) => ({
          pendingSqlQueue: [...state.pendingSqlQueue, sqlQuery],
        })),

      flushPendingSql: () => {
        const queue = get().pendingSqlQueue;
        if (queue.length === 0) return [];
        set({ pendingSqlQueue: [] });
        return queue;
      },

      reset: () => set(INITIAL_STATE),
    }),
    {
      name: "orkis-pro-layout",
      storage: createJSONStorage(() => createUserStorage()),
      // queryPanelStore 와 동일 — 사용자별 키 적용 보장 위해 수동 rehydrate.
      skipHydration: true,
      partialize: (state) => ({
        leftSideBar: state.leftSideBar,
        savedLayoutJson: state.savedLayoutJson,
        hasSeenShortcutsOnboarding: state.hasSeenShortcutsOnboarding,
      }),
    }
  )
);
