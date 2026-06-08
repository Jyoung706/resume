// ============================================
// SnippetsPanelConnector — snippetStore + queryPanelStore → SnippetsPanel 연결
// ============================================

import { useCallback } from "react";
import { SnippetsPanel } from "@/pages/pro/parts/SnippetsPanel";
import { useSnippetStore } from "@/logic/common/pro/stores/snippetStore";
import { useQueryPanelStore } from "@/logic/common/pro/stores/queryPanelStore";
import { useTabSqlUpdater } from "@/logic/common/pro/hooks/useTabSqlUpdater";

export function SnippetsPanelConnector() {
  const snippets = useSnippetStore((s) => s.snippets);
  const addSnippet = useSnippetStore((s) => s.addSnippet);
  const removeSnippet = useSnippetStore((s) => s.removeSnippet);

  const activeTabId = useQueryPanelStore((s) => s.activeTabId);
  const tabs = useQueryPanelStore((s) => s.tabs);

  // 스니펫 클릭 → 활성 탭 에디터에 SQL 로드
  const handleItemClick = useTabSqlUpdater();

  // 현재 활성 탭의 SQL을 스니펫으로 저장
  const handleSaveCurrentSql = useCallback(() => {
    if (!activeTabId) return;
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab?.sqlQuery?.trim()) return;

    const title = `Snippet ${snippets.length + 1}`;
    addSnippet(title, activeTab.sqlQuery);
  }, [activeTabId, tabs, snippets.length, addSnippet]);

  return (
    <SnippetsPanel
      items={snippets}
      onItemClick={handleItemClick}
      onDelete={removeSnippet}
      onSaveCurrentSql={handleSaveCurrentSql}
    />
  );
}
