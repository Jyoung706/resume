/**
 * ORKIS Backend 표준 에러 응답 유틸리티
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
 * HTTP 상태 코드를 포함한 커스텀 에러 클래스
 */
export class OrkisError extends Error {
  public status: number;
  public code: string;
  public details?: any;

  constructor(
    message: string,
    status: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: any
  ) {
    super(message);
    this.name = 'OrkisError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * 에러 응답 생성 유틸리티 클래스
 */
export class ErrorResponseBuilder {
  
  /**
   * 표준 에러 응답 생성
   */
  static error(
    message: string,
    code?: string,
    path?: string,
    details?: any
  ): ErrorResponse {
    return {
      success: false,
      error: message,
      code,
      timestamp: new Date().toISOString(),
      path,
      details
    };
  }

  /**
   * 표준 성공 응답 생성
   */
  static success<T>(data: T, message?: string): SuccessResponse<T> {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      message
    };
  }

  /**
   * 검증 에러 응답
   */
  static validationError(message: string, details?: any): ErrorResponse {
    return this.error(message, 'VALIDATION_ERROR', undefined, details);
  }

  /**
   * 인증 에러 응답
   */
  static unauthorizedError(message: string = '인증이 필요합니다'): ErrorResponse {
    return this.error(message, 'UNAUTHORIZED');
  }

  /**
   * 권한 에러 응답
   */
  static forbiddenError(message: string = '접근 권한이 없습니다'): ErrorResponse {
    return this.error(message, 'FORBIDDEN');
  }

  /**
   * 리소스 없음 에러 응답
   */
  static notFoundError(message: string = '요청한 리소스를 찾을 수 없습니다'): ErrorResponse {
    return this.error(message, 'NOT_FOUND');
  }

  /**
   * 서버 내부 에러 응답
   */
  static internalError(message: string = '서버 내부 오류가 발생했습니다'): ErrorResponse {
    return this.error(message, 'INTERNAL_SERVER_ERROR');
  }

  /**
   * Redis 연결 에러 응답
   */
  static redisError(message: string = 'Redis 서버 연결 실패'): ErrorResponse {
    return this.error(message, 'REDIS_CONNECTION_ERROR');
  }

  /**
   * 데이터베이스 에러 응답
   */
  static databaseError(message: string = '데이터베이스 처리 중 오류가 발생했습니다'): ErrorResponse {
    return this.error(message, 'DATABASE_ERROR');
  }

  /**
   * 타임아웃 에러 응답
   */
  static timeoutError(message: string = '요청 처리 시간이 초과되었습니다'): ErrorResponse {
    return this.error(message, 'TIMEOUT');
  }
}

/**
 * 사전 정의된 에러 팩토리
 */
export const OrkisErrors = {
  // 400 Bad Request
  BadRequest: (message: string, details?: any) => 
    new OrkisError(message, 400, 'BAD_REQUEST', details),
    
  // 401 Unauthorized  
  Unauthorized: (message: string = '인증이 필요합니다') => 
    new OrkisError(message, 401, 'UNAUTHORIZED'),
    
  // 403 Forbidden
  Forbidden: (message: string = '접근 권한이 없습니다') => 
    new OrkisError(message, 403, 'FORBIDDEN'),
    
  // 404 Not Found
  NotFound: (message: string = '요청한 리소스를 찾을 수 없습니다') => 
    new OrkisError(message, 404, 'NOT_FOUND'),
    
  // 408 Timeout
  Timeout: (message: string = '요청 처리 시간이 초과되었습니다') => 
    new OrkisError(message, 408, 'TIMEOUT'),
    
  // 500 Internal Server Error
  InternalError: (message: string = '서버 내부 오류가 발생했습니다') => 
    new OrkisError(message, 500, 'INTERNAL_SERVER_ERROR'),
    
  // 503 Service Unavailable
  ServiceUnavailable: (message: string = '서비스를 사용할 수 없습니다') => 
    new OrkisError(message, 503, 'SERVICE_UNAVAILABLE')
};