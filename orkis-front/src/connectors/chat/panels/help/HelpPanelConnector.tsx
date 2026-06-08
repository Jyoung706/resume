// ============================================
// HelpPanelConnector — 도움말 커넥터
// Logic(useHelpPanel) ↔ Design(HelpPanel) 접착
// ============================================

import { HelpPanel } from "@/pages/chat/panels/help/HelpPanel";
import { useHelpPanel } from "@/logic/chat/panels/help/useHelpPanel";

export function HelpPanelConnector() {
  const panel = useHelpPanel();

  return (
    <HelpPanel
      categories={panel.categories}
      items={panel.items}
      selectedCategory={panel.selectedCategory}
      searchTerm={panel.searchTerm}
      expandedId={panel.expandedId}
      loading={panel.loading}
      onSearch={panel.onSearch}
      onSelectCategory={panel.onSelectCategory}
      onToggleExpand={panel.onToggleExpand}
    />
  );
}
