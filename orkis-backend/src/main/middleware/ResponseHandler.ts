import { Readable } from "stream";
import logger from "@orkis/core/utils";
import {
  IF_MODULE_TYPE,
  IF_POINT_CUT,
  Interceptor,
  INTERCEPTOR_OPTION
} from "@orkis/core/common";
import {
  BaseInterceptor,
  FileResponse,
  NextFunction,
  RedirectResponse,
  Request,
  Response
} from "@orkis/core/application";

// 임시 StandardResponse 타입 정의
interface StandardResponse {
  success: boolean;
  data?: any;
  message?: string;
  statusCode?: number;
  timestamp?: string;
  error?: any;
}

// 호출 및 사용여부: 사용됨
// 호출 위치: orkis-core의 ExpressApplication에서 @ExpressMiddleware 데코레이터를 통해 자동 등록
// 사용 위치: 모든 HTTP 요청의 응답 처리 시 자동 호출 (POINT_CUT: AFTER, PRIORITY: 1)
@Interceptor({
  MODULE_TYPE: IF_MODULE_TYPE.REQUEST,
  PATH: ["*"],
  USE: true,
  POINT_CUT: IF_POINT_CUT.AFTER,
  PRIORITY: 1
})
export class ResponseHandler extends BaseInterceptor {
  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-core의 ExpressApplication에서 모든 HTTP 요청 처리 후 자동 호출
  public async handle(req: Request, res: Response): Promise<void> {
    // 스트리밍 엔드포인트는 ResponseHandler에서 제외
    if (req.path === "/chat/stream") {
      return;
    }

    if (res.headersSent) {
      return;
    }

    const result = req.context.result;

    try {
      await this.handleResponse(res, result);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  }

  /**
   * 응답 처리 메인 로직
   */
  private async handleResponse(res: Response, result: any): Promise<void> {
    // !res.headersSent
    if (!result) {
      res.status(204).send();
      return;
    }

    if (this.isRedirectResponse(result)) {
      this.handleRedirect(res, result);
      return;
    }

    if (this.isFileResponse(result)) {
      await this.handleFile(res, result);
      return;
    }

    this.handleGeneral(res, result);
  }

  /**
   * 리다이렉트 응답 처리
   */
  private handleRedirect(res: Response, result: RedirectResponse): void {
    res.redirect(result.status || 302, result.url);
  }

  /**
   * 파일 응답 처리
   */
  private async handleFile(res: Response, result: FileResponse): Promise<void> {
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`
    );
    res.setHeader(
      "Content-Type",
      result.mimeType || "application/octet-stream"
    );

    if (Buffer.isBuffer(result.data)) {
      res.send(result.data);
    } else if (result.data instanceof Readable) {
      await this.handleFileStream(res, result.data, result);
    } else {
      throw new Error("Invalid file data type");
    }
  }

  /**
   * 파일 스트림 처리
   */
  private async handleFileStream(
    res: Response,
    stream: Readable,
    _file: FileResponse
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      stream.on("error", (err) => {
        logger.error("File stream error:", err);
        reject(err);
      });

      stream.on("end", () => {
        resolve();
      });

      stream.pipe(res);
    });
  }

  /**
   * 일반 응답 처리
   */
  private handleGeneral(res: Response, result: any): void {
    if (typeof result === "string") {
      res.type("text/plain").send(result);
      return;
    } else if (Buffer.isBuffer(result)) {
      res.type("application/octet-stream").send(result);
      return;
    } else if (typeof result === "object" && result !== null) {
      // 이미 StandardResponse 형태인지 확인
      if (this.isStandardResponse(result)) {
        // 이미 래핑되어 있으면 그대로 전송
        res.json(result);
        return;
      } else {
        // 래핑되지 않은 데이터는 StandardResponse로 래핑
        const response: StandardResponse = {
          success: true,
          data: result,
          timestamp: new Date().toISOString()
        };
        res.json(response);
        return;
      }
    } else {
      // boolean, number, null 등의 primitive 값들
      const response: StandardResponse = {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };
      res.json(response);
      return;
    }
  }

  /**
   * 에러 처리
   */
  private handleError(res: Response, error: Error): void {
    logger.error("Response handling error:", error);

    if (!res.headersSent) {
      const errorResponse: StandardResponse = {
        success: false,
        error: {
          code: "RESPONSE_ERROR",
          message:
            error.message || "Internal server error during response processing"
        },
        timestamp: new Date().toISOString()
      };
      res.status(500).json(errorResponse);
      return;
    }
  }

  /**
   * 리다이렉트 응답 타입 체크
   */
  private isRedirectResponse(result: any): result is RedirectResponse {
    return (
      result &&
      typeof result === "object" &&
      result !== null &&
      "type" in result &&
      result.type === "redirect"
    );
  }

  /**
   * 파일 응답 타입 체크
   */
  private isFileResponse(result: any): result is FileResponse {
    return (
      result &&
      typeof result === "object" &&
      result !== null &&
      "type" in result &&
      result.type === "file"
    );
  }

  /**
   * StandardResponse 형태인지 확인
   */
  private isStandardResponse(result: any): result is StandardResponse {
    return (
      result &&
      typeof result === "object" &&
      result !== null &&
      "success" in result &&
      typeof result.success === "boolean" &&
      ("data" in result || "error" in result)
    );
  }
}
