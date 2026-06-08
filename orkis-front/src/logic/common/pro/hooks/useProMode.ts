// ============================================
// useProMode — Pro 모드 최상위 합성 훅
//
// ProModeConnector가 직접 호출하던 9+ 훅을 한 단위로 묶어 1:1:1 매핑(Page ↔
// Connector ↔ useHook) 을 완성한다. 커넥터는 이 훅 결과를 ProModeShell의
// props로 매핑만 한다.
//
// 책임:
//   1. dockview API 라이프사이클 (useDockviewLayout)
//   2. 좌/우 사이드바 상태 (proModeLayoutStore + rightSidebarStore + 로컬 width)
//   3. 상태바 표시 정보 (queryPanelStore + dbSelectionStore 합성)
//   4. 단축키 cheatsheet 데이터·열림 상태
//   5. 첫 진입 onboarding 토스트
//   6. 전역 키보드 단축키 디스패치 (PRO_SHORTCUTS)
//   7. "일반 모드 전환" 라우팅 (useNavigate + gradeStore)
//   8. 테마 (isDark)
// ============================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { ShortcutsCheatsheetGroup } from "@/components/domain/ShortcutsCheatsheet";
import { useThemeModeContext } from "@/design-system";
import { useAuthStore } from "@/logic/common/auth/authStore";
import { useDbSelectionStore } from "@/logic/common/db/dbSelectionStore";
import { useGradeStore } from "@/logic/common/grade/gradeStore";
import { useDockviewLayout } from "@/logic/common/pro/hooks/useDockviewLayout";
import {
  PRO_SHORTCUTS,
  PRO_SHORTCUT_CATEGORY_LABEL,
  getCheatsheetRows,
  type ProShortcutCategory
} from "@/logic/common/pro/shortcuts/proShortcuts";
import { useProModeLayoutStore } from "@/logic/common/pro/stores/proModeLayoutStore";
import { useQueryPanelStore } from "@/logic/common/pro/stores/queryPanelStore";
import type { ProStatusBarInfo } from "@/logic/common/pro/types/proMode.types";
import { useRightSidebarStore } from "@/logic/common/ui/rightSidebarStore";
import type { RightSidebarTab } from "@/logic/common/ui/types";
import { showToast } from "@/logic/shared/utils/toast";
import type { DockviewApi } from "dockview-react";

// ── 좌측 사이드바 width 제한 ──
// 아이콘 레일(44px) 을 포함한 전체 ProModeShell__left 너비. 실제 콘텐츠 영역은
// (width - 44) 만큼 사용 가능. 채팅·스키마·히스토리 패널의 가독성을 고려해
// 기본/최대값을 충분히 넓게 설정.
const LEFT_MIN = 200;
const LEFT_MAX = 800;
const LEFT_DEFAULT = 520;

// ── 단축키 도움말 카테고리 표시 순서 ──
const SHORTCUT_CATEGORY_ORDER: ProShortcutCategory[] = [
  "tab",
  "editor",
  "panel",
  "view"
];

// ── onboarding 토스트 메시지·지연 ──
const ONBOARDING_TOAST_MESSAGE =
  "단축키 도움말은 Ctrl+Shift+/ 또는 좌상단 키보드 아이콘으로 열 수 있습니다.";
const ONBOARDING_DELAY_MS = 800;

export interface UseProModeReturn {
  /** dockview 라이프사이클 + 테마 */
  dockview: {
    handleReady: (api: DockviewApi) => void;
    isDark: boolean;
  };

  /** TopBar에 매핑할 액션들 */
  topbar: {
    onResetLayout: () => void;
    onAddTab: () => void;
    onShowShortcuts: () => void;
    onGoToNormalMode: () => void;
    onLogout: () => void;
  };

  /** 좌측 사이드바 상태/제어 */
  leftSidebar: {
    isCollapsed: boolean;
    width: number;
    onResize: (delta: number) => void;
  };

  /** 우측 사이드바 상태/제어 */
  rightSidebar: {
    isOpen: boolean;
    activeTab: RightSidebarTab;
    isFullScreen: boolean;
    onTabChange: (tab: RightSidebarTab) => void;
    onOpen: (tab: RightSidebarTab) => void;
    onClose: () => void;
    onToggleFullScreen: () => void;
  };

  /** 상태바에 표시할 정보 (활성 탭/DB/결과) */
  statusBar: ProStatusBarInfo;

  /** 단축키 도움말 다이얼로그 상태 + 그룹화된 데이터 */
  cheatsheet: {
    isOpen: boolean;
    onClose: () => void;
    groups: ShortcutsCheatsheetGroup[];
  };
}

export function useProMode(): UseProModeReturn {
  // ── dockview ──
  const {
    handleReady,
    resetLayout,
    addTab,
    closeActiveTab,
    activateTabByIndex
  } = useDockviewLayout();

  // ── 테마 ──
  const { resolvedMode } = useThemeModeContext();
  const isDark = resolvedMode === "dark";

  // ── 일반 모드 전환 ──
  const navigate = useNavigate();
  const setGrade = useGradeStore((s) => s.setGrade);
  const handleGoToNormalMode = useCallback(() => {
    setGrade("general");
    navigate("/chat");
  }, [navigate, setGrade]);

  // ── 로그아웃 (일반 모드 ChatHeader 와 동일한 authStore action 사용) ──
  const logout = useAuthStore((s) => s.logout);

  // ── 좌측 사이드바 ──
  const isLeftCollapsed = useProModeLayoutStore(
    (s) => s.leftSideBar.isCollapsed
  );
  const togglePanel = useProModeLayoutStore((s) => s.togglePanel);
  const [leftWidth, setLeftWidth] = useState(LEFT_DEFAULT);
  const handleLeftResize = useCallback((delta: number) => {
    setLeftWidth((w) => Math.min(LEFT_MAX, Math.max(LEFT_MIN, w + delta)));
  }, []);

  // ── 우측 사이드바 ──
  const rightSidebarStore = useRightSidebarStore();

  // ── 상태바 ──
  const activeTabId = useQueryPanelStore((s) => s.activeTabId);
  const activeTab = useQueryPanelStore((s) =>
    s.tabs.find((t) => t.id === s.activeTabId)
  );
  const activeResult = useQueryPanelStore((s) =>
    activeTabId ? s.queryResults[activeTabId] : null
  );
  const dbConnections = useDbSelectionStore((s) => s.dbConnections);
  const activeDbName = activeTab?.selectedDbId
    ? (dbConnections.find(
        (c) => String(c.connectionId) === activeTab.selectedDbId
      )?.connectionName ?? null)
    : null;

  const statusBar: ProStatusBarInfo = {
    dbName: activeDbName,
    schemaName: activeTab?.selectedSchema ?? null,
    rowCount: activeResult?.rowCount ?? null,
    executionTime: activeResult?.executionTime ?? null
  };

  // ── 단축키 cheatsheet 상태 ──
  const [isCheatsheetOpen, setCheatsheetOpen] = useState(false);
  const showCheatsheet = useCallback(() => setCheatsheetOpen(true), []);
  const closeCheatsheet = useCallback(() => setCheatsheetOpen(false), []);
  const toggleCheatsheet = useCallback(
    () => setCheatsheetOpen((prev) => !prev),
    []
  );

  // ── cheatsheet 표시용 그룹화 데이터 (Design은 logic을 모르므로 여기서 가공) ──
  const cheatsheetGroups = useMemo<ShortcutsCheatsheetGroup[]>(() => {
    const rows = getCheatsheetRows(PRO_SHORTCUTS);
    return SHORTCUT_CATEGORY_ORDER.map((cat) => ({
      id: cat,
      label: PRO_SHORTCUT_CATEGORY_LABEL[cat],
      rows: rows
        .filter((r) => r.category === cat)
        .map((r) => ({ keys: r.keys, label: r.label }))
    })).filter((g) => g.rows.length > 0);
  }, []);

  // ── C-4: 첫 진입 시 단축키 안내 토스트 (사용자별 1회) ──
  useEffect(() => {
    const { hasSeenShortcutsOnboarding, markShortcutsOnboardingSeen } =
      useProModeLayoutStore.getState();
    if (hasSeenShortcutsOnboarding) return;
    // dockview/Monaco 초기화 잡음 회피용 짧은 지연 후 표시
    const t = setTimeout(() => {
      showToast(ONBOARDING_TOAST_MESSAGE, "info");
      markShortcutsOnboardingSeen();
    }, ONBOARDING_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  // ── 전역 키보드 단축키 디스패치 ──
  const shortcutHandlers = useMemo<Record<string, () => void>>(() => {
    const tabActivationHandlers = Object.fromEntries(
      Array.from({ length: 9 }, (_, i) => [
        `activateTab${i + 1}`,
        () => activateTabByIndex(i)
      ])
    );
    return {
      addTab: () => {
        addTab();
      },
      closeActiveTab: () => {
        closeActiveTab();
      },
      toggleLeftSidebar: () => {
        const { leftSideBar } = useProModeLayoutStore.getState();
        togglePanel(leftSideBar.activePanel);
      },
      toggleChatPanel: () => {
        togglePanel("chat");
      },
      toggleEditorMaximize: () => {
        const store = useQueryPanelStore.getState();
        if (!store.activeTabId) return;
        const tab = store.tabs.find((t) => t.id === store.activeTabId);
        if (!tab) return;
        store.setPanelState(
          tab.id,
          tab.panelState === "editor-maximized" ? "normal" : "editor-maximized"
        );
      },
      showShortcuts: toggleCheatsheet,
      ...tabActivationHandlers
    };
  }, [
    addTab,
    closeActiveTab,
    activateTabByIndex,
    togglePanel,
    toggleCheatsheet
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ── IME composing 중에는 글로벌 단축키 처리 스킵 ──
      // 한글 입력 합성 중 keydown 이벤트가 일찍 발생할 수 있는데, 여기서
      // preventDefault 가 호출되면 IME가 조합한 문자가 입력되지 않을 수 있다.
      // PRO_SHORTCUTS 모두 Alt/Ctrl modifier 가 필요하므로 IME 입력 중 매칭될
      // 일은 거의 없지만, 방어적으로 명시 스킵.
      if (e.isComposing) return;

      for (const shortcut of PRO_SHORTCUTS) {
        // editor scope 항목은 Monaco editor.addAction이 디스패치 — 전역 루프 스킵
        if ((shortcut.scope ?? "global") !== "global") continue;
        if (shortcut.match(e)) {
          e.preventDefault();
          shortcutHandlers[shortcut.id]?.();
          return;
        }
      }
    };
    // capture: false (bubble phase) — Monaco/입력 요소가 자체 핸들러를 먼저 처리.
    // 우리 핸들러는 PRO_SHORTCUTS 매칭 시에만 preventDefault 하므로 일반 텍스트
    // 입력 키 ('c' 등)에는 영향 없음.
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcutHandlers]);

  return {
    dockview: {
      handleReady,
      isDark
    },
    topbar: {
      onResetLayout: resetLayout,
      onAddTab: addTab,
      onShowShortcuts: showCheatsheet,
      onGoToNormalMode: handleGoToNormalMode,
      onLogout: logout
    },
    leftSidebar: {
      isCollapsed: isLeftCollapsed,
      width: leftWidth,
      onResize: handleLeftResize
    },
    rightSidebar: {
      isOpen: rightSidebarStore.isOpen,
      activeTab: rightSidebarStore.activeTab,
      isFullScreen: rightSidebarStore.isFullScreen,
      onTabChange: rightSidebarStore.setActiveTab,
      onOpen: rightSidebarStore.openPanel,
      onClose: rightSidebarStore.closePanel,
      onToggleFullScreen: rightSidebarStore.toggleFullScreen
    },
    statusBar,
    cheatsheet: {
      isOpen: isCheatsheetOpen,
      onClose: closeCheatsheet,
      groups: cheatsheetGroups
    }
  };
}
