/**
 * API 상태 코드 (모든 통신에서 사용)
 */
export const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const);

/**
 * 표준화된 에러 코드 (모든 통신에서 사용)
 */
export const ERROR_CODES = Object.freeze({
  // 인증 관련 에러 (2000번대)
  AUTH_INVALID_CREDENTIALS: '2001',
  AUTH_USER_NOT_FOUND: '2002', 
  AUTH_TOKEN_EXPIRED: '2003',
  AUTH_TOKEN_INVALID: '2004',
  AUTH_PERMISSION_DENIED: '2005',
  AUTH_ACCOUNT_LOCKED: '2006',
  AUTH_EMAIL_NOT_VERIFIED: '2007',
  AUTH_DUPLICATE_EMAIL: '2008',
  
  // 채팅 관련 에러 (3000번대)
  CHAT_SESSION_NOT_FOUND: '3001',
  CHAT_MESSAGE_INVALID: '3002',
  CHAT_SESSION_EXPIRED: '3003',
  CHAT_PERMISSION_DENIED: '3004',
  
  // AI 서버 관련 에러 (4000번대)
  AI_SERVER_ERROR: '4001',
  AI_GENERATION_FAILED: '4002',
  AI_STREAM_ERROR: '4003',
  AI_CONNECTION_ERROR: '4004',
  
  // 파일 관련 에러 (5000번대)
  FILE_NOT_FOUND: '5001',
  FILE_UPLOAD_FAILED: '5002',
  FILE_SIZE_EXCEEDED: '5003',
  FILE_TYPE_NOT_SUPPORTED: '5004',
  
  // 일반 시스템 에러 (1000번대)
  VALIDATION_ERROR: '1001',
  DATABASE_ERROR: '1002',
  NETWORK_ERROR: '1003',
  UNKNOWN_ERROR: '1999'
} as const);

/**
 * 에러 레벨 정의
 */
export const ERROR_LEVELS = Object.freeze({
  INFO: 'info',
  WARNING: 'warning', 
  ERROR: 'error',
  CRITICAL: 'critical'
} as const);

/**
 * 메시지 역할 (모든 채팅 통신에서 사용)
 */
export const MESSAGE_ROLE = Object.freeze({
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system'
} as const);

/**
 * 스트림 응답 타입 (스트리밍 통신에서 사용)
 */
export const STREAM_TYPES = Object.freeze({
  DATA: 'data',
  ERROR: 'error', 
  END: 'end',
  HEARTBEAT: 'heartbeat'
} as const);

/**
 * 로그인 타입 정의 (더 효율적인 방식)
 */
export const LOGIN_TYPES = Object.freeze({
  EMAIL: 'email',
  GOOGLE: 'google',
  GITHUB: 'github',
  NAVER: 'naver',
  KAKAO: 'kakao'
} as const);

// Type exports (더 효율적인 타입 추출)
export type MessageRole = typeof MESSAGE_ROLE[keyof typeof MESSAGE_ROLE];
export type LoginType = typeof LOGIN_TYPES[keyof typeof LOGIN_TYPES];
export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
export type ErrorLevel = typeof ERROR_LEVELS[keyof typeof ERROR_LEVELS];
export type StreamType = typeof STREAM_TYPES[keyof typeof STREAM_TYPES];

// 추가: 역방향 매핑 (값으로 키 찾기)
export const ERROR_CODE_TO_CATEGORY = Object.freeze({
  '2001': 'AUTH', '2002': 'AUTH', '2003': 'AUTH', '2004': 'AUTH',
  '2005': 'AUTH', '2006': 'AUTH', '2007': 'AUTH', '2008': 'AUTH',
  '3001': 'CHAT', '3002': 'CHAT', '3003': 'CHAT', '3004': 'CHAT',
  '4001': 'AI', '4002': 'AI', '4003': 'AI', '4004': 'AI',
  '5001': 'FILE', '5002': 'FILE', '5003': 'FILE', '5004': 'FILE',
  '1001': 'SYSTEM', '1002': 'SYSTEM', '1003': 'SYSTEM', '1999': 'SYSTEM'
} as const);

// 유틸리티 함수들
export const Constants = Object.freeze({
  /**
   * 에러 코드로부터 카테고리 추출
   */
  getErrorCategory: (code: ErrorCode): string => {
    return ERROR_CODE_TO_CATEGORY[code] || 'UNKNOWN';
  },

  /**
   * HTTP 상태 코드가 성공인지 확인
   */
  isSuccessStatus: (status: number): boolean => {
    return status >= 200 && status < 300;
  },

  /**
   * 에러 레벨이 심각한지 확인
   */
  isCriticalError: (level: ErrorLevel): boolean => {
    return level === ERROR_LEVELS.CRITICAL || level === ERROR_LEVELS.ERROR;
  }
});