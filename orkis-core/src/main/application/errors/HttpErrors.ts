import { CustomError } from "./CustomError";

export class BadRequestError extends CustomError {
  constructor(message: string = "잘못된 요청입니다.", details?: any) {
    super(message, 400, "BAD_REQUEST", details);
  }
}

export class ValidationError extends CustomError {
  constructor(message: string = "유효성 검사에 실패했습니다.", details?: any) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class UnauthorizedError extends CustomError {
  constructor(message: string = "인증이 필요합니다.", details?: any) {
    super(message, 401, "UNAUTHORIZED", details);
  }
}

export class ForbiddenError extends CustomError {
  constructor(message: string = "접근 권한이 없습니다.", details?: any) {
    super(message, 403, "FORBIDDEN", details);
  }
}

export class NotFoundError extends CustomError {
  constructor(
    message: string = "요청한 리소스를 찾을 수 없습니다.",
    details?: any
  ) {
    super(message, 404, "NOT_FOUND", details);
  }
}

export class RequestTimeoutError extends CustomError {
  constructor(message: string = "요청 시간이 초과되었습니다.", details?: any) {
    super(message, 408, "REQUEST_TIMEOUT", details);
  }
}

export class ConflictError extends CustomError {
  constructor(message: string = "리소스 충돌이 발생했습니다.", details?: any) {
    super(message, 409, "CONFLICT", details);
  }
}

export class TooManyRequestsError extends CustomError {
  constructor(
    message: string = "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
    details?: any
  ) {
    super(message, 429, "TOO_MANY_REQUESTS", details);
  }
}

export class InternalServerError extends CustomError {
  constructor(
    message: string = "서버 내부 오류가 발생했습니다.",
    details?: any
  ) {
    super(message, 500, "INTERNAL_SERVER_ERROR", details);
  }
}
