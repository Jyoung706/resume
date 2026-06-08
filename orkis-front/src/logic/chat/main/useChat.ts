/**
 * useChat — 통합 채팅 훅
 * useChatSession + useChatMessages + useSSEChat 통합
 * ChatConnector에서 사용
 */
import { useEffect, useState } from "react";
import { useChatSession } from "@/logic/chat/main/useChatSession";
import { useChatMessages } from "@/logic/chat/main/useChatMessages";
import { useSSEChat } from "@/logic/chat/main/useSSEChat";
import { useChatMessageStore } from "@/logic/common/chat/stores/chatMessageStore";
import { useChatRoomStateStore } from "@/logic/common/chat/stores/chatRoomStateStore";
import {
  useDbSelectionStore,
  extractDbId,
} from "@/logic/common/db/dbSelectionStore";
import { useKeywordSelectionStore } from "@/logic/common/chat/stores/keywordSelectionStore";
import { formatSelectedSchemaForAI } from "@/logic/common/chat/stores/schemaSelectionStore";
import { useLlmModelStore } from "@/logic/common/llm/llmModelStore";
import type { SendMessageOptions } from "@/logic/common/chat/types/chat";

export interface UseChatOptions {
  sessionId?: string | null;
  onSessionChange?: (sessionId: string) => void;
}

/**
 * 채팅 화면의 모든 로직을 통합하는 Facade 훅.
 * useChatSession(세션 관리) + useChatMessages(메시지) + useSSEChat(스트리밍)을 조합하고,
 * 입력 draft 관리, 사이드바 토글, 메시지 전송 등 UI에 필요한 인터페이스를 단일 객체로 제공한다.
 * @param options - 외부 sessionId 주입 및 세션 변경 콜백
 */
export function useChat(options?: UseChatOptions) {
  const [inputValue, setInputValue] = useState(() =>
    useChatRoomStateStore.getState().getDraft(options?.sessionId ?? "")
  );

  // 세션
  const session = useChatSession();

  // 메시지 (URL params의 sessionId 또는 선택된 세션)
  const activeSessionId = options?.sessionId ?? session.selectedChatId;
  const messageState = useChatMessages(activeSessionId);

  // SSE
  const sse = useSSEChat(activeSessionId);

  // 세션 변경 시 메시지 로드
  // [v2.2 Phase 4.7] loadMessages → loadMessagesPage 로 전환 — 최근 30개 chatId 만 빠르게.
  // "지난 대화 더 보기" 버튼은 messageState.loadOlderMessages 로 추가 페치.
  useEffect(() => {
    if (activeSessionId && session.sessionsLoaded) {
      // pre-mark: 렌더 전 loading 플래그 선점 → URL 직접 진입/새로고침 경로의 Welcome flash 방지
      useChatMessageStore.getState().markSessionLoading(activeSessionId);
      messageState.loadMessagesPage(activeSessionId);
    }
  }, [activeSessionId, session.sessionsLoaded]);

  // 초기 로드
  useEffect(() => {
    if (!session.sessionsLoaded && !session.isLoading) {
      session.loadChatList();
    }
  }, [session.sessionsLoaded, session.isLoading]);

  // 외부 sessionId prop 변경 시 동기화
  useEffect(() => {
    if (options?.sessionId && options.sessionId !== session.selectedChatId) {
      session.selectChat(options.sessionId);
    }
  }, [options?.sessionId]);

  // 방 전환 시 draft 복원
  useEffect(() => {
    if (activeSessionId) {
      const draft = useChatRoomStateStore.getState().getDraft(activeSessionId);
      setInputValue(draft);
    }
  }, [activeSessionId]);

  /**
   * 채팅 입력 변경 핸들러.
   * 로컬 state 업데이트와 동시에 chatRoomStateStore에 draft를 백업하여
   * 방 전환 후에도 입력 내용을 복원할 수 있게 한다.
   */
  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (activeSessionId) {
      useChatRoomStateStore.getState().saveDraft(activeSessionId, value);
    }
  };

  /**
   * 메시지 전송 핸들러.
   * 입력값 trim 후 빈 값이거나 전송 중이면 무시하고,
   * draft를 삭제한 뒤 SSE 스트리밍으로 메시지를 전송한다.
   */
  const sendMessage = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || sse.isSending) return;
    setInputValue("");
    if (activeSessionId) {
      useChatRoomStateStore.getState().deleteDraft(activeSessionId);
    }

    // DB·모델 정보를 options로 전달
    const dbState = useDbSelectionStore.getState();
    const modelState = useLlmModelStore.getState();
    const keywordState = useKeywordSelectionStore.getState();
    const selectedKws = activeSessionId
      ? keywordState.getKeywords(activeSessionId)
      : [];
    const schemaContext = formatSelectedSchemaForAI(activeSessionId ?? null) || undefined;
    const msgOptions: SendMessageOptions = {
      dbId: extractDbId(dbState.selectedDbConnection) ?? undefined,
      connectionId: dbState.selectedDbConnection?.connectionId?.toString(),
      modelId: (modelState.selectedModel ?? modelState.defaultModel)?.id,
      keywords:
        selectedKws.length > 0
          ? selectedKws.map((k) => k.name)
          : undefined,
      schemaContext,
    };

    await sse.send(trimmed, msgOptions);
  };

  /**
   * 채팅 세션 선택 핸들러.
   * 세션 스토어를 업데이트하고 onSessionChange 콜백을 호출한다.
   */
  const selectChat = (chatId: string) => {
    session.selectChat(chatId);
    options?.onSessionChange?.(chatId);
  };

  /**
   * 새 채팅 세션 생성 핸들러.
   * 세션 스토어를 통해 새 채팅을 만들고, 성공 시 onSessionChange 콜백을 호출한다.
   * 성공/실패 무관하게 isCreatingChat 가드를 해제한다.
   */
  const createNewChat = async () => {
    try {
      const item = await session.createNewChat();
      if (item) {
        options?.onSessionChange?.(item.id);
      }
    } finally {
      // 성공/실패 무관하게 생성 가드 해제
      session.setCreatingChatComplete();
    }
  };

  return {
    // 세션
    chatItems: session.chatItems,
    selectedChatId: activeSessionId,
    isSessionsLoading: session.isLoading,
    sessionsLoaded: session.sessionsLoaded,
    selectChat,
    createNewChat,
    deleteChat: session.deleteChat,
    toggleFavorite: session.toggleFavorite,
    updateChatTitle: session.updateChatTitle,

    // 메시지
    messages: messageState.messages,
    isLoadingMessages: messageState.isLoadingMessages,
    isInitialized: messageState.isInitialized,

    // [v2.2 Phase 4.7] 지난 대화 더 보기
    hasOlderMessages: messageState.hasOlder,
    isLoadingOlderMessages: messageState.isLoadingOlder,
    loadOlderMessagesError: messageState.loadOlderError,
    loadOlderMessages: () => {
      if (activeSessionId) messageState.loadOlderMessages(activeSessionId);
    },

    // 입력
    inputValue,
    setInputValue: handleInputChange,
    sendMessage,

    // 스트리밍
    isSending: sse.isSending,
    stopStreaming: sse.cancel,

    // 페이지네이션
    maxDisplayCount: session.maxDisplayCount,
    loadMore: session.loadMore,

    // 새 채팅 생성 중 여부
    isCreatingChat: session.isCreatingChat,

    // 에러
    error: session.error || messageState.messagesError || sse.error,
  };
}
