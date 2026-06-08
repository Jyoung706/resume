// ── Connector를 Panel 이름으로 re-export ──
// RightSidebarPanel 등 소비자가 Connector/Design 구분 없이 사용
export { GradePanelConnector as GradePanel } from "@/connectors/chat/panels/grade";
export { HelpPanelConnector as HelpPanel } from "@/connectors/chat/panels/help";
export { NoticePanelConnector as NoticePanel } from "@/connectors/chat/panels/notice";
export { SettingsPanelConnector as SettingsPanel } from "@/connectors/chat/panels/settings";
export { SupportPanelConnector as SupportPanel } from "@/connectors/chat/panels/support";
export { HistoryPanelConnector as HistoryPanel } from "@/connectors/chat/panels/history";
export { KeywordsPanelConnector as KeywordsPanel } from "@/connectors/chat/panels/keywords";
export { SchemaPanelConnector as SchemaPanel } from "@/connectors/chat/panels/schema";
