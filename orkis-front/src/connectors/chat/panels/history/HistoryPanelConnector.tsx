// ============================================
// HistoryPanelConnector — 채팅 이력 커넥터
// useHistoryPanel 훅 -> HistoryPanel Design 연결
// ============================================

import { HistoryPanel } from "@/pages/chat/panels/history/HistoryPanel";
import { useHistoryPanel } from "@/logic/chat/panels/history/useHistoryPanel";
import { useSqlViewStore } from "@/logic/common/chat/stores/sqlViewStore";

export function HistoryPanelConnector() {
  const panel = useHistoryPanel();
  const openSqlView = useSqlViewStore((s) => s.openSqlView);

  return (
    <HistoryPanel
      items={panel.items}
      expandedId={panel.expandedId}
      loading={panel.loading}
      loadingMore={panel.loadingMore}
      hasMore={panel.hasMore}
      totalCount={panel.totalCount}
      onToggleExpand={panel.onToggleExpand}
      onViewSql={(sql) => openSqlView(sql)}
      onLoadMore={panel.onLoadMore}
    />
  );
}
