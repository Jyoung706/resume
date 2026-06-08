/**
 * 메시지 스트림 Store (Zustand)
 * orkis-front messageStreamStore 이식 — Fetch Streaming 기반
 */
import { useChatMessageStore } from "@/logic/common/chat/stores/chatMessageStore";
import { useChatSessionStore } from "@/logic/common/chat/stores/chatSessionStore";
import type {
  ChatMessage,
  MessageStreamState,
  ProcessStep,
  SendMessageOptions
} from "@/logic/common/chat/types/chat";
import { API_BASE } from "@/logic/shared/config/env";
import { generateAiChatId, generateChatId } from "@/logic/shared/utils/chatId";
import { getLogger } from "@/logic/shared/utils/logger";
import { create } from "zustand";

const logger = getLogger("MessageStreamStore");

// AbortController 관리
const abortControllerMap = new Map<string, AbortController>();

// ============================================
// SSE 에러 코드 카탈로그
// ============================================

// const SSE_ERROR_MESSAGES: Record<number, string> = {
//   9002: "백엔드 서버가 종료되었습니다."
// };

function getSSEErrorMessage(code?: number): string {
  if (!code) return "알 수 없는 오류가 발생했습니다.";
  // if (SSE_ERROR_MESSAGES[code]) return SSE_ERROR_MESSAGES[code];
  if (code >= 9002) return "AI 서버 처리 중 오류가 발생했습니다.";
  return `오류가 발생했습니다. (코드: ${code})`;
}

// ============================================
// SSE 이벤트 타입
// ============================================

interface SSEEvent {
  type: string;
  payload: Record<string, unknown>;
}

// ============================================
// 인터페이스
// ============================================

interface MessageStreamStoreState {
  streams: Map<string, MessageStreamState>;
  isSending: boolean;
  sendingSessionId: string | null;

  // 액션
  sendMessage: (
    sessionId: string,
    content: string,
    options?: SendMessageOptions
  ) => Promise<string>;
  cancelMessage: (sessionId: string, chatId: string) => Promise<void>;
  getMessageStream: (chatId: string) => MessageStreamState | null;
  clearCompletedStreams: () => void;
  clearAllStreams: () => void;
}

// ============================================
// 헬퍼
// ============================================

function createInitialStreamState(
  chatId: string,
  sessionId: string
): MessageStreamState {
  return {
    chatId,
    sessionId,
    status: "pending",
    content: "",
    streamingContent: "",
    isContentComplete: false,
    processes: []
  };
}

function updateProcesses(
  processes: ProcessStep[],
  payload: Record<string, unknown>
): ProcessStep[] {
  const stepId = payload.stepId as string;
  const status = payload.status as ProcessStep["status"];
  if (!stepId) return processes;

  // 새 단계가 running이면 → 이전 단계들 자동 completed 처리
  if (status === "running") {
    const targetIdx = processes.findIndex((p) => p.id === stepId);
    return processes.map((p, i) => {
      if (p.id === stepId) return { ...p, status };
      if (i < targetIdx && p.status !== "error")
        return { ...p, status: "completed" };
      return p;
    });
  }

  return processes.map((p) => (p.id === stepId ? { ...p, status } : p));
}


// ============================================
// SSE 파서
// ============================================

function parseSSELine(line: string): SSEEvent | null {
  if (!line.startsWith("data:")) return null;
  try {
    const jsonStr = line.substring(5).trim();
    if (!jsonStr) return null;
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

// ============================================
// 스토어
// ============================================

export const useMessageStreamStore = create<MessageStreamStoreState>(
  (set, get) => ({
    streams: new Map(),
    isSending: false,
    sendingSessionId: null,

    sendMessage: async (
      sessionId: string,
      content: string,
      options?: SendMessageOptions
    ): Promise<string> => {
      const chatId = generateChatId();
      const aiChatId = generateAiChatId(chatId);

      // 사용자 메시지 추가
      const userMessage: ChatMessage = {
        id: chatId,
        sessionId,
        type: "user",
        content,
        timestamp: new Date().toISOString(),
        source: "realtime"
      };
      useChatMessageStore.getState().addMessage(userMessage, sessionId);

      // 스트림 상태 초기화
      const streamState = createInitialStreamState(aiChatId, sessionId);
      set((state) => {
        const newStreams = new Map(state.streams);
        newStreams.set(aiChatId, { ...streamState, status: "streaming" });
        return {
          streams: newStreams,
          isSending: true,
          sendingSessionId: sessionId
        };
      });

      // AI 대기 메시지 추가
      const aiMessage: ChatMessage = {
        id: aiChatId,
        sessionId,
        type: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
        isStreaming: true,
        source: "realtime"
      };
      useChatMessageStore.getState().addMessage(aiMessage, sessionId);

      // Fetch Streaming 시작
      const abortController = new AbortController();
      abortControllerMap.set(aiChatId, abortController);

      try {
        const response = await fetch(`${API_BASE}/sse/chat/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            content,
            chatId,
            aiChatId,
            ...options
          }),
          credentials: "include",
          signal: abortController.signal
        });

        if (!response.ok) {
          throw new Error(`SSE 연결 실패: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("ReadableStream 지원 안 됨");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const event = parseSSELine(line);
            if (!event) continue;

            // 이벤트별 상태 업데이트
            set((state) => {
              const newStreams = new Map(state.streams);
              const current = newStreams.get(aiChatId);
              if (!current) return state;

              let updated = { ...current };

              switch (event.type) {
                case "chat_type":
                  updated.chatType = event.payload.type as "sql" | "general";
                  break;
                case "steps":
                  if (Array.isArray(event.payload.steps)) {
                    updated.processes = (
                      event.payload.steps as Array<Record<string, unknown>>
                    ).map((s) => ({
                      id: s.id as string,
                      label: (s.label || s.name) as string,
                      status: "pending" as const
                    }));
                  }
                  break;
                case "step":
                  updated.processes = updateProcesses(
                    updated.processes,
                    event.payload
                  );
                  break;
                case "content": {
                  const chunk = (event.payload.chunk ||
                    event.payload.content ||
                    "") as string;
                  updated.streamingContent += chunk;
                  updated.content += chunk;
                  if (event.payload.isComplete)
                    updated.isContentComplete = true;
                  // chatType 기반 messageType 동적 설정
                  if (updated.chatType) {
                    updated.messageType = updated.chatType;
                  }
                  break;
                }
                case "message_id":
                  // tempId → 실제 messageId 매핑 (필요 시)
                  break;
                case "title_update": {
                  // 사용자가 수동 수정하지 않은 세션만 타이틀 업데이트
                  const newTitle = event.payload.title as string;
                  const targetSessionId =
                    (event.payload.sessionId as string) || sessionId;
                  if (newTitle) {
                    const sessionStore = useChatSessionStore.getState();
                    const chatItem = sessionStore.chatItems.find(
                      (item) => item.id === targetSessionId
                    );
                    if (chatItem && !chatItem.titleModified) {
                      sessionStore.updateChatTitle(targetSessionId, newTitle);
                    }
                  }
                  break;
                }
                case "question_count": {
                  const count = (event.payload.count ??
                    event.payload.questionCount) as number | undefined;
                  if (typeof count === "number") {
                    import("@/logic/common/chat/stores/questionCountStore").then(
                      ({ useQuestionCountStore }) => {
                        const state = useQuestionCountStore.getState();
                        useQuestionCountStore
                          .getState()
                          .updateCount(state.total - count, state.total);
                      }
                    );
                  }
                  break;
                }
                case "result":
                  updated.result = event.payload
                    .result as MessageStreamState["result"];
                  break;
                case "complete":
                  updated.status = "completed";
                  // 모든 프로세스 단계를 completed로 마무리
                  updated.processes = updated.processes.map((p) =>
                    p.status !== "error"
                      ? { ...p, status: "completed" as const }
                      : p
                  );
                  break;
                case "error": {
                  updated.status = "error";
                  const errorCode = event.payload.code as number | undefined;
                  updated.error =
                    getSSEErrorMessage(errorCode) ||
                    ((event.payload.error || event.payload.message) as string);
                  break;
                }
              }

              newStreams.set(aiChatId, updated);

              const isDone =
                updated.status === "completed" || updated.status === "error";
              return {
                streams: newStreams,
                ...(isDone ? { isSending: false, sendingSessionId: null } : {})
              };
            });

            // 완료/에러 시 AI 메시지에 최종 데이터 전부 반영
            const stream = get().streams.get(aiChatId);
            if (stream?.status === "completed" || stream?.status === "error") {
              useChatMessageStore.getState().updateMessage(
                aiChatId,
                {
                  content: stream.content,
                  isStreaming: false,
                  messageType: stream.messageType || stream.chatType,
                  processes: stream.processes,
                  result: stream.result,
                  ...(stream.status === "error"
                    ? { messageType: "error" as const }
                    : {})
                },
                sessionId
              );
              // 세션 updatedAt 갱신
              if (stream.status === "completed") {
                useChatSessionStore
                  .getState()
                  .updateSessionUpdatedAt(sessionId);
              }
            }
          }
        }

        // 스트림 종료 처리
        const finalStream = get().streams.get(aiChatId);
        if (finalStream && finalStream.status === "streaming") {
          set((state) => {
            const newStreams = new Map(state.streams);
            const s = newStreams.get(aiChatId);
            if (s) newStreams.set(aiChatId, { ...s, status: "completed" });
            return {
              streams: newStreams,
              isSending: false,
              sendingSessionId: null
            };
          });

          useChatMessageStore.getState().updateMessage(
            aiChatId,
            {
              content: finalStream.content,
              isStreaming: false,
              messageType: finalStream.messageType || finalStream.chatType,
              processes: finalStream.processes,
              result: finalStream.result
            },
            sessionId
          );
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          logger.info("스트림 취소됨:", aiChatId);
          set((state) => {
            const newStreams = new Map(state.streams);
            const s = newStreams.get(aiChatId);
            if (s) newStreams.set(aiChatId, { ...s, status: "cancelled" });
            return {
              streams: newStreams,
              isSending: false,
              sendingSessionId: null
            };
          });
        } else {
          logger.error("sendMessage 에러:", error);
          set((state) => {
            const newStreams = new Map(state.streams);
            const s = newStreams.get(aiChatId);
            if (s) {
              newStreams.set(aiChatId, {
                ...s,
                status: "error",
                error: (error as Error).message
              });
            }
            return {
              streams: newStreams,
              isSending: false,
              sendingSessionId: null
            };
          });
        }

        useChatMessageStore.getState().updateMessage(
          aiChatId,
          {
            isStreaming: false,
            isStopped: true
          },
          sessionId
        );
      } finally {
        abortControllerMap.delete(aiChatId);
      }

      return aiChatId;
    },

    cancelMessage: async (sessionId: string, chatId: string) => {
      const controller = abortControllerMap.get(chatId);
      if (controller) {
        controller.abort();
        abortControllerMap.delete(chatId);
      }

      // 백엔드 취소 통보
      try {
        await fetch(`${API_BASE}/sse/chat/stream/${chatId}/cancel`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });
      } catch (e) {
        logger.warn("취소 통보 실패 (무시):", e);
      }

      set((state) => {
        const newStreams = new Map(state.streams);
        const s = newStreams.get(chatId);
        if (s) newStreams.set(chatId, { ...s, status: "cancelled" });
        return {
          streams: newStreams,
          isSending: false,
          sendingSessionId: null
        };
      });

      // AI 메시지에 isStopped 설정
      useChatMessageStore.getState().updateMessage(
        chatId,
        {
          isStreaming: false,
          isStopped: true,
          stoppedAt: new Date().toISOString()
        },
        sessionId
      );
    },

    getMessageStream: (chatId: string) => {
      return get().streams.get(chatId) || null;
    },

    clearCompletedStreams: () => {
      set((state) => {
        const newStreams = new Map<string, MessageStreamState>();
        state.streams.forEach((stream, key) => {
          if (stream.status === "streaming" || stream.status === "pending") {
            newStreams.set(key, stream);
          }
        });
        return { streams: newStreams };
      });
    },

    clearAllStreams: () => {
      // 모든 활성 스트림 취소
      abortControllerMap.forEach((controller) => controller.abort());
      abortControllerMap.clear();
      set({ streams: new Map(), isSending: false, sendingSessionId: null });
    }
  })
);
