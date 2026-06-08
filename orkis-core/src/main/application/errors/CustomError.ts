export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

/**
 * 기본 커스텀 에러 추상 클래스
 * 모든 커스텀 에러는 이 클래스를 상속받아야 함
 */
export abstract class CustomError extends Error {
  statusCode: number;
  errorCode?: string;
  logLevel?: "error" | "warn" | "info";
  details?: any;

  constructor(
    message?: string,
    statusCode?: number,
    errorCode?: string,
    details?: any
  ) {
    super(message);

    this.statusCode = statusCode ?? 400;
    this.errorCode = errorCode ?? this.constructor.name;
    this.logLevel = "error";
    this.message = message ?? "오류가 발생했습니다.";
    this.name = this.constructor.name;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}
