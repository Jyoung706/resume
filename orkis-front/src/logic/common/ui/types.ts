/**
 * UI 공통 타입 및 상수 정의
 * pages/와 logic/ 양쪽에서 참조하는 타입을 정의하여 역방향 의존을 방지
 */

/** 우측 사이드바 탭 식별자 */
export type RightSidebarTab =
  | "grade"
  | "help"
  | "notice"
  | "settings"
  | "support"
  | "history"
  | "keywords"
  | "schema";

/** 환경설정 아코디언 섹션 ID */
export const SETTINGS_SECTION = {
  USER: "settings-user",
  LLM: "settings-llm",
  DATABASE: "settings-database",
  RAG: "settings-rag",
} as const;

export type SettingsSectionId =
  (typeof SETTINGS_SECTION)[keyof typeof SETTINGS_SECTION];
