// ============================================
// HistoryPanelConnector — queryPanelStore → HistoryPanel 연결
// 모든 탭의 히스토리를 시간순으로 병합하여 표시
// ============================================

import { useMemo } from "react";
import { HistoryPanel } from "@/pages/pro/parts/HistoryPanel";
import { useQueryPanelStore } from "@/logic/common/pro/stores/queryPanelStore";
import { useTabSqlUpdater } from "@/logic/common/pro/hooks/useTabSqlUpdater";

export function HistoryPanelConnector() {
  const historyByTab = useQueryPanelStore((s) => s.historyByTab);
  const clearAllHistory = useQueryPanelStore((s) => s.clearAllHistory);

  // 모든 탭의 히스토리를 병합하여 최신순 정렬
  const mergedHistory = useMemo(() => {
    const all = Object.values(historyByTab).flat();
    return all.sort(
      (a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
    );
  }, [historyByTab]);

  // 히스토리 항목 클릭 → 활성 탭 에디터에 SQL 로드
  const handleItemClick = useTabSqlUpdater();

  return (
    <HistoryPanel
      items={mergedHistory}
      onItemClick={handleItemClick}
      onClearAll={clearAllHistory}
    />
  );
}
