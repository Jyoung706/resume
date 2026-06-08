/**
 * Chat Service — API 통신 계층
 * orkis-front ChatServiceFacade 이식 (단일 파일 통합)
 */
import { apiPost } from "@/logic/shared/services/request";
import { getLogger } from "@/logic/shared/utils/logger";
import {
  extractProcessesFromMessage,
  extractResultFromMessage,
  ensureSqlResult,
  forceCompleteProcesses,
} from "@/logic/shared/utils/messageNormalizer";
import type {
  ChatSession,
  ChatSessionListResponse,
  ChatMessage,
  UpdateTitleOptions,
  MessageDatesResponse,
  MessagesByDateResponse,
  PaginationInfo,
} from "@/logic/common/chat/types/chat";

const logger = getLogger("ChatService");

const EMPTY_PAGINATION: PaginationInfo = {
  page: 1,
  limit: 100,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false,
};

// ============================================
// Session API
// ============================================

async function getChatSessions(): Promise<ChatSessionListResponse> {
  try {
    const response = await apiPost<{
      sessions: Array<{
        id: string;
        title: string;
        userId: string;
        createdAt: string;
        updatedAt: string;
        messageCount: number;
        titleModified?: boolean;
        isFavorite?: boolean;
      }>;
      pagination: PaginationInfo;
    }>("/chat/sessions/list", {});

    if (response.sessions && Array.isArray(response.sessions)) {
      const sessions = response.sessions.map((s) => ({
        sessionId: s.id,
        title: s.title,
        createdAt: s.createdAt ? new Date(s.createdAt).getTime() : Date.now(),
        updatedAt: s.updatedAt,
        titleModified: s.titleModified,
        isFavorite: s.isFavorite,
      }));
      return { sessions, pagination: response.pagination };
    }

    return { sessions: [], pagination: EMPTY_PAGINATION };
  } catch (error) {
    logger.error("getChatSessions 실패:", error);
    return { sessions: [], pagination: EMPTY_PAGINATION };
  }
}

async function createChatSession(title?: string): Promise<ChatSession> {
  const defaultTitle = title || "새로운 채팅";
  const uniqueTitle = `${defaultTitle} ${new Date().toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`;

  const response = await apiPost<
    | { session: { id: string; title: string; createdAt: string; updatedAt: string } }
    | { id: string; title: string; createdAt: string; updatedAt: string }
  >("/chat/sessions/", { title: uniqueTitle });

  if ("session" in response && response.session) {
    const s = response.session;
    return {
      sessionId: s.id,
      title: s.title,
      createdAt: s.createdAt ? new Date(s.createdAt).getTime() : Date.now(),
      updatedAt: s.updatedAt,
    };
  }

  if ("id" in response && response.id) {
    return {
      sessionId: response.id,
      title: response.title,
      createdAt: response.createdAt ? new Date(response.createdAt).getTime() : Date.now(),
      updatedAt: response.updatedAt,
    };
  }

  throw new Error("세션 생성 실패 - 응답 형식 불일치");
}

async function updateSessionTitle(
  sessionId: string,
  title: string,
  options?: UpdateTitleOptions
): Promise<boolean> {
  if (options?.skipIfModified && options?.currentTitleModified === true) {
    return false;
  }

  try {
    await apiPost(`/chat/sessions/${sessionId}/update`, {
      title,
      titleModified: true,
    });
    return true;
  } catch (error) {
    logger.error("updateSessionTitle 실패:", error);
    if (options?.skipIfModified) return false;
    throw error;
  }
}

async function deleteSession(sessionId: string): Promise<void> {
  await apiPost(`/chat/sessions/${sessionId}/delete`, {});
}

async function toggleFavorite(sessionId: string, isFavorite: boolean): Promise<void> {
  await apiPost(`/chat/sessions/${sessionId}/favorite`, { isFavorite });
}

// ============================================
// Message API
// ============================================

/**
 * API 응답에서 questionType 추출
 * orkis-front extractQuestionType 기준:
 *   1. 명시적 questionType (metadata, aiMetadata, 최상위)
 *   2. processes/steps 배열 존재 시 "sql", 없으면 "general"
 */
function extractQuestionType(msg: Record<string, unknown>): "sql" | "general" {
  const metadata = (msg.metadata || {}) as Record<string, unknown>;
  const aiMetadata = (msg.aiMetadata || {}) as Record<string, unknown>;
  const explicit =
    metadata.questionType || aiMetadata.questionType || msg.questionType;
  if (explicit) return explicit === "sql" ? "sql" : "general";

  const processes = msg.processes as unknown[] | undefined;
  const steps = msg.steps as unknown[] | undefined;
  if ((processes && processes.length > 0) || (steps && steps.length > 0)) {
    return "sql";
  }
  return "general";
}

// processes/result 정규화는 messageNormalizer.ts에서 공통 관리

/**
 * API 응답 메시지를 ChatMessage 타입으로 변환
 * 백엔드는 role 필드를 사용하지만 프론트는 type 필드를 사용
 */
function transformApiMessage(msg: Record<string, unknown>, sessionId: string): ChatMessage {
  const role = (msg.role as string) || "assistant";
  const questionType = extractQuestionType(msg);
  const metadata = (msg.metadata || {}) as Record<string, unknown>;
  const completionCode = metadata.completionCode as number | undefined;
  // completionCode 9001(취소)이면 중간 프로세스 결과가 content에 있어도 중지/에러 상태로 처리
  const isError = !!msg.isError || (completionCode !== undefined && completionCode >= 9002 && completionCode <= 9004);
  // 명시적 stop 판정: 백엔드 플래그 > completionCode 9001 > finalStatus "partial" (프로세스 미완료 fallback)
  const explicitlyStopped = !!msg.isStopped || completionCode === 9001 ||
    (!isError && metadata.finalStatus === "partial");
  // Phase 0' (cancel-archive race fix): archive 가 9000 으로 굳었으나 본문이 비어있는
  // assistant 메시지를 incomplete 로 표시한다. backend/jobs Phase 1~3 fix 이후 신규 발생은
  // 0 수렴, 기존 ~270건 (cancel 의 91%) cover 용. 정상 empty 응답은 매우 드물고 안내문이
  // 표시되어도 사용자 혼란 적음 (acceptable false-positive).
  const rawContent = typeof msg.content === "string" ? msg.content : "";
  const hasContent = rawContent.trim().length > 0;
  const isAssistant = role !== "user";
  const isIncompleteArchived =
    isAssistant && !isError && !explicitlyStopped && !hasContent;
  const isStopped = explicitlyStopped || isIncompleteArchived;
  const stoppedReason: ChatMessage["stoppedReason"] = isStopped
    ? (isIncompleteArchived ? "incomplete" : "user")
    : undefined;
  // 백엔드 isError 플래그 우선 → messageType → questionType 순서
  const messageType: ChatMessage["messageType"] = isError
    ? "error"
    : isStopped
      ? "warning"
      : (msg.messageType as ChatMessage["messageType"]) || questionType;

  // 공통 정규화 유틸리티로 processes/result 추출
  let processes = extractProcessesFromMessage(msg);
  const rawResult = extractResultFromMessage(msg);
  // SQL 타입인데 result 없으면 content에서 SQL 쿼리 추출하여 최소 result 생성
  const { result, content: normalizedContent } = ensureSqlResult(msg, rawResult, questionType);

  // 로드된 메시지: 성공 완료 시 모든 non-error step → completed 강제 처리
  // (실시간에서는 complete 이벤트가 처리하지만, 로드 시에는 별도 처리 필요)
  if (processes && !isError && !isStopped && metadata.finalStatus === "success") {
    processes = forceCompleteProcesses(processes);
  }

  // 중지된 SQL 메시지: 첫 번째 미완료 스텝을 "stopped"로 마킹
  if (isStopped && questionType === "sql" && processes && processes.length > 0) {
    const firstNonCompleted = processes.findIndex((p) => p.status !== "completed");
    if (firstNonCompleted >= 0) {
      processes = processes.map((p, i) =>
        i === firstNonCompleted ? { ...p, status: "stopped" as const } : p
      );
    }
  }

  return {
    id: (msg.id as string) || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    sessionId: (msg.sessionId as string) || sessionId,
    type: role === "user" ? "user" : "assistant",
    role: role as ChatMessage["role"],
    content: normalizedContent,
    timestamp: (msg.timestamp as string) || (msg.createdAt as string) || new Date().toISOString(),
    messageType,
    questionType,
    isStreaming: false,
    isStopped,
    stoppedReason,
    stoppedAt: (msg.stoppedAt as string) || undefined,
    source: "loaded",
    processes,
    result,
    metadata: msg.metadata as ChatMessage["metadata"],
  };
}

async function getChatMessages(sessionId: string): Promise<ChatMessage[]> {
  try {
    const response = await apiPost<{ messages: Array<Record<string, unknown>> }>(
      "/chat/sessions/messages",
      { sessionId }
    );
    return (response.messages || []).map((msg) => transformApiMessage(msg, sessionId));
  } catch (error) {
    logger.error("getChatMessages 실패:", error);
    return [];
  }
}

// [v2.2 Phase 4.7] chatId 단위 cursor 페이지네이션 — 지난 대화 더 보기
export interface PagedMessagesPageInfo {
  limit: number;
  returnedRecords: number;
  returnedMessages: number;
  hasOlder: boolean;
  nextCursor: string | null;
}

export interface PagedMessagesResult {
  messages: ChatMessage[];
  pageInfo: PagedMessagesPageInfo;
  inProgress: Array<{
    chatId: string;
    user: ChatMessage;
    assistant: ChatMessage | null;
  }>;
}

async function getChatMessagesPage(
  sessionId: string,
  options: { limit: number; cursor?: string }
): Promise<PagedMessagesResult> {
  try {
    const response = await apiPost<{
      messages: Array<Record<string, unknown>>;
      pageInfo: PagedMessagesPageInfo;
      inProgress?: Array<{
        chatId: string;
        user: Record<string, unknown>;
        assistant: Record<string, unknown> | null;
      }>;
    }>("/chat/sessions/messages/page", {
      sessionId,
      limit: options.limit,
      cursor: options.cursor,
    });

    return {
      messages: (response.messages || []).map((msg) =>
        transformApiMessage(msg, sessionId)
      ),
      pageInfo: response.pageInfo ?? {
        limit: options.limit,
        returnedRecords: 0,
        returnedMessages: 0,
        hasOlder: false,
        nextCursor: null,
      },
      inProgress: (response.inProgress ?? []).map((ip) => ({
        chatId: ip.chatId,
        user: transformApiMessage(ip.user, sessionId),
        assistant: ip.assistant ? transformApiMessage(ip.assistant, sessionId) : null,
      })),
    };
  } catch (error) {
    logger.error("getChatMessagesPage 실패:", error);
    return {
      messages: [],
      pageInfo: {
        limit: options.limit,
        returnedRecords: 0,
        returnedMessages: 0,
        hasOlder: false,
        nextCursor: null,
      },
      inProgress: [],
    };
  }
}

async function getMessageDates(sessionId: string): Promise<MessageDatesResponse> {
  try {
    return await apiPost<MessageDatesResponse>(
      "/chat/sessions/messages/dates",
      { sessionId }
    );
  } catch (error) {
    logger.error("getMessageDates 실패:", error);
    return { dates: [], hasMoreDates: false, latestDate: null };
  }
}

async function getMessagesByDate(
  sessionId: string,
  date: string
): Promise<MessagesByDateResponse> {
  try {
    const response = await apiPost<{
      messages: Array<Record<string, unknown>>;
      date: string;
      totalCount: number;
    }>(
      "/chat/sessions/messages/by-date",
      { sessionId, date }
    );
    return {
      messages: (response.messages || []).map((msg) => transformApiMessage(msg, sessionId)),
      date: response.date,
      totalCount: response.totalCount,
    };
  } catch (error) {
    logger.error("getMessagesByDate 실패:", error);
    return { messages: [], date, totalCount: 0 };
  }
}

// ============================================
// SQL API
// ============================================

async function executeSql(
  sessionId: string,
  sqlQuery: string
): Promise<{ columns: string[]; data: unknown[]; rowCount: number; executionTime?: number }> {
  return apiPost("/sql/execute", { sessionId, sqlQuery });
}

// ============================================
// Export
// ============================================

export const chatService = {
  // Session
  getChatSessions,
  createChatSession,
  updateSessionTitle,
  deleteSession,
  toggleFavorite,
  // Message
  getChatMessages,
  getChatMessagesPage,
  getMessageDates,
  getMessagesByDate,
  // SQL
  executeSql,
};
