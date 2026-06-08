import {
  Autowired,
  Controller,
  Req,
  Body,
  RequestMapping,
  Param,
  Session,
  REQUEST_METHOD
} from "@orkis/core/common";
import { Request } from "@orkis/core/application";
import logger from "@orkis/core/utils";
import * as fs from "fs";
import { SendMessageRequest } from "@orkis-interface/backend/chat";
import * as path from "path";
import { ChatMessageService } from "../services/ChatMessageService";
import { SendMessageApiResponse } from "../types/common";
import { ResponseHelper } from "../utils/ResponseHelper";

@Controller({ path: "/chat/messages" })
export class ChatMessageController {
  @Autowired("ChatMessageService")
  private chatMessageService!: ChatMessageService;
  @RequestMapping({
    route: "/",
    method: REQUEST_METHOD.POST
  })
  async sendMessage(
    @Body() request: SendMessageRequest,
    @Session() session: any,
    @Req() req: Request
  ): Promise<SendMessageApiResponse> {
    try {
      const userId = session?.login_info?.ID;

      if (!userId) {
        return ResponseHelper.createErrorResponse(
          "AUTH_REQUIRED",
          "인증이 필요합니다."
        );
      }

      if (!request.sessionId || !request.message) {
        return ResponseHelper.createErrorResponse(
          "INVALID_REQUEST",
          "sessionId와 message가 필요합니다."
        );
      }

      const abortController = new AbortController();

      req.on("close", () => {        abortController.abort();
      });

      const result = await this.chatMessageService.sendMessage(
        userId,
        request,
        abortController.signal
      );

      return ResponseHelper.createSuccessResponse(result);
    } catch (error) {
      logger.error("메시지 전송 오류:", error);
      return ResponseHelper.handleError(
        error,
        "MESSAGE_SEND_ERROR",
        "메시지 전송 중 오류가 발생했습니다."
      );
    }
  }

  // getSessionMessages는 ChatLegacyController에서 처리
  /**
   * 세션의 날짜별 메시지 파일 목록 조회
   */
  @RequestMapping({
    route: "/dates/:sessionId",
    method: REQUEST_METHOD.GET
  })
  async getMessageDates(
    @Param("sessionId") sessionId: string,
    @Session() session: any
  ): Promise<any> {
    try {
      const userId = session?.login_info?.ID;

      if (!userId) {
        return ResponseHelper.createErrorResponse(
          "AUTH_REQUIRED",
          "인증이 필요합니다."
        );
      }

      // share/jobs 폴더에서 세션별 파일 찾기
      const jobsPath = path.join(process.cwd(), "..", "share", "jobs");
      const sessionFolder = path.join(jobsPath, sessionId);

      if (!fs.existsSync(sessionFolder)) {
        return ResponseHelper.createSuccessResponse({
          dates: [],
          hasMoreDates: false
        });
      }

      // 날짜 패턴으로 파일 찾기 (YYYY-MM-DD.json)
      const files = fs
        .readdirSync(sessionFolder)
        .filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file))
        .map((file) => file.replace(".json", ""))
        .sort((a, b) => b.localeCompare(a)); // 최신 날짜 먼저

      return ResponseHelper.createSuccessResponse({
        dates: files,
        hasMoreDates: files.length > 1,
        latestDate: files[0] || null
      });
    } catch (error) {
      logger.error("날짜 목록 조회 오류:", error);
      return ResponseHelper.handleError(
        error,
        "DATE_LIST_ERROR",
        "날짜 목록 조회 중 오류가 발생했습니다."
      );
    }
  }
  /**
   * 특정 날짜의 메시지 조회
   */
  @RequestMapping({
    route: "/date/:sessionId/:date",
    method: REQUEST_METHOD.GET
  })
  async getMessagesByDate(
    @Param("sessionId") sessionId: string,
    @Param("date") date: string,
    @Session() session: any
  ): Promise<any> {
    try {
      const userId = session?.login_info?.ID;

      if (!userId) {
        return ResponseHelper.createErrorResponse(
          "AUTH_REQUIRED",
          "인증이 필요합니다."
        );
      }

      // 날짜 형식 검증
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return ResponseHelper.createErrorResponse(
          "INVALID_DATE",
          "올바른 날짜 형식이 아닙니다 (YYYY-MM-DD)."
        );
      }

      // share/jobs 폴더에서 세션별 파일 읽기
      const jobsPath = path.join(process.cwd(), "..", "share", "jobs");
      const messageFile = path.join(jobsPath, sessionId, `${date}.json`);

      if (!fs.existsSync(messageFile)) {
        return ResponseHelper.createSuccessResponse({
          messages: [],
          date: date
        });
      }

      // 파일 읽기
      const fileContent = fs.readFileSync(messageFile, "utf-8");
      const messages = JSON.parse(fileContent);

      return ResponseHelper.createSuccessResponse({
        messages: messages,
        date: date,
        totalCount: messages.length
      });
    } catch (error) {
      logger.error("날짜별 메시지 조회 오류:", error);
      return ResponseHelper.handleError(
        error,
        "MESSAGE_LOAD_ERROR",
        "메시지 조회 중 오류가 발생했습니다."
      );
    }
  }
}
