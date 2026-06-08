/**
 * ChatContentConnector — 세션별 채팅 콘텐츠 커넥터
 * 소유 훅: useChat, useRecommendedQuestions, useRecommendedKeywords, useChatInputToolbar, useKeywordSelectionMenu
 */
import { useDeferredValue, useRef } from "react";
import { Box } from "@/components";
import { useChat } from "@/logic/chat/main/useChat";
import { streamManager } from "@/logic/common/chat/services/streamManager";
import { useChatInputToolbar } from "@/logic/chat/main/useChatInputToolbar";
import { useKeywordSelectionMenu } from "@/logic/chat/main/useKeywordSelectionMenu";
import { useSchemaSelectionMenu } from "@/logic/chat/main/useSchemaSelectionMenu";
import { useRecommendedKeywords } from "@/logic/chat/main/useRecommendedKeywords";
import { useRecommendedQuestions } from "@/logic/chat/main/useRecommendedQuestions";
import { useSqlViewStore } from "@/logic/common/chat/stores/sqlViewStore";
import { useDataMore } from "@/logic/chat/main/useDataMore";
import { downloadAsCSV } from "@/logic/shared/utils/csvExport";
import { executeQuery } from "@/logic/common/chat/services/queryService";
import {
  useDbSelectionStore,
  extractDbId,
} from "@/logic/common/db/dbSelectionStore";
import { showToast } from "@/logic/shared/utils/toast";
import { useChatPerfTelemetry } from "@/logic/shared/utils/perfTelemetry";
import type { ChatMessage, SqlResult } from "@/logic/common/chat/types/chat";
import { ChatContent, type ChatMessageData } from "@/pages/chat/main";
import {
  AddOptionMenu,
  DbSelectionMenu,
  KeywordSelectionMenu,
  ModelSelectionMenu,
  SchemaSelectionMenu,
} from "@/pages/chat/main/parts";
import { DbWarningModal } from "@/components/domain/DbWarningModal";

// ── 유틸 ──

function isSqlResult(result: unknown): result is SqlResult {
  return (
    !!result &&
    typeof result === "object" &&
    "columns" in result &&
    "data" in result
  );
}

function detectChatType(msg: ChatMessage): "sql" | "general" {
  if (msg.isStopped) {
    // 중지된 SQL 메시지도 sql 타입으로 판정 (프로세스 스텝 표시를 위해)
    if (msg.questionType === "sql" || (msg.processes && msg.processes.length > 0)) {
      return "sql";
    }
    return "general";
  }

  if (msg.messageType === "error") {
    const isSqlError =
      msg.questionType === "sql" ||
      (msg.processes && msg.processes.length > 0);
    return isSqlError ? "sql" : "general";
  }

  if (msg.messageType === "sql" || msg.questionType === "sql") return "sql";
  if (msg.processes && msg.processes.length > 0) return "sql";
  if (msg.result && "columns" in msg.result && "data" in msg.result)
    return "sql";
  return "general";
}

function mapMessageToData(msg: ChatMessage): ChatMessageData {
  let mappedResult: ChatMessageData["result"] = null;
  let totalRowCount: number | undefined;
  if (isSqlResult(msg.result)) {
    mappedResult = {
      columns: msg.result.columns.map((c) =>
        typeof c === "string" ? c : c.name,
      ),
      data: msg.result.data,
      query: msg.result.query,
      executionTime: msg.result.executionTime,
      error: msg.result.error,
    };
    totalRowCount = msg.result.data.length;
  }
  const chatType = detectChatType(msg);
  return {
    id: msg.id,
    type: msg.type,
    content: msg.content,
    timestamp: msg.timestamp,
    messageType: chatType === "sql" ? "sql" : msg.messageType,
    isStreaming: msg.isStreaming,
    isStopped: msg.isStopped,
    stoppedReason: msg.stoppedReason,
    chatType,
    processes: msg.processes,
    result: mappedResult,
    totalRowCount,
    source: msg.source,
  };
}

// ============================================
// ChatContentConnector — 세션별 인스턴스
// ============================================

export function ChatContentConnector({
  sessionId,
  onSessionChange,
  userInfo,
}: {
  sessionId: string;
  onSessionChange: (sessionId: string) => void;
  userInfo?: { name: string; email?: string; avatarUrl?: string };
}) {
  // ── SQL 보기 모달 ──
  const openSqlView = useSqlViewStore((s) => s.openSqlView);

  // ── DATA 더보기 ──
  const { handleDataMore } = useDataMore();

  // ── 세션별 메시지/입력 ──
  const chat = useChat({ sessionId, onSessionChange });
  // 개발 모드 한정: 누적 노드/heap/메시지 수 30s 주기 텔레메트리 (P1-B)
  useChatPerfTelemetry(chat.messages.length);
  // 스트리밍 중 마크다운 re-parse 비용 절감 — 렌더링 우선순위 낮춤
  const deferredChatMessages = useDeferredValue(chat.messages);

  const messages = deferredChatMessages.map((msg) => {
    const data = mapMessageToData(msg);
    const sqlQuery = isSqlResult(msg.result) ? msg.result.query : undefined;
    if (sqlQuery) {
      data.onSqlView = () => openSqlView(sqlQuery);
      data.onDataMore = () => handleDataMore({ sqlQuery });
    }
    if (isSqlResult(msg.result) && data.result) {
      const columns = data.result.columns;
      const rows = msg.result.data;
      const sqlQuery = data.result.query;

      if (rows.length > 0 && columns.length > 0) {
        data.onCsvDownload = () => downloadAsCSV(rows, columns);
      } else if (sqlQuery) {
        data.onCsvDownload = async () => {
          const conn = useDbSelectionStore.getState().selectedDbConnection;
          const dbId = extractDbId(conn);
          if (!dbId) {
            showToast("데이터베이스가 선택되지 않았습니다", "error");
            return;
          }
          try {
            const result = await executeQuery(sqlQuery, {
              dbId,
              connectionId: conn?.connectionId,
            });
            downloadAsCSV(result.data, result.columns);
          } catch (error) {
            showToast(
              error instanceof Error
                ? error.message
                : "CSV 다운로드 중 오류가 발생했습니다",
              "error",
            );
          }
        };
      }
    }
    return data;
  });

  // ── 세션별 Welcome 데이터 ──
  const { questions: welcomeQuestions, loading: welcomeQuestionsLoading } =
    useRecommendedQuestions();
  const {
    keywords: welcomeKeywords,
    loading: welcomeKeywordsLoading,
    toggleKeyword,
  } = useRecommendedKeywords(sessionId);

  // ── 입력 툴바 (DB/모델/옵션) ──
  const toolbar = useChatInputToolbar();

  // ── 키워드 선택 Popper ──
  const keywordMenu = useKeywordSelectionMenu(sessionId);

  // ── 스키마 선택 Popper ──
  const schemaMenu = useSchemaSelectionMenu(sessionId);

  const chatInputRef = useRef<HTMLDivElement>(null);

  // ── 키워드 선택 바 (입력창 상단) — keywordMenu 훅에서 모두 제공 ──
  const keywordSelectorProps = {
    selectedKeywords: keywordMenu.selectedKeywords,
    visible: keywordMenu.keywordSelectorVisible,
    onRemoveKeyword: keywordMenu.removeKeywordDirect,
    onClearAll: keywordMenu.clearAllDirect,
  };

  // ── 스키마 선택 바 (입력창 상단) ──
  const schemaSelectorProps = {
    selectedItems: schemaMenu.selectedItems,
    visible: schemaMenu.schemaSelectorVisible,
    onRemoveItem: schemaMenu.removeItemDirect,
    onClearAll: schemaMenu.clearAllDirect,
  };

  const handleSendMessage = () => {
    if (!toolbar.isSelectedDbRagCompleted) {
      toolbar.openDbWarning();
      return;
    }
    chat.sendMessage();
  };

  const handleQuestionClick = (question: string) => {
    chat.setInputValue(question);
  };

  // ── 옵션 아이콘 클릭 시 Popper 열기 (상호 배타) ──
  const inputToolbarOverride = {
    ...toolbar.inputToolbar,
    onOptionIconClick: (optionId: string) => {
      toolbar.inputToolbar.onOptionIconClick?.(optionId);
      if (chatInputRef.current) {
        if (optionId === "keywords") {
          schemaMenu.closeMenu();
          keywordMenu.openMenu(chatInputRef.current);
        } else if (optionId === "schema") {
          keywordMenu.closeMenu();
          schemaMenu.openMenu(chatInputRef.current);
        }
      }
    },
  };

  return (
    <>
      <Box ref={chatInputRef} className="ChatPage__activity-wrapper">
        <ChatContent
          messages={messages}
          isLoadingMessages={chat.isLoadingMessages}
          isMessagesInitialized={chat.isInitialized}
          // non-deferred 원본 기준 — useDeferredValue로 인한 Welcome flash 방지
          hasMessages={chat.messages.length > 0}
          // [v2.2 Phase 4.7] 지난 대화 더 보기
          hasOlderMessages={chat.hasOlderMessages}
          isLoadingOlderMessages={chat.isLoadingOlderMessages}
          loadOlderMessagesError={chat.loadOlderMessagesError}
          onLoadOlderMessages={chat.loadOlderMessages}
          inputValue={chat.inputValue}
          onInputChange={chat.setInputValue}
          onSendMessage={handleSendMessage}
          onStopStreaming={() => {
            const activeChatId = streamManager.getActiveStreamId(sessionId);
            if (activeChatId) {
              chat.stopStreaming(activeChatId);
            }
          }}
          isSending={chat.isSending}
          selectedChatId={sessionId}
          inputToolbar={inputToolbarOverride}
          keywordSelector={keywordSelectorProps}
          onKeywordDropdownClick={(e) => {
            schemaMenu.closeMenu();
            keywordMenu.openMenu(e.currentTarget);
          }}
          schemaSelector={schemaSelectorProps}
          onSchemaDropdownClick={(e: React.MouseEvent<HTMLElement>) => {
            keywordMenu.closeMenu();
            schemaMenu.openMenu(e.currentTarget);
          }}
          user={userInfo}
          welcomeQuestions={welcomeQuestions}
          welcomeQuestionsLoading={welcomeQuestionsLoading}
          onWelcomeQuestionClick={handleQuestionClick}
          welcomeKeywords={welcomeKeywords}
          welcomeKeywordsLoading={welcomeKeywordsLoading}
          onWelcomeKeywordClick={toggleKeyword}
        />
      </Box>

      {/* ── DB 선택 드롭다운 메뉴 ── */}
      <DbSelectionMenu
        anchorEl={toolbar.dbMenu.anchorEl}
        open={toolbar.dbMenu.open}
        onClose={toolbar.dbMenu.onClose}
        connections={toolbar.dbMenu.connections}
        selectedConnection={toolbar.dbMenu.selectedConnection}
        onSelect={toolbar.dbMenu.onSelect}
      />

      {/* ── 모델 선택 드롭다운 메뉴 ── */}
      <ModelSelectionMenu
        anchorEl={toolbar.modelMenu.anchorEl}
        open={toolbar.modelMenu.open}
        onClose={toolbar.modelMenu.onClose}
        models={toolbar.modelMenu.models}
        currentModel={toolbar.modelMenu.currentModel}
        onSelect={toolbar.modelMenu.onSelect}
      />

      {/* ── Add 드롭다운 메뉴 ── */}
      <AddOptionMenu
        anchorEl={toolbar.addMenu.anchorEl}
        open={toolbar.addMenu.open}
        onClose={toolbar.addMenu.onClose}
        options={toolbar.addMenu.options}
        selectedOptions={toolbar.addMenu.selectedOptions}
        onToggle={toolbar.addMenu.onToggle}
      />

      {/* ── 키워드 선택 Popper 드롭다운 ── */}
      <KeywordSelectionMenu
        open={keywordMenu.open}
        anchorEl={keywordMenu.anchorEl}
        onClose={keywordMenu.closeMenu}
        selectedKeywords={keywordMenu.selectedKeywords}
        onRemoveKeyword={keywordMenu.onRemoveKeyword}
        onClearAll={keywordMenu.onClearAll}
        onAddKeyword={() => {
          keywordMenu.closeMenu();
          toolbar.inputToolbar.onOptionIconClick?.("keywords");
        }}
      />

      {/* ── 스키마 선택 Popper 드롭다운 ── */}
      <SchemaSelectionMenu
        open={schemaMenu.open}
        anchorEl={schemaMenu.anchorEl}
        onClose={schemaMenu.closeMenu}
        selectedItems={schemaMenu.selectedItems}
        selectedTableCount={schemaMenu.selectedTableCount}
        selectedColumnCount={schemaMenu.selectedColumnCount}
        onRemoveItem={schemaMenu.onRemoveItem}
        onClearAll={schemaMenu.onClearAll}
        onAddSchema={() => {
          schemaMenu.closeMenu();
          toolbar.inputToolbar.onOptionIconClick?.("schema");
        }}
      />

      {/* ── DB 미선택 경고 모달 ── */}
      <DbWarningModal
        open={toolbar.isDbWarningOpen}
        onClose={toolbar.closeDbWarning}
      />
    </>
  );
}
