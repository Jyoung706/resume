import { ChatError } from "../../error/ChatError";
import { ApiResponse } from "../types/common";

export class ResponseHelper {
  static createSuccessResponse<T>(result: T): ApiResponse<T> {
    return {
      success: true,
      data: result,
      timestamp: new Date()
    };
  }

  static createErrorResponse(code: string, message: string): ApiResponse {
    return {
      success: false,
      error: `${code}: ${message}`,
      timestamp: new Date()
    };
  }

  static handleError(
    error: unknown,
    defaultCode: string,
    defaultMessage: string
  ): ApiResponse {
    if (error instanceof ChatError) {
      return ResponseHelper.createErrorResponse(
        error.errorType || defaultCode,
        error.message
      );
    } else if (error instanceof Error) {
      return ResponseHelper.createErrorResponse(
        defaultCode,
        error.message || defaultMessage
      );
    } else {
      return ResponseHelper.createErrorResponse(defaultCode, defaultMessage);
    }
  }
}