/**
 * ORKIS Backend 표준 에러 응답 인터페이스
 */

/**
 * 표준 에러 응답 인터페이스
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  timestamp: string;
  path?: string;
  details?: any;
}

/**
 * 표준 성공 응답 인터페이스
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp: string;
  message?: string;
}

/**
 * 일반 API 응답 타입 (성공 또는 에러)
 */
export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

/**
 * 에러 코드 상수
 */
export enum ErrorCode {
  // 400 Bad Request
  BAD_REQUEST = 'BAD_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // 401 Unauthorized
  UNAUTHORIZED = 'UNAUTHORIZED',
  ORKIS_AUTH_ERROR = 'ORKIS_AUTH_ERROR',

  // 403 Forbidden
  FORBIDDEN = 'FORBIDDEN',

  // 404 Not Found
  NOT_FOUND = 'NOT_FOUND',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',

  // 408 Timeout
  TIMEOUT = 'TIMEOUT',
  RAG_SERVER_TIMEOUT = 'RAG_SERVER_TIMEOUT',

  // 500 Internal Server Error
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',

  // 503 Service Unavailable
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RAG_SERVER_UNREACHABLE = 'RAG_SERVER_UNREACHABLE',
  RAG_SERVER_ERROR = 'RAG_SERVER_ERROR',
  REDIS_CONNECTION_ERROR = 'REDIS_CONNECTION_ERROR',

  // Chat specific errors
  CHAT_ERROR = 'CHAT_ERROR',
  INVALID_RESPONSE = 'INVALID_RESPONSE'
}

/**
 * 채팅 관련 에러 타입
 */
export enum ChatErrorType {
  RAG_SERVER_UNREACHABLE = 'RAG_SERVER_UNREACHABLE',
  RAG_SERVER_TIMEOUT = 'RAG_SERVER_TIMEOUT',
  RAG_SERVER_ERROR = 'RAG_SERVER_ERROR',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  DATABASE_ERROR = 'DATABASE_ERROR'
}

/**
 * 채팅 에러 메시지 정보
 */
export interface ChatErrorMessageInfo {
  userMessage: string;
  technicalMessage: string;
}

/**
 * 채팅 에러 메시지 맵
 */
export const ChatErrorMessages: Record<ChatErrorType, ChatErrorMessageInfo> = {
  [ChatErrorType.RAG_SERVER_UNREACHABLE]: {
    userMessage: 'AI 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
    technicalMessage: 'RAG 서버에 연결할 수 없습니다.'
  },
  [ChatErrorType.RAG_SERVER_TIMEOUT]: {
    userMessage: 'AI 응답 시간이 초과되었습니다. 질문을 다시 시도해주세요.',
    technicalMessage: 'RAG 서버 요청 타임아웃'
  },
  [ChatErrorType.RAG_SERVER_ERROR]: {
    userMessage: 'AI 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    technicalMessage: 'RAG 서버 오류'
  },
  [ChatErrorType.INVALID_RESPONSE]: {
    userMessage: 'AI 응답을 처리할 수 없습니다. 다른 질문을 시도해주세요.',
    technicalMessage: 'RAG 서버 응답 형식 오류'
  },
  [ChatErrorType.SESSION_NOT_FOUND]: {
    userMessage: '채팅 세션을 찾을 수 없습니다.',
    technicalMessage: '세션 ID가 유효하지 않습니다.'
  },
  [ChatErrorType.UNAUTHORIZED]: {
    userMessage: '이 채팅에 접근할 권한이 없습니다.',
    technicalMessage: '세션 접근 권한 없음'
  },
  [ChatErrorType.DATABASE_ERROR]: {
    userMessage: '데이터 처리 중 오류가 발생했습니다.',
    technicalMessage: '데이터베이스 작업 실패'
  }
};

/**
 * HTTP 상태 코드 매핑
 */
export const ErrorStatusCodes: Record<ErrorCode, number> = {
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.ORKIS_AUTH_ERROR]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.SESSION_NOT_FOUND]: 404,
  [ErrorCode.TIMEOUT]: 408,
  [ErrorCode.RAG_SERVER_TIMEOUT]: 408,
  [ErrorCode.INTERNAL_SERVER_ERROR]: 500,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.RAG_SERVER_UNREACHABLE]: 503,
  [ErrorCode.RAG_SERVER_ERROR]: 503,
  [ErrorCode.REDIS_CONNECTION_ERROR]: 503,
  [ErrorCode.CHAT_ERROR]: 500,
  [ErrorCode.INVALID_RESPONSE]: 500
};
