import logger from "@orkis/core/utils";
import { BaseInterceptor, Request, Response } from "@orkis/core/application";
import {
  IF_MODULE_TYPE,
  IF_POINT_CUT,
  Interceptor,
  INTERCEPTOR_OPTION
} from "@orkis/core/common";
import { OrkisError } from "@/error/OrkisError";
import { ChatError } from "@/error/ChatError";
import { ValidationError } from "@/error/ValidationError";

/**
 * ORKIS Backend 전역 에러 핸들러
 * 모든 미처리 에러를 캐치하여 일관된 응답 형식으로 반환
 *
 * EXCEPTION 인터셉터로 동작하며, 에러 발생 시 자동 호출됨
 */
@Interceptor({
  MODULE_TYPE: IF_MODULE_TYPE.REQUEST,
  PATH: ["/*"],
  USE: true,
  POINT_CUT: IF_POINT_CUT.EXCEPTION,
  PRIORITY: 1
})
export class GlobalErrorHandler extends BaseInterceptor {
  public option?: INTERCEPTOR_OPTION;

  async handle(req: Request, res: Response, error?: any): Promise<void> {
    if (!error || res.headersSent) {
      return;
    }

    const clientIp = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const errorName = error?.name || error?.constructor?.name || "";

    // ValidationError 처리 - 사용자에게 표시 가능한 메시지를 그대로 전달
    // instanceof 대신 name 체크 (모듈 로딩 경로 문제 방지)
    if (error instanceof ValidationError || errorName === "ValidationError") {      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: error.message
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // ChatError 처리
    if (error instanceof ChatError || errorName === "ChatError") {
      logger.error(`[ChatError] IP: ${clientIp}, 에러: ${error.message}`);
      res.status(error.statusCode || 400).json({
        success: false,
        error: {
          code: error.errorType || "CHAT_ERROR",
          message: error.message
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // OrkisError 처리 - 보안을 위해 일반적인 메시지로 변경
    // 가장 마지막에 체크 (ValidationError, ChatError보다 우선순위 낮음)
    if (error instanceof OrkisError || errorName === "OrkisError") {
      logger.error(`[OrkisError] IP: ${clientIp}, 에러: ${error.message}`);
      res.status(401).json({
        success: false,
        error: {
          code: "AUTH_ERROR",
          message: "로그인 정보가 일치하지 않습니다."
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 기타 에러 로깅
    logger.error("[GlobalErrorHandler] 에러:", {
      url: req.url,
      method: req.method,
      ip: clientIp,
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // 에러 타입별 응답 구성
    const errorResponse = this.buildErrorResponse(error);

    res.status(errorResponse.status).json({
      success: false,
      error: {
        code: errorResponse.code,
        message: errorResponse.message
      },
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }

  private buildErrorResponse(error: any): {
    status: number;
    message: string;
    code: string;
  } {
    // CustomError 처리 (statusCode 속성)
    if (error.statusCode && error.message) {
      return {
        status: error.statusCode,
        message: error.message,
        code: error.errorCode || error.code || "CUSTOM_ERROR"
      };
    }

    // HTTP 상태 코드가 있는 에러 (하위 호환성)
    if (error.status && error.message) {
      return {
        status: error.status,
        message: error.message,
        code: error.code || "CUSTOM_ERROR"
      };
    }

    // ValidationError
    if (error.name === "ValidationError") {
      return {
        status: 400,
        message: "입력값 검증 실패",
        code: "VALIDATION_ERROR"
      };
    }

    // 인증 에러
    if (
      error.name === "UnauthorizedError" ||
      error.message?.includes("unauthorized")
    ) {
      return {
        status: 401,
        message: "인증이 필요합니다",
        code: "UNAUTHORIZED"
      };
    }

    // 권한 에러
    if (
      error.name === "ForbiddenError" ||
      error.message?.includes("forbidden")
    ) {
      return {
        status: 403,
        message: "접근 권한이 없습니다",
        code: "FORBIDDEN"
      };
    }

    // NotFound 에러
    if (
      error.name === "NotFoundError" ||
      error.message?.includes("not found")
    ) {
      return {
        status: 404,
        message: "요청한 리소스를 찾을 수 없습니다",
        code: "NOT_FOUND"
      };
    }

    // 타임아웃 에러
    if (error.code === "ETIMEDOUT" || error.message?.includes("timeout")) {
      return {
        status: 408,
        message: "요청 처리 시간이 초과되었습니다",
        code: "TIMEOUT"
      };
    }

    // Redis 연결 에러
    if (
      error.message?.includes("Redis") ||
      error.message?.includes("ECONNREFUSED")
    ) {
      return {
        status: 503,
        message: "서버 연결 실패",
        code: "CONNECTION_ERROR"
      };
    }

    // 데이터베이스 에러
    // dev 환경에서는 원본 message 를 통과시켜 SQLite 문법 오류·LIMIT 래핑 결함 같은
    // SQL 실행 단계 결함을 디버깅 가능하게 한다.
    // production 또는 NODE_ENV 미설정·오타 시에는 일반화된 메시지로 응답하여
    // 내부 구조(DB 경로·테이블명)·운영 환경 정보 노출을 막는다 (fail-safe default).
    // dev.env 는 NODE_ENV=dev, 일부 코드베이스 영역은 "development" 비교를 쓰므로
    // 두 값 모두 dev 로 인식.
    if (
      error.message?.includes("database") ||
      error.message?.includes("SQLITE")
    ) {
      const env = process.env.NODE_ENV;
      const isDev = env === "dev" || env === "development";
      return {
        status: 500,
        message: isDev
          ? error.message
          : "데이터베이스 처리 중 오류가 발생했습니다",
        code: "DATABASE_ERROR"
      };
    }

    // 파일 시스템 에러
    if (error.code === "ENOENT" || error.code === "EACCES") {
      return {
        status: 500,
        message: "파일 시스템 접근 오류",
        code: "FILE_SYSTEM_ERROR"
      };
    }

    // 기본 서버 에러
    return {
      status: 500,
      message: "서버 내부 오류가 발생했습니다",
      code: "INTERNAL_SERVER_ERROR"
    };
  }
}
