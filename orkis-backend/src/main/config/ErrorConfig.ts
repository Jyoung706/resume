import logger from "@orkis/core/utils";
import { ErrorResponse } from "@orkis/core/application";
import { Request, Response } from "express";
import { OrkisError } from "@/error/OrkisError";
import { ChatError } from "@/error/ChatError";

/**
 * 백엔드 전용 에러 처리 설정
 * Core의 ErrorHandlerMiddleware를 설정하여 커스텀 에러 처리 로직 추가
 */
export class ErrorConfig {
  /**
   * 에러 핸들러 초기화
   */
  public static initialize(): void {
    const config = {
      includeStackTrace: process.env.NODE_ENV === "development",
      logErrors: true,
      customErrorHandler: ErrorConfig.customErrorHandler
    };

    // ErrorHandlerInterceptor.configure(config);
  }

  /**
   * 커스텀 에러 핸들러
   * 백엔드 전용 에러들에 대한 특별한 처리
   */
  private static customErrorHandler(
    error: any,
    req: Request,
    res: Response
  ): ErrorResponse | null {
    const clientIp = req.ip || req.headers["x-forwarded-for"] || "unknown";

    // OrkisError 처리 - 보안을 위해 일반적인 메시지로 변경
    if (error instanceof OrkisError) {
      // 서버 로그에는 상세 정보 기록
      logger.error(`[OrkisError] IP: ${clientIp}, 에러: ${error.message}`);

      // 사용자에게는 일반적인 메시지만 전송
      return {
        success: false,
        error: {
          code: "AUTH_ERROR",
          message: "로그인 정보가 일치하지 않습니다."
        },
        timestamp: new Date().toISOString()
      };
    }

    // ChatError 처리
    if (error instanceof ChatError) {
      logger.error(`[ChatError] IP: ${clientIp}, 에러: ${error.message}`);

      return {
        success: false,
        error: {
          code: error.errorType || "CHAT_ERROR",
          message: error.message
        },
        timestamp: new Date().toISOString()
      };
    }

    // 기타 에러는 Core의 기본 처리에 맡김
    return null;
  }
}
