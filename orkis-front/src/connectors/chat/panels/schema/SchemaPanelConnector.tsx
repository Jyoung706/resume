// ============================================
// SchemaPanelConnector — 스키마 선택 커넥터
// Logic(useSchemaSelection) ↔ Design(SchemaPanel) 연결
// ============================================

import { SchemaPanel } from "@/pages/chat/panels/schema/SchemaPanel";
import { useSchemaSelection } from "@/logic/chat/panels/schema/useSchemaSelection";
import { useSelectedChatId } from "@/logic/common/chat/stores/chatSessionStore";

export function SchemaPanelConnector() {
  const sessionId = useSelectedChatId();
  const schema = useSchemaSelection(sessionId);

  return <SchemaPanel {...schema} />;
}
