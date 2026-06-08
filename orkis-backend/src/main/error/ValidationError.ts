import { CustomError, ERROR_RESPONSE } from "@orkis/core/application";

/**
 * 유효성 검증 에러
 * 400 상태 코드와 적절한 로그 레벨을 가진 커스텀 에러
 */
export class ValidationError extends CustomError {
  constructor(
    message: string = "입력값 검증에 실패했습니다.",
    details?: ERROR_RESPONSE
  ) {
    super(message, 400, "VALIDATION_ERROR");
    this.logLevel = "warn";
    if (details) {
      this.details = details;
    }
  }
}
