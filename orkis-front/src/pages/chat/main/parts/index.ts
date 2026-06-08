// Chat 전용 도메인 컴포넌트 barrel export

// Chat 핵심 컴포넌트 — domain/으로 이동, 여기서 re-export
export { ChatInput, type ChatInputProps, type ChatInputToolbarProps, type ActiveOptionIcon } from "@/components/domain/ChatInput";
export { ChatMessage, type ChatMessageProps } from "@/components/domain/ChatMessage";
export { SqlProcessSteps, type ProcessStepData, type SqlProcessStepsProps } from "@/components/domain/ChatMessage";
export { SqlResultTable, type SqlResultTableProps } from "@/components/domain/ChatMessage";
export { ChatList, type ChatListProps, type ChatListItemData } from "./ChatList";
export { ChatSidebar, type ChatSidebarProps } from "./ChatSidebar";
export { ChatHeader, type ChatHeaderProps } from "./ChatHeader";
export { RightSidebar, type RightSidebarProps, type RightSidebarTab } from "./RightSidebar";
export { RightSidebarPanel } from "./RightSidebar";

// 사이드바 보조 컴포넌트
export { CreditAlert, type CreditAlertProps } from "./CreditAlert";
export { UserProfile, type UserProfileProps } from "./UserProfile";

// 키워드 선택 드롭다운
export { KeywordSelectionMenu, type KeywordSelectionMenuProps, type SelectedKeywordItem } from "./KeywordSelectionMenu/KeywordSelectionMenu";

// 키워드 선택 바 (입력창 상단)
export { KeywordSelector, type KeywordSelectorProps } from "./KeywordSelector/KeywordSelector";

// 스키마 선택 드롭다운
export { SchemaSelectionMenu, type SchemaSelectionMenuProps } from "./SchemaSelectionMenu/SchemaSelectionMenu";

// 스키마 선택 바 (입력창 상단)
export { SchemaSelector, type SchemaSelectorProps } from "./SchemaSelector/SchemaSelector";

// DB / 모델 / Add 옵션 드롭다운 (입력창 툴바)
export { DbSelectionMenu, type DbSelectionMenuProps } from "./DbSelectionMenu/DbSelectionMenu";
export { ModelSelectionMenu, type ModelSelectionMenuProps } from "./ModelSelectionMenu/ModelSelectionMenu";
export { AddOptionMenu, type AddOptionMenuProps, type AddOptionMenuItem } from "./AddOptionMenu/AddOptionMenu";

// (DbWarningModal은 alert 시맨틱이라 components/domain/DbWarningModal로 이동됨 — chat parts barrel에서 제거)

// Welcome 페이지
export { ChatWelcome, type ChatWelcomeProps } from "./ChatWelcome";
export {
  RecommendedQuestions,
  type RecommendedQuestionsProps,
  type RecommendedQuestionItem
} from "./RecommendedQuestions";
export {
  RecommendedKeywords,
  type RecommendedKeywordsProps,
  type RecommendedKeywordItem
} from "./RecommendedKeywords";
