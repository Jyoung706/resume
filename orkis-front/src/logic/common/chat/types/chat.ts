/**
 * 채팅 관련 타입 정의
 * orkis-front의 채팅 시스템 타입을 기반으로 정의
 */

// ============================================
// 세션
// ============================================

export interface ChatSession {
  sessionId: string;
  title: string;
  createdAt: number;
  updatedAt: string;
  titleModified?: boolean;
  isFavorite?: boolean;
}

export interface ChatItem {
  id: string;
  title: string;
  selected: boolean;
  favorite: boolean;
  sessionId: string;
  updatedAt?: string;
  titleModified?: boolean;
  dbConnectionId?: number;
  selectedModel?: string;
  ragEnabled?: boolean;
}

// ============================================
// 메시지
// ============================================

export type MessageType = "general" | "sql" | "waiting_status" | "error" | "warning";
export type QuestionType = "general" | "sql" | "unknown";
export type MessageSource = "realtime" | "loaded" | "cached";

export interface ChatMessage {
  id: string;
  sessionId?: string;
  type: "user" | "assistant";
  role?: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  messageType?: MessageType;
  questionType?: QuestionType;
  source?: MessageSource;
  isStreaming?: boolean;
  isStopped?: boolean;
  /**
   * isStopped 가 true 일 때 그 종료 사유 (UI 문구 분기 용).
   * - "user": 사용자 명시 정지 (completionCode 9001 또는 isStopped 플래그)
   * - "incomplete": archive 가 9000 으로 굳었으나 본문 비어있음 (cancel race 패배 잔존 데이터)
   *   Phase 1~3 backend/jobs fix 후 신규 발생은 0 수렴, 기존 ~270건 cover 용.
   */
  stoppedReason?: "user" | "incomplete";
  stoppedAt?: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
  // SQL 관련
  sqlSteps?: SqlStep[];
  sqlQuery?: string;
  queryColumns?: Array<string | { name: string; type?: string }>;
  queryData?: Array<Record<string, string | number>>;
  processes?: ProcessStep[];
  result?: SqlResult | GeneralResult;
}

export interface SqlStep {
  id: string;
  label: string;
  status: "pending" | "processing" | "success" | "error";
  percentage?: string;
}

export interface ProcessStep {
  id: string;
  label: string;
  status: "pending" | "running" | "completed" | "error" | "stopped";
}

export interface SqlResult {
  columns: Array<string | { name: string; type?: string }>;
  data: Array<Record<string, string | number>>;
  query: string;
  executionTime?: number;
  /** 쿼리 실행 실패 메시지 (백엔드 SQLITE_ERROR 등) */
  error?: string;
}

export interface GeneralResult {
  content: string;
  references?: string[];
}

// ============================================
// 스트리밍
// ============================================

export type StreamStatus = "pending" | "streaming" | "completed" | "error" | "cancelled";

export interface MessageStreamState {
  chatId: string;
  sessionId: string;
  status: StreamStatus;
  chatType?: "sql" | "general";
  messageType?: MessageType;
  content: string;
  streamingContent: string;
  isContentComplete: boolean;
  processes: ProcessStep[];
  result?: SqlResult | GeneralResult;
  error?: string;
}

export interface TitleUpdatePayload {
  title: string;
  sessionId: string;
}

export interface SendMessageOptions {
  keywords?: string[];
  dbId?: string;
  schemaContext?: string;
  modelId?: string;
  apiKey?: string;
  connectionId?: string;
}

export interface StreamingCallbacks {
  onMessage: (content: string, processData?: unknown) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
  onConnectionState?: (connected: boolean) => void;
}

// ============================================
// 페이지네이션
// ============================================

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationState {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ============================================
// API 응답
// ============================================

export interface ChatSessionListResponse {
  sessions: ChatSession[];
  pagination: PaginationInfo;
}

export interface MessageDatesResponse {
  dates: string[];
  hasMoreDates: boolean;
  latestDate: string | null;
}

export interface MessagesByDateResponse {
  messages: ChatMessage[];
  date: string;
  totalCount: number;
}

export interface UpdateTitleOptions {
  skipIfModified?: boolean;
  currentTitleModified?: boolean;
}

// ============================================
// 채팅 이력 (API 응답 타입 - orkis-interface 기반)
// ============================================

export type ChatHistoryMessageType = "sql" | "general";

/** API 응답의 프로세스 단계 (orkis-interface ProcessStep) */
export interface ApiProcessStep {
  name: string;
  status: "success" | "failed" | "pending";
  order: number;
  message?: string;
}

/** API 응답의 이력 항목 (orkis-interface ChatHistoryItem) */
export interface ChatHistoryApiItem {
  messageId: string;
  sessionId: string;
  question: string;
  answer: string;
  messageType: ChatHistoryMessageType;
  sql?: string;
  success: boolean;
  steps?: ApiProcessStep[];
  timestamp: number;
  createdAt: string;
}

/** 이력 목록 API 응답 (orkis-interface GetChatHistoryResponse) */
export interface ChatHistoryListResponse {
  history: ChatHistoryApiItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** 이력 조회 필터 */
export interface ChatHistoryFilter {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}
