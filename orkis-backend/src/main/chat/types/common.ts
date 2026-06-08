// 공통 API 응답 타입
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp?: Date;
  error?: string;
}

// 세션 관련 응답 타입
export interface CreateSessionResponse {
  session: import("@orkis-interface/shared/models").ChatSession;
}

export interface SendMessageResponse {
  message: import("@orkis-interface/shared/models").ChatMessage;
}

export interface SessionListResponse {
  sessions: import("@orkis-interface/shared/models").ChatSession[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface MessageListResponse {
  messages: import("@orkis-interface/shared/models").ChatMessage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface DeleteSessionResponse {
  success: boolean;
  message?: string;
  error?: string;
  result?: any;
  timestamp?: string;
}

export interface SessionMessagesRequest {
  sessionId: string;
  page?: number;
  limit?: number;
}

// [v2.2 Phase 4.7] chatId 단위 cursor 페이지네이션 (지난 대화 더 보기)
export interface PagedMessagesRequest {
  sessionId: string;
  limit: number;
  cursor?: string; // 이전 페이지의 nextCursor (= 가장 오래된 chatId)
}

export interface PagedMessagesPageInfo {
  limit: number;
  returnedRecords: number; // 실제 반환된 chatId 수
  returnedMessages: number; // 실제 반환된 ChatMessage 수
  hasOlder: boolean;
  nextCursor: string | null; // 다음 페이지 cursor 인자에 그대로 전달
}

export interface PagedMessagesResponse {
  messages: import("@orkis-interface/shared/models").ChatMessage[];
  pageInfo: PagedMessagesPageInfo;
  inProgress: Array<{
    chatId: string;
    user: import("@orkis-interface/shared/models").ChatMessage;
    assistant: import("@orkis-interface/shared/models").ChatMessage | null;
  }>;
}

export type PagedMessagesApiResponse = ApiResponse<PagedMessagesResponse>;

// API 응답 타입 별칭
export type SendMessageApiResponse = ApiResponse<SendMessageResponse>;
export type CreateSessionApiResponse = ApiResponse<CreateSessionResponse>;
export type SessionListApiResponse = ApiResponse<SessionListResponse>;
export type MessageListApiResponse = ApiResponse<MessageListResponse>;
