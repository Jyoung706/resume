// ============================================
// ProModeConnector — Pro Mode 최상위 커넥터 (얇은 매핑 계층)
// useProMode() 합성 훅 결과를 ProModeShell의 props로 매핑한다.
// 1:1:1 매핑: pages/pro/ProModePage ↔ connectors/pro/ProModeConnector ↔ logic/common/pro/hooks/useProMode
// ============================================

import { DockviewReact, type DockviewReadyEvent } from "dockview-react";
import "dockview-react/dist/styles/dockview.css";
import { useCallback } from "react";

import { HeaderMenuActions } from "@/components/domain/HeaderMenuActions";
import { PageLoading } from "@/components/ui/PageLoading";
import { ShortcutsCheatsheet } from "@/components/domain/ShortcutsCheatsheet";
import { ThemeToggleConnector } from "@/connectors/common/ThemeToggleConnector";
import { RightSidebar } from "@/pages/chat/main/parts/RightSidebar";
import { ProModePage } from "@/pages/pro/ProModePage";
import { ProModeShell } from "@/pages/pro/parts/ProModeShell";
import { ProStatusBar } from "@/pages/pro/parts/ProStatusBar";

import { useProMode } from "@/logic/common/pro/hooks/useProMode";
import { useProStoresHydration } from "@/logic/common/pro/hooks/useProStoresHydration";

import { DockviewCustomTabConnector } from "./DockviewCustomTabConnector";
import { QueryWorkspaceConnector } from "./QueryWorkspaceConnector";
import { SideBarConnector } from "./SideBarConnector";

// Outer dockview에 등록되는 패널 컴포넌트 (Connector 참조 — Logic으로 옮길 수 없음)
const outerComponents = {
  QueryWorkspace: QueryWorkspaceConnector,
};

export function ProModeConnector() {
  // 사용자별 stores rehydrate — 완료 전까지 INITIAL_STATE 가 사용자에게
  // 노출되지 않도록 PageLoading 으로 게이팅. Inner 는 hydrated 보장 후 마운트.
  const hydrated = useProStoresHydration();
  if (!hydrated) {
    return (
      <ProModePage>
        <PageLoading />
      </ProModePage>
    );
  }
  return <ProModeConnectorInner />;
}

function ProModeConnectorInner() {
  const pro = useProMode();

  const onDockviewReady = useCallback(
    (event: DockviewReadyEvent) => {
      pro.dockview.handleReady(event.api);
    },
    [pro.dockview.handleReady],
  );

  return (
    <ProModePage>
      <ProModeShell
        onResetLayout={pro.topbar.onResetLayout}
        onAddTab={pro.topbar.onAddTab}
        onShowShortcuts={pro.topbar.onShowShortcuts}
        onGoToNormalMode={pro.topbar.onGoToNormalMode}
        isLeftCollapsed={pro.leftSidebar.isCollapsed}
        leftWidth={pro.leftSidebar.width}
        onLeftResize={pro.leftSidebar.onResize}
        leftSidebarContent={<SideBarConnector />}
        headerMenuActions={
          <HeaderMenuActions
            onOpenPanel={pro.rightSidebar.onOpen}
            onLogout={pro.topbar.onLogout}
            noticeUnreadCount={0}
            themeToggleSlot={<ThemeToggleConnector />}
          />
        }
        rightSidebar={{
          isOpen: pro.rightSidebar.isOpen,
          activeTab: pro.rightSidebar.activeTab,
          isFullScreen: pro.rightSidebar.isFullScreen,
          onTabChange: pro.rightSidebar.onTabChange,
          onClose: pro.rightSidebar.onClose,
          onToggleFullScreen: pro.rightSidebar.onToggleFullScreen,
        }}
        rightSidebarContent={
          <RightSidebar
            activeTab={pro.rightSidebar.activeTab}
            isFullScreen={pro.rightSidebar.isFullScreen}
            onTabChange={pro.rightSidebar.onTabChange}
            onClose={pro.rightSidebar.onClose}
            onToggleFullScreen={pro.rightSidebar.onToggleFullScreen}
          />
        }
        statusBarContent={<ProStatusBar info={pro.statusBar} />}
      >
        <DockviewReact
          components={outerComponents}
          defaultTabComponent={DockviewCustomTabConnector}
          onReady={onDockviewReady}
          className={`${pro.dockview.isDark ? "dockview-theme-dark" : "dockview-theme-light"} pro-mode-dockview outer-dockview`}
        />
      </ProModeShell>
      <ShortcutsCheatsheet
        isOpen={pro.cheatsheet.isOpen}
        onClose={pro.cheatsheet.onClose}
        groups={pro.cheatsheet.groups}
      />
    </ProModePage>
  );
}
