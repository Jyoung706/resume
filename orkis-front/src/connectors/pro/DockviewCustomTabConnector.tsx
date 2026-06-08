// ============================================
// DockviewCustomTabConnector — DockviewCustomTab(Design) ↔ queryPanelStore
// rename 시 store 와 dockview 양쪽을 동시에 갱신해 일관성 유지
// ============================================

import type { IDockviewPanelHeaderProps } from "dockview-react";
import { DockviewCustomTab } from "@/pages/pro/parts/DockviewCustomTab";
import { useQueryPanelStore } from "@/logic/common/pro/stores/queryPanelStore";

export function DockviewCustomTabConnector(props: IDockviewPanelHeaderProps) {
  const { api, params } = props;
  const tabId = params?.tabId as string | undefined;

  // store 의 title 을 source of truth 로 — rename 후 즉시 반영, persist 도 함께
  const storeTitle = useQueryPanelStore((s) =>
    tabId ? s.tabs.find((t) => t.id === tabId)?.title : undefined,
  );
  const updateTab = useQueryPanelStore((s) => s.updateTab);

  const title = storeTitle ?? api.title ?? "Query";

  const handleRename = tabId
    ? (next: string) => {
        updateTab(tabId, { title: next });
        // dockview 의 toJSON 스냅샷에도 새 title 이 반영되도록 동기 호출
        api.setTitle(next);
      }
    : undefined;

  return (
    <DockviewCustomTab
      title={title}
      onClose={() => api.close()}
      onRename={handleRename}
    />
  );
}
