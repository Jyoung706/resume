/**
 * useChatInputToolbar — 입력 영역 툴바 로직 훅
 * DB 선택, 모델 선택, Add 옵션, 메뉴 앵커, DB 경고 다이얼로그 관리
 * ChatContentConnector에서 추출
 */
import { useState } from "react";
import { useDbSelectionStore } from "@/logic/common/db/dbSelectionStore";
import { useInputMenuStore } from "@/logic/common/chat/stores/inputMenuStore";
import { useLlmModelStore } from "@/logic/common/llm/llmModelStore";
import { useRightSidebarStore } from "@/logic/common/ui/rightSidebarStore";
import type {
  ActiveOptionIcon,
  ChatInputToolbarProps,
} from "@/pages/chat/main/parts";

// ── Add 메뉴 옵션 정의 ──

export const ADD_MENU_OPTIONS = [
  { id: "keywords", title: "키워드 선택", description: "검색에 지정할 키워드를 선택" },
  { id: "schema", title: "스키마 선택", description: "스키마를 지정하여 조금 더 정교한 검색" },
  { id: "history", title: "이전기록 보기", description: "이전 대화목록 및 요약본 보기" },
] as const;

const OPTION_TO_ICON_KEY: Record<string, string> = {
  keywords: "keywords",
  schema: "schema",
  history: "history",
};

const OPTION_TO_TAB: Record<string, string> = {
  keywords: "keywords",
  schema: "schema",
  history: "history",
};

export interface UseChatInputToolbarReturn {
  /** ChatContent에 전달할 inputToolbar props */
  inputToolbar: ChatInputToolbarProps;
  /** 선택된 DB의 RAG 전처리 완료 여부 */
  isSelectedDbRagCompleted: boolean;
  /** DB 경고 다이얼로그 open 상태 */
  isDbWarningOpen: boolean;
  openDbWarning: () => void;
  closeDbWarning: () => void;
  /** DB 드롭다운 메뉴 */
  dbMenu: {
    anchorEl: HTMLElement | null;
    open: boolean;
    onClose: () => void;
    connections: ReturnType<typeof useDbSelectionStore.getState>["ragCompletedDbConnections"];
    selectedConnection: ReturnType<typeof useDbSelectionStore.getState>["selectedDbConnection"];
    onSelect: (connection: ReturnType<typeof useDbSelectionStore.getState>["selectedDbConnection"]) => void;
  };
  /** 모델 드롭다운 메뉴 */
  modelMenu: {
    anchorEl: HTMLElement | null;
    open: boolean;
    onClose: () => void;
    models: ReturnType<typeof useLlmModelStore.getState>["models"];
    currentModel: ReturnType<typeof useLlmModelStore.getState>["selectedModel"];
    onSelect: (model: ReturnType<typeof useLlmModelStore.getState>["selectedModel"]) => void;
  };
  /** Add 드롭다운 메뉴 */
  addMenu: {
    anchorEl: HTMLElement | null;
    open: boolean;
    onClose: () => void;
    options: typeof ADD_MENU_OPTIONS;
    selectedOptions: Record<string, boolean>;
    onToggle: (optionId: string) => void;
  };
}

export function useChatInputToolbar(): UseChatInputToolbarReturn {
  // DB / LLM fetch 는 AuthGuard 의 useUserBootstrap 이 담당 — 여기서는 구독만.
  const {
    ragCompletedDbConnections,
    selectedDbConnection,
    setSelectedDbConnection,
  } = useDbSelectionStore();

  const { models, selectedModel, defaultModel } = useLlmModelStore();
  const { selectedOptions, toggleOption } = useInputMenuStore();
  const rs = useRightSidebarStore();

  // ── 메뉴 앵커 상태 ──
  const [dbMenuAnchor, setDbMenuAnchor] = useState<HTMLElement | null>(null);
  const [modelMenuAnchor, setModelMenuAnchor] = useState<HTMLElement | null>(null);
  const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null);
  const [isDbWarningOpen, setIsDbWarningOpen] = useState(false);

  const displayDbName = selectedDbConnection
    ? selectedDbConnection.typeName
      ? `${selectedDbConnection.connectionName} (${selectedDbConnection.typeName})`
      : selectedDbConnection.connectionName
    : undefined;

  const currentModel = selectedModel || defaultModel;
  const displayModelName = currentModel?.displayName || currentModel?.modelName;

  const isSelectedDbRagCompleted = selectedDbConnection
    ? ragCompletedDbConnections.some(
        (c) => c.connectionId === selectedDbConnection.connectionId,
      )
    : false;

  const activeOptionIcons: ActiveOptionIcon[] = Object.entries(selectedOptions)
    .filter(([, active]) => active)
    .map(([id]) => ({ id, icon: OPTION_TO_ICON_KEY[id] || id }));

  const handleOptionIconClick = (optionId: string) => {
    const tab = OPTION_TO_TAB[optionId];
    if (tab) rs.togglePanel(tab as Parameters<typeof rs.togglePanel>[0]);
  };

  const inputToolbar: ChatInputToolbarProps = {
    selectedDbName: displayDbName,
    isDbHighlighted: !isSelectedDbRagCompleted && !!selectedDbConnection,
    onDbSelectorClick: (e: React.MouseEvent<HTMLElement>) => setDbMenuAnchor(e.currentTarget),
    selectedModelName: displayModelName,
    onModelSelectorClick: (e: React.MouseEvent<HTMLElement>) => setModelMenuAnchor(e.currentTarget),
    onAddMenuClick: (e: React.MouseEvent<HTMLElement>) => setAddMenuAnchor(e.currentTarget),
    isAddMenuOpen: !!addMenuAnchor,
    activeOptionIcons,
    onOptionIconClick: handleOptionIconClick,
  };

  // ── 메뉴 핸들러 ──
  const handleDbSelect = (connection: typeof selectedDbConnection) => {
    if (connection) setSelectedDbConnection(connection);
    setDbMenuAnchor(null);
  };

  const handleModelSelect = (model: typeof selectedModel) => {
    useLlmModelStore.getState().selectModel(model);
    setModelMenuAnchor(null);
  };

  return {
    inputToolbar,
    isSelectedDbRagCompleted,
    isDbWarningOpen,
    openDbWarning: () => setIsDbWarningOpen(true),
    closeDbWarning: () => setIsDbWarningOpen(false),
    dbMenu: {
      anchorEl: dbMenuAnchor,
      open: !!dbMenuAnchor,
      onClose: () => setDbMenuAnchor(null),
      connections: ragCompletedDbConnections,
      selectedConnection: selectedDbConnection,
      onSelect: handleDbSelect,
    },
    modelMenu: {
      anchorEl: modelMenuAnchor,
      open: !!modelMenuAnchor,
      onClose: () => setModelMenuAnchor(null),
      models,
      currentModel,
      onSelect: handleModelSelect,
    },
    addMenu: {
      anchorEl: addMenuAnchor,
      open: !!addMenuAnchor,
      onClose: () => setAddMenuAnchor(null),
      options: ADD_MENU_OPTIONS,
      selectedOptions,
      onToggle: toggleOption,
    },
  };
}
