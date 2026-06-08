/**
 * useChatMessages — 채팅 메시지 관리 훅
 * chatMessageStore 래핑 — 세션별 파생 상태 + 셀렉터 최적화
 */
import { useCallback } from "react";
import { useChatMessageStore } from "@/logic/common/chat/stores/chatMessageStore";
import { useChatSessionStore } from "@/logic/common/chat/stores/chatSessionStore";
import type { ChatMessage } from "@/logic/common/chat/types/chat";

/** 안정적 참조 — 매 렌더마다 새 []을 생성하면 Zustand getSnapshot 무한 루프 발생 */
const EMPTY_MESSAGES: ChatMessage[] = [];

/**
 * chatMessageStore의 메시지 상태를 React 컴포넌트에 바인딩하는 훅.
 * 지정된 sessionId(또는 현재 선택된 세션)의 메시지 배열, 로딩/에러 상태,
 * 메시지 로드/추가/수정 액션을 제공한다.
 *
 * 셀렉터 최적화: Set/Map 전체가 아닌 해당 세션의 파생 boolean만 구독하여
 * 다른 세션의 상태 변경 시 불필요한 리렌더를 방지한다.
 *
 * @param sessionId - 조회할 세션 ID (생략 시 현재 선택된 세션)
 */
export function useChatMessages(sessionId?: string | null) {
  const selectedChatId = useChatSessionStore((s) => s.selectedChatId);
  const targetSessionId = sessionId ?? selectedChatId;

  // 파생 boolean 셀렉터 — 해당 세션의 로딩 상태만 구독
  const isLoadingMessages = useChatMessageStore(
    useCallback(
      (s) => (targetSessionId ? s.loadingSessionIds.has(targetSessionId) : false),
      [targetSessionId]
    )
  );

  // 메시지 최초 로드 완료 여부 (빈 배열이라도 has()면 true)
  const isInitialized = useChatMessageStore(
    useCallback(
      (s) => (targetSessionId ? s.messagesBySession.has(targetSessionId) : false),
      [targetSessionId]
    )
  );

  const messages = useChatMessageStore(
    useCallback(
      (s) => (targetSessionId ? s.messagesBySession.get(targetSessionId) ?? EMPTY_MESSAGES : EMPTY_MESSAGES),
      [targetSessionId]
    )
  );

  const messagesError = useChatMessageStore((s) => s.messagesError);
  const loadMessages = useChatMessageStore((s) => s.loadMessages);
  const addMessage = useChatMessageStore((s) => s.addMessage);
  const updateMessage = useChatMessageStore((s) => s.updateMessage);

  // [v2.2 Phase 4.7] chatId cursor 페이지네이션 액션 + 메타
  const loadMessagesPage = useChatMessageStore((s) => s.loadMessagesPage);
  const loadOlderMessages = useChatMessageStore((s) => s.loadOlderMessages);
  const pagination = useChatMessageStore(
    useCallback(
      (s) => (targetSessionId ? s.paginationBySession.get(targetSessionId) : undefined),
      [targetSessionId]
    )
  );
  const hasOlder = pagination?.hasOlder ?? false;
  const isLoadingOlder = pagination?.isLoadingOlder ?? false;
  const loadOlderError = pagination?.loadError ?? null;

  return {
    messages,
    isLoadingMessages,
    isInitialized,
    messagesError,
    loadMessages,
    addMessage,
    updateMessage,
    // Phase 4.7 추가
    loadMessagesPage,
    loadOlderMessages,
    hasOlder,
    isLoadingOlder,
    loadOlderError,
  };
}
