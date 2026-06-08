/**
 * StreamManager — React 생명주기 독립적인 SSE 스트림 관리
 * messageStreamStore.sendMessage() 로직을 외부 싱글톤으로 추출
 * Activity hidden 상태에서도 스트림이 계속 수신됨
 */
import { API_BASE } from "@/logic/shared/config/env";
import { useChatMessageStore } from "@/logic/common/chat/stores/chatMessageStore";
import { useChatSessionStore } from "@/logic/common/chat/stores/chatSessionStore";
import type {
  ChatMessage,
  MessageStreamState,
  ProcessStep,
  SendMessageOptions,
  SqlResult,
} from "@/logic/common/chat/types/chat";
import { getLogger } from "@/logic/shared/utils/logger";
import { generateChatId, generateAiChatId } from "@/logic/shared/utils/chatId";
import {
  updateProcessStep,
  normalizeResult,
  extractSqlQuery,
  forceCompleteProcesses,
  markRunningAsError,
} from "@/logic/shared/utils/messageNormalizer";

const logger = getLogger("StreamManager");


// 백엔드 work_enum.py 기준 에러 코드 매핑
// 9000=SUCCESS, 9001=CANCEL(complete 이벤트로 처리), 9002+=error 이벤트로 수신
const SSE_ERROR_MESSAGES: Record<number, string> = {
  9002: "백엔드 서버가 종료되었습니다.",
  9003: "AI 서버 처리 중 오류가 발생했습니다.",
  9004: "RAG 전처리가 완료되지 않았습니다. 설정에서 전처리를 진행해주세요.",
};

function getSSEErrorMessage(code?: number): string {
  if (!code) return "알 수 없는 오류가 발생했습니다.";
  if (SSE_ERROR_MESSAGES[code]) return SSE_ERROR_MESSAGES[code];
  // 미등록 코드 — 추후 추가되는 에러 코드 대비 범용 메시지
  return `처리 중 오류가 발생했습니다. (코드: ${code})`;
}

interface SSEEvent {
  type: string;
  payload: Record<string, unknown>;
}

/**
 * SSE 텍스트 버퍼를 파싱하여 이벤트 추출
 * 형식: event: message_stream\ndata: {...JSON...}\n\n
 * message_stream 이벤트만 처리 (프로덕션과 동일)
 */
function parseSSEEvents(text: string): SSEEvent[] {
  const events: SSEEvent[] = [];
  const lines = text.split("\n");

  let currentEvent = "";
  let currentData = "";

  for (const line of lines) {
    if (line.startsWith("event:")) {
      currentEvent = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      currentData = line.slice(5).trim();
    } else if (line === "" && currentData) {
      // 빈 줄 = 이벤트 경계
      if (currentEvent === "message_stream" || currentEvent === "") {
        try {
          events.push(JSON.parse(currentData) as SSEEvent);
        } catch {
          logger.error("SSE 데이터 파싱 에러:", currentData);
        }
      }
      currentEvent = "";
      currentData = "";
    }
  }

  return events;
}

// 프로세스 상태 업데이트는 messageNormalizer.updateProcessStep 사용

// ── 활성 스트림 상태 ────────────────────────

interface ActiveStream {
  chatId: string;
  aiChatId: string;
  sessionId: string;
  controller: AbortController;
  content: string;
  streamingContent: string;
  status: MessageStreamState["status"];
  chatType?: "sql" | "general";
  messageType?: string;
  processes: ProcessStep[];
  result?: MessageStreamState["result"];
  error?: string;
}

// ── 상태 변경 리스너 ────────────────────────

type StreamChangeListener = () => void;

// ── StreamManager 클래스 ────────────────────

class StreamManager {
  private streams = new Map<string, ActiveStream>();
  private listeners = new Set<StreamChangeListener>();

  // ── 외부 구독 (useSyncExternalStore 연동용) ──

  subscribe = (listener: StreamChangeListener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  /** 키워드/스키마 선택 초기화 (스트림 종료 시 공통 호출) */
  private clearSelections(sessionId: string): void {
    import("@/logic/common/chat/stores/keywordSelectionStore")
      .then(({ useKeywordSelectionStore }) => {
        useKeywordSelectionStore.getState().clearAllKeywords(sessionId);
      })
      .catch(() => { /* 무시 */ });
    import("@/logic/common/chat/stores/schemaSelectionStore")
      .then(({ useSchemaSelectionStore }) => {
        useSchemaSelectionStore.getState().clearSelection(sessionId);
      })
      .catch(() => { /* 무시 */ });
  }

  getSnapshot = (): Map<string, ActiveStream> => {
    return this.streams;
  };

  // ── 조회 ──

  /** 특정 세션이 스트리밍 중인지 */
  isSessionStreaming(sessionId: string): boolean {
    for (const s of this.streams.values()) {
      if (
        s.sessionId === sessionId &&
        (s.status === "pending" || s.status === "streaming")
      )
        return true;
    }
    return false;
  }

  /** 전체 스트리밍 상태 */
  get isSending(): boolean {
    for (const s of this.streams.values()) {
      if (s.status === "pending" || s.status === "streaming") return true;
    }
    return false;
  }

  // ── 메시지 전송 ──

  async startStream(
    sessionId: string,
    content: string,
    options?: SendMessageOptions
  ): Promise<string> {
    const chatId = generateChatId();
    const aiChatId = generateAiChatId(chatId);
    const controller = new AbortController();

    // 1. 활성 스트림 등록 (key = chatId, 백엔드 기준 ID)
    this.streams.set(chatId, {
      chatId,
      aiChatId,
      sessionId,
      controller,
      content: "",
      streamingContent: "",
      status: "streaming",
      processes: [],
    });
    this.notify();

    // 2. 사용자 메시지 추가
    const userMessage: ChatMessage = {
      id: chatId,
      sessionId,
      type: "user",
      content,
      timestamp: new Date().toISOString(),
      source: "realtime",
    };
    useChatMessageStore.getState().addMessage(userMessage, sessionId);

    // 3. AI 대기 메시지 추가 (waiting_status → chat_type/content 이벤트에서 전환)
    const aiMessage: ChatMessage = {
      id: aiChatId,
      sessionId,
      type: "assistant",
      content: "",
      timestamp: new Date(Date.now() + 100).toISOString(),
      messageType: "waiting_status",
      isStreaming: true,
      source: "realtime",
    };
    useChatMessageStore.getState().addMessage(aiMessage, sessionId);

    // 4. Fetch 스트리밍 (비동기, React 무관)
    this.runFetchStream(chatId, sessionId, content, options, controller);

    return chatId;
  }

  // ── Fetch ReadableStream 처리 ──

  private async runFetchStream(
    chatId: string,
    sessionId: string,
    content: string,
    options: SendMessageOptions | undefined,
    controller: AbortController
  ): Promise<void> {
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
          ...options,
        }),
        credentials: "include",
        signal: controller.signal,
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

        // 이벤트 경계(\n\n) 기준으로 완성된 부분만 파싱
        const lastBoundary = buffer.lastIndexOf("\n\n");
        if (lastBoundary === -1) continue;

        const completePart = buffer.slice(0, lastBoundary + 2);
        buffer = buffer.slice(lastBoundary + 2);

        const events = parseSSEEvents(completePart);
        for (const event of events) {
          this.handleSSEEvent(chatId, sessionId, event);
        }
      }

      // 스트림 종료 — handleSSEEvent에서 이미 처리된 경우 스킵
      const endStream = this.streams.get(chatId);
      if (!endStream) return; // handleSSEEvent에서 이미 정리됨

      if (endStream.status === "streaming") {
        // complete 이벤트 없이 끊긴 경우
        logger.warn("스트림이 complete 이벤트 없이 종료됨:", chatId);
        if (endStream.content) {
          this.finalizeStream(chatId, sessionId, "completed");
        } else {
          endStream.content = "응답이 완료되지 않았습니다.";
          endStream.error = "스트림이 비정상 종료됨";
          this.finalizeStream(chatId, sessionId, "error");
        }
      }
      // else: handleSSEEvent에서 이미 complete/error 처리됨 → finalizeStream 호출 안 함
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        logger.info("스트림 취소됨:", chatId);
        // cancelStream에서 이미 처리 완료 → finalizeStream 호출 안 함
      } else {
        logger.error("스트림 에러:", error);
        const stream = this.streams.get(chatId);
        if (stream) {
          const errorMessage =
            (error as Error).message || "메시지 전송 중 오류가 발생했습니다.";
          // status는 finalizeStream에서 변경 (가드 조건: status === "streaming")
          stream.error = errorMessage;
          stream.content = `[오류] ${errorMessage}`;
        }
        this.finalizeStream(chatId, sessionId, "error");
      }
    }
  }

  // ── SSE 이벤트 핸들러 ──

  private handleSSEEvent(
    chatId: string,
    sessionId: string,
    event: SSEEvent
  ): void {
    const stream = this.streams.get(chatId);
    if (!stream) return;

    const { aiChatId } = stream;

    switch (event.type) {
      case "chat_type":
        stream.chatType = event.payload.type as "sql" | "general";
        break;

      case "steps":
        if (Array.isArray(event.payload.steps)) {
          stream.processes = (
            event.payload.steps as Array<Record<string, unknown>>
          ).map((s) => ({
            id: s.id as string,
            label: (s.label || s.name) as string,
            status: "pending" as const,
          }));
          useChatMessageStore
            .getState()
            .updateMessage(aiChatId, { processes: stream.processes }, sessionId);
        }
        break;

      case "step":
        stream.processes = updateProcessStep(stream.processes, event.payload);
        useChatMessageStore
          .getState()
          .updateMessage(
            aiChatId,
            { processes: [...stream.processes] },
            sessionId
          );
        break;

      case "content": {
        const chunk = (event.payload.chunk ||
          event.payload.content ||
          "") as string;
        stream.streamingContent += chunk;
        stream.content += chunk;
        if (stream.chatType) {
          stream.messageType = stream.chatType;
        }
        useChatMessageStore.getState().updateMessage(
          aiChatId,
          {
            content: stream.content,
            isStreaming: true,
            messageType: stream.messageType as ChatMessage["messageType"],
          },
          sessionId
        );
        this.notify();
        break;
      }

      case "title_update": {
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

      case "result": {
        const p = event.payload;
        // SQL 실행 실패는 result.error로 전달되며, 검증 step은 step 이벤트에서
        // stat=1(completed)로 정상 완료됨. status는 complete 이벤트가 처리.
        if (p.type === "general") {
          stream.result = {
            content: ((p.content as string) || stream.content),
          };
          useChatMessageStore.getState().updateMessage(
            aiChatId,
            {
              result: stream.result,
              isStreaming: false,
              messageType: "general" as ChatMessage["messageType"],
              questionType: p.type as ChatMessage["questionType"],
              processes: stream.processes,
            },
            sessionId
          );
        } else {
          // SQL 결과 — 2단계 렌더링: 쿼리 먼저 → 결과 테이블
          const fullResult = normalizeResult(p as Record<string, unknown>) ?? {
            query: extractSqlQuery(p as Record<string, unknown>),
            columns: (p.columns || []) as SqlResult["columns"],
            data: (p.data || []) as SqlResult["data"],
            executionTime: p.executionTime as number | undefined,
            error: p.error as string | undefined,
          };

          // 1단계: 쿼리만 먼저 표시 (중간 텍스트 사라짐, 쿼리 아코디언 표출)
          const sqlResult = fullResult as SqlResult;
          const queryOnlyResult: SqlResult = {
            query: sqlResult.query,
            columns: [] as SqlResult["columns"],
            data: [] as SqlResult["data"],
          };
          stream.result = queryOnlyResult;
          useChatMessageStore.getState().updateMessage(
            aiChatId,
            {
              result: queryOnlyResult,
              isStreaming: true,
              messageType: "sql" as ChatMessage["messageType"],
              questionType: p.type as ChatMessage["questionType"],
              processes: stream.processes,
            },
            sessionId
          );

          // 2단계: 결과 테이블 표시 (짧은 딜레이 후)
          setTimeout(() => {
            stream.result = fullResult;
            useChatMessageStore.getState().updateMessage(
              aiChatId,
              {
                result: fullResult,
                isStreaming: false,
                messageType: "sql" as ChatMessage["messageType"],
                questionType: p.type as ChatMessage["questionType"],
                processes: stream.processes,
              },
              sessionId
            );
          }, 300);
        }
        break;
      }

      case "complete":
        stream.status = "completed";
        stream.processes = forceCompleteProcesses(stream.processes);
        break;

      case "error": {
        stream.status = "error";
        const errorCode = event.payload.code as number | undefined;
        const errorMessage =
          (event.payload.message as string) ||
          getSSEErrorMessage(errorCode) ||
          (event.payload.error as string) ||
          "오류가 발생했습니다.";
        stream.error = errorMessage;
        // 프로덕션 동일: content를 에러 메시지로 덮어쓰기
        stream.content = errorMessage;
        // SQL 타입인 경우 running 중인 step을 error로 변환
        if (stream.chatType === "sql" && stream.processes.length > 0) {
          stream.processes = markRunningAsError(stream.processes);
        }
        break;
      }
    }

    // 완료/에러 시 chatMessageStore 최종 동기화 + 스트림 정리 (1회만)
    if (stream.status === "completed" || stream.status === "error") {
      useChatMessageStore.getState().updateMessage(
        aiChatId,
        {
          content: stream.content,
          isStreaming: false,
          messageType:
            stream.status === "error"
              ? ("error" as const)
              : ((stream.messageType || stream.chatType) as ChatMessage["messageType"]),
          processes: stream.processes,
          result: stream.result,
        },
        sessionId
      );
      if (stream.status === "completed") {
        useChatSessionStore.getState().updateSessionUpdatedAt(sessionId);
      }
      this.clearSelections(sessionId);
      // 직접 정리 — runFetchStream에서 finalizeStream 중복 호출 방지
      this.streams.delete(chatId);
      this.notify();
    }
  }

  // ── 스트림 종료 처리 ──

  /**
   * 스트림 종료 처리 — runFetchStream에서만 호출
   * handleSSEEvent/cancelStream에서 이미 처리된 경우 스킵
   */
  private finalizeStream(
    chatId: string,
    sessionId: string,
    status: "completed" | "cancelled" | "error"
  ): void {
    const stream = this.streams.get(chatId);

    // 가드: 이미 처리(cancelled/completed/error)되었거나 삭제된 스트림은 스킵
    if (!stream || stream.status !== "streaming") return;

    stream.status = status;

    // updateMessage 1회만 호출
    useChatMessageStore.getState().updateMessage(
      stream.aiChatId,
      {
        content: stream.content,
        isStreaming: false,
        messageType: status === "error"
          ? ("error" as const)
          : ((stream.messageType || stream.chatType) as ChatMessage["messageType"]),
        processes: stream.processes,
        result: stream.result,
        ...(status === "cancelled"
          ? { isStopped: true, stoppedAt: new Date().toISOString() }
          : {}),
      },
      sessionId
    );

    this.clearSelections(sessionId);
    this.streams.delete(chatId);
    this.notify();
  }

  // ── 조회: 활성 스트림 ID ──

  /** 특정 세션의 활성(스트리밍 중) chatId 반환 */
  getActiveStreamId(sessionId: string): string | null {
    for (const [chatId, stream] of this.streams) {
      if (
        stream.sessionId === sessionId &&
        (stream.status === "pending" || stream.status === "streaming")
      ) {
        return chatId;
      }
    }
    return null;
  }

  // ── 취소 ──

  async cancelStream(sessionId: string, chatId: string): Promise<void> {
    const stream = this.streams.get(chatId);
    if (!stream) return; // 이미 종료된 스트림은 무시 (불필요한 백엔드 호출 방지)

    // 1. 상태를 먼저 변경 (finalizeStream 이중 실행 방지)
    stream.status = "cancelled";

    // 2. AbortController로 스트림 중단
    stream.controller.abort();

    // 3. 백엔드 취소 통보 (fire-and-forget)
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

    // 4. 중지된 SQL 메시지: 첫 번째 미완료 스텝을 "stopped"로 마킹
    let processes = stream.processes;
    if (stream.chatType === "sql" && processes.length > 0) {
      const firstNonCompleted = processes.findIndex((p) => p.status !== "completed");
      if (firstNonCompleted >= 0) {
        processes = processes.map((p, i) =>
          i === firstNonCompleted ? { ...p, status: "stopped" as const } : p
        );
      }
    }

    // 5. AI 메시지 상태 업데이트
    useChatMessageStore.getState().updateMessage(
      stream.aiChatId,
      {
        content: stream.content || "",
        isStreaming: false,
        isStopped: true,
        stoppedAt: new Date().toISOString(),
        messageType: (stream.messageType || stream.chatType) as ChatMessage["messageType"],
        processes,
      },
      sessionId
    );

    // 6. 키워드/스키마 초기화
    this.clearSelections(sessionId);

    // 7. 스트림 제거 및 알림
    this.streams.delete(chatId);
    this.notify();
  }

  /** 모든 스트림 취소 */
  cancelAll(): void {
    for (const stream of this.streams.values()) {
      stream.controller.abort();
    }
    this.streams.clear();
    this.notify();
  }
}

/** 싱글톤 — 앱 전체에서 하나만 사용 */
export const streamManager = new StreamManager();
