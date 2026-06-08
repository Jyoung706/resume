import { ApiResponse, PaginatedResponse } from '../shared/api';
import { ChatMessage, ChatSession } from '../shared/models';

/**
 * 메시지 타입
 */
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

/**
 * 메시지 상태
 */
export enum MessageStatus {
  PENDING = 'pending',
  SENDING = 'sending',
  SENT = 'sent',
  ERROR = 'error',
  STREAMING = 'streaming',
  COMPLETED = 'completed'
}

/**
 * Frontend → Backend 세션 생성 요청
 */
export interface CreateSessionRequest {
  title?: string;
}

/**
 * Backend → Frontend 세션 생성 응답
 */
export interface CreateSessionResponse {
  sessionId: string;
  title: string;
  createdAt: string;
}

/**
 * Frontend → Backend 세션 목록 요청
 */
export interface GetSessionsRequest {
  page?: number;
  limit?: number;
}

/**
 * Backend → Frontend 세션 목록 응답
 */
export interface GetSessionsResponse {
  sessions: ChatSession[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Frontend → Backend 세션 메시지 요청
 */
export interface GetSessionMessagesRequest {
  sessionId: string;
  page?: number;
  limit?: number;
}

/**
 * Backend → Frontend 세션 메시지 응답
 */
export interface GetSessionMessagesResponse {
  messages: ChatMessage[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Frontend → Backend 메시지 전송 요청
 */
export interface SendMessageRequest {
  sessionId: string;
  message: string;
  title?: string;
  /** 선택된 언어모델 ID (옵션, 미지정시 기본값 사용) */
  modelId?: string;
  /** 선택된 키워드 배열 */
  keywords?: string[];
  /** 선택된 데이터베이스 스키마 */
  selectedSchema?: any;
  /** 데이터베이스 경로 (share/sqlite 이후의 상대 경로) */
  dbId?: string;
  /** 선택된 언어모델의 API 키 */
  apiKey?: string;
}

/**
 * Backend → Frontend 메시지 전송 응답
 */
export interface SendMessageResponse {
  messageId: string;
  timestamp: string;
  status: MessageStatus;
}

/**
 * Frontend → Backend 스트림 요청
 */
export interface StreamMessageRequest {
  sessionId: string;
  message: string;
  title?: string;
  keywords?: string[]; // 선택된 키워드 배열
}

/**
 * Frontend → Backend 메시지 저장 요청
 */
export interface SaveMessagesRequest {
  sessionId: string;
  userMessage: {
    content: string;
    timestamp: string;
  };
  assistantMessage: {
    content: string;
    timestamp: string;
  };
}

/**
 * Backend → Frontend 메시지 저장 응답
 */
export interface SaveMessagesResponse {
  success: boolean;
  userMessageId?: string;
  assistantMessageId?: string;
}

/**
 * Frontend → Backend 메시지 메타데이터 업데이트 요청
 */
export interface UpdateMessageMetadataRequest {
  messageId: string;
  metadata: Record<string, any>;
}

/**
 * Frontend → Backend 세션 삭제 요청
 */
export interface DeleteSessionRequest {
  sessionId: string;
}

/**
 * Frontend → Backend 스트림 취소 요청
 */
export interface CancelStreamRequest {
  sessionId: string;
}

/**
 * Frontend → Backend CSV 다운로드 요청
 */
export interface DownloadCsvRequest {
  messageId: string;
  filename?: string;
}

/**
 * 채팅 이력 메시지 타입 (2025-11-21)
 */
export enum ChatHistoryMessageType {
  SQL = 'sql',
  GENERAL = 'general'
}

/**
 * 프로세스 단계 정보 (2025-11-21)
 */
export interface ProcessStep {
  name: string;
  status: 'success' | 'failed' | 'pending';
  order: number;
  message?: string; // 진행 중 메시지
}

/**
 * 채팅 이력 항목 (2025-11-21)
 */
export interface ChatHistoryItem {
  messageId: string;
  sessionId: string;
  question: string;
  answer: string;
  messageType: ChatHistoryMessageType;
  sql?: string;
  success: boolean;
  steps?: ProcessStep[];
  timestamp: number;
  createdAt: string;
}

/**
 * Frontend → Backend 채팅 이력 조회 요청 (2025-11-21)
 */
export interface GetChatHistoryRequest {
  sessionId: string;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

/**
 * Backend → Frontend 채팅 이력 조회 응답 (2025-11-21)
 */
export interface GetChatHistoryResponse {
  history: ChatHistoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// API 응답 타입 alias
export type CreateSessionApiResponse = ApiResponse<CreateSessionResponse>;
export type GetSessionsApiResponse = ApiResponse<GetSessionsResponse>;
export type GetSessionMessagesApiResponse = ApiResponse<GetSessionMessagesResponse>;
export type SendMessageApiResponse = ApiResponse<SendMessageResponse>;
export type SaveMessagesApiResponse = ApiResponse<SaveMessagesResponse>;
export type UpdateMessageMetadataApiResponse = ApiResponse<{ success: boolean }>;
export type DeleteSessionApiResponse = ApiResponse<{ success: boolean }>;
export type CancelStreamApiResponse = ApiResponse<{ success: boolean }>;
export type DownloadCsvApiResponse = ApiResponse<{ url: string; filename: string }>;
export type GetChatHistoryApiResponse = ApiResponse<GetChatHistoryResponse>;