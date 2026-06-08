// ============================================
// QueryWorkspaceConnector — 탭별 Inner Dockview 오케스트레이션
// innerComponents를 조립하여 QueryWorkspace에 주입
// ============================================

import type { IDockviewPanelProps } from "dockview-react";
import { QueryWorkspace } from "@/pages/pro/parts/QueryWorkspace";
import { InnerDockviewTab } from "@/pages/pro/parts/InnerDockviewTab";
import { SectionErrorBoundary } from "@/components/ui/ErrorFallback";
import { useQueryPanelStore } from "@/logic/common/pro/stores/queryPanelStore";
import { useThemeModeContext } from "@/design-system";
import { EditorPanelConnector } from "./EditorPanelConnector";
import { ResultsPanelConnector } from "./ResultsPanelConnector";

// 표준 SectionErrorBoundary로 감싼 Inner 패널 컴포넌트
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WrappedEditorPanel: React.FC<any> = (props) => (
  <SectionErrorBoundary
    name="pro-editor-panel"
    message="SQL Editor에서 오류가 발생했습니다."
  >
    <EditorPanelConnector {...props} />
  </SectionErrorBoundary>
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WrappedResultsPanel: React.FC<any> = (props) => (
  <SectionErrorBoundary
    name="pro-results-panel"
    message="Results에서 오류가 발생했습니다."
  >
    <ResultsPanelConnector {...props} />
  </SectionErrorBoundary>
);

// Inner dockview에 등록되는 패널 컴포넌트
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const innerComponents: Record<string, React.FC<any>> = {
  EditorPanel: WrappedEditorPanel,
  ResultsPanel: WrappedResultsPanel,
};

export function QueryWorkspaceConnector(props: IDockviewPanelProps) {
  const tabId = props.params.tabId as string;

  const tab = useQueryPanelStore((s) => s.tabs.find((t) => t.id === tabId));
  const setPanelState = useQueryPanelStore((s) => s.setPanelState);
  const setSplitOrientation = useQueryPanelStore((s) => s.setSplitOrientation);
  const { resolvedMode } = useThemeModeContext();
  const isDark = resolvedMode === "dark";

  if (!tab) return null;

  return (
    <QueryWorkspace
      tabId={tabId}
      panelState={tab.panelState}
      onSetPanelState={(state) => setPanelState(tabId, state)}
      // 구버전 persist 데이터에 splitOrientation 누락 시 "vertical" fallback.
      splitOrientation={tab.splitOrientation ?? "vertical"}
      onSetSplitOrientation={(orientation) => setSplitOrientation(tabId, orientation)}
      innerComponents={innerComponents}
      innerDefaultTabComponent={InnerDockviewTab}
      isDark={isDark}
    />
  );
}
