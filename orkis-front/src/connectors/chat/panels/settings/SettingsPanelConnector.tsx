// ============================================
// SettingsPanelConnector — Settings 최상위 커넥터
// 소유 훅: useSettingsStore (아코디언 상태)
// 각 섹션은 독립 섹션 커넥터가 담당
// ============================================

import { useSettingsStore } from "@/logic/common/ui/settingsStore";
import { SettingsPanel } from "@/pages/chat/panels/settings/SettingsPanel";
import { UserSectionConnector } from "./UserSectionConnector";
import { LlmSectionConnector } from "./LlmSectionConnector";
import { DatabaseSectionConnector } from "./DatabaseSectionConnector";
import { RagSectionConnector } from "./RagSectionConnector";

export function SettingsPanelConnector() {
  const expandedSection = useSettingsStore((s) => s.expandedSection);
  const toggleSection = useSettingsStore((s) => s.toggleSection);

  return (
    <SettingsPanel
      expandedSection={expandedSection}
      onToggleSection={toggleSection}
      userSection={<UserSectionConnector />}
      llmSection={<LlmSectionConnector />}
      databaseSection={<DatabaseSectionConnector />}
      ragSection={<RagSectionConnector />}
    />
  );
}
