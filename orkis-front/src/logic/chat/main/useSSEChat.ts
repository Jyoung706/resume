/**
 * useSSEChat — SSE 스트리밍 채팅 훅
 * streamManager 래핑 (React 생명주기 독립)
 */
import { useState, useSyncExternalStore } from "react";
import { streamManager } from "@/logic/common/chat/services/streamManager";
import type { SendMessageOptions } from "@/logic/common/chat/types/chat";

export interface UseSSEChatReturn {
  isSending: boolean;
  send: (content: string, options?: SendMessageOptions) => Promise<string>;
  cancel: (chatId: string) => Promise<void>;
  error: string | null;
  clearError: () => void;
}

/**
 * SSE(Server-Sent Events) 기반 채팅 스트리밍 훅.
 * streamManager의 외부 상태를 useSyncExternalStore로 React에 동기화하고,
 * 메시지 전송(send) 및 스트리밍 취소(cancel) 기능을 제공한다.
 * @param sessionId - 현재 활성 세션 ID (null이면 비활성)
 */
export function useSSEChat(sessionId: string | null): UseSSEChatReturn {
  const [error, setError] = useState<string | null>(null);

  // streamManager 상태를 React에 동기화
  const isSending = useSyncExternalStore(
    streamManager.subscribe,
    () => (sessionId ? streamManager.isSessionStreaming(sessionId) : false)
  );

  /**
   * SSE 스트리밍을 시작하여 메시지를 전송한다.
   * 세션이 없으면 에러를 설정하고, 전송 중 예외 발생 시 에러 메시지를 반환한다.
   */
  const send = async (content: string, options?: SendMessageOptions): Promise<string> => {
    if (!sessionId) {
      setError("세션이 선택되지 않았습니다.");
      return "";
    }
    try {
      setError(null);
      return await streamManager.startStream(sessionId, content, options);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "메시지 전송 실패";
      setError(msg);
      return "";
    }
  };

  /**
   * 진행 중인 SSE 스트리밍을 취소한다.
   * @param chatId - 취소할 채팅 메시지 ID
   */
  const cancel = async (chatId: string) => {
    if (!sessionId) return;
    await streamManager.cancelStream(sessionId, chatId);
  };

  /** 에러 상태를 초기화한다. */
  const clearError = () => setError(null);

  return { isSending, send, cancel, error, clearError };
}
