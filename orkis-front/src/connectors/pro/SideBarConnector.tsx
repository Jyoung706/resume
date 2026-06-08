// ============================================
// SideBarConnector — proModeLayoutStore → LeftSideBar 연결
// ============================================

import { LeftSideBar } from "@/pages/pro/parts/LeftSideBar";
import { SectionErrorBoundary } from "@/components/ui/ErrorFallback";
import { useProModeLayoutStore } from "@/logic/common/pro/stores/proModeLayoutStore";
import { ChatSessionHeaderConnector } from "./ChatSessionHeaderConnector";
import { ChatMiniConnector } from "./ChatMiniConnector";
import { HistoryPanelConnector } from "./HistoryPanelConnector";
import { SnippetsPanelConnector } from "./SnippetsPanelConnector";
import { SchemaBrowserPanelConnector } from "./SchemaBrowserPanelConnector";

export function SideBarConnector() {
  const { activePanel, isCollapsed } = useProModeLayoutStore((s) => s.leftSideBar);
  const togglePanel = useProModeLayoutStore((s) => s.togglePanel);

  return (
    <LeftSideBar
      activePanel={activePanel}
      isCollapsed={isCollapsed}
      onPanelChange={togglePanel}
      chatContent={
        <>
          <ChatSessionHeaderConnector />
          <SectionErrorBoundary
            name="pro-chat-mini"
            message="채팅에서 오류가 발생했습니다."
          >
            <ChatMiniConnector />
          </SectionErrorBoundary>
        </>
      }
      schemaContent={
        <SectionErrorBoundary
          name="pro-schema-browser"
          message="스키마에서 오류가 발생했습니다."
        >
          <SchemaBrowserPanelConnector />
        </SectionErrorBoundary>
      }
      historyContent={<HistoryPanelConnector />}
      snippetsContent={<SnippetsPanelConnector />}
    />
  );
}
