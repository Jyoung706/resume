import { ErrorCode, ErrorLevel, StreamType } from './constants';

/**
 * 모든 통신에서 사용하는 표준 API 응답 타입
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: string;
  requestId?: string;
}

/**
 * Frontend 호환성을 위한 응답 타입 (기존 result 필드 지원)
 */
export interface StandardResponse<T = any> extends ApiResponse<T> {
  result?: T; // 백엔드 호환성을 위해 result 필드도 지원
}

/**
 * 표준화된 에러 응답 구조
 */
export interface ApiError {
  code: string; // Frontend 호환성을 위해 string으로 변경 (ErrorCode 대신)
  message: string;
  level?: string; // Frontend 호환성을 위해 optional로 변경
  details?: Record<string, any>;
  stack?: string; // 개발 환경에서만 포함
  path?: string;  // 에러 발생 API 경로
}

/**
 * 엄격한 타입의 에러 응답 구조 (Backend에서 사용)
 */
export interface StrictApiError {
  code: ErrorCode;
  message: string;
  level: ErrorLevel;
  details?: Record<string, any>;
  stack?: string;
  path?: string;
}

/**
 * 유효성 검증 에러 세부 정보
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  constraint?: string;
}

/**
 * 페이지네이션이 필요한 모든 통신에서 사용
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  timestamp: string;
}

/**
 * 스트리밍 응답의 기본 구조 (모든 스트리밍 통신에서 사용)
 */
export interface StreamResponse {
  type: StreamType;
  data?: any;
  error?: ApiError;
  timestamp: string;
  sequence?: number; // 스트림 순서 보장
}

/**
 * 파일 업로드/다운로드 응답
 */
export interface FileResponse {
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  url?: string;
  uploadedAt: string;
  hash?: string; // 파일 무결성 검증용
}

/**
 * 비동기 작업 응답 (긴 작업 추적용)
 */
export interface AsyncTaskResponse {
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number; // 0-100
  result?: any;
  error?: ApiError;
  startedAt: string;
  completedAt?: string;
}