import { CustomError, ERROR_RESPONSE } from "@orkis/core/application";

/**
 * Orkis 인증 관련 에러
 * 401 상태 코드와 적절한 로그 레벨을 가진 커스텀 에러
 */
export class OrkisError extends CustomError {
  constructor(
    message: string = "로그인 정보가 일치하지 않습니다.",
    details?: ERROR_RESPONSE
  ) {
    super(message, 401, "ORKIS_AUTH_ERROR");
    this.logLevel = "warn";
    if (details) {
      this.details = details;
    }
  }
}

// 하위 호환성을 위한 alias
export const TtsError = OrkisError;
