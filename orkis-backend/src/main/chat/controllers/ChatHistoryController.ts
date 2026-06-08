import {
  Autowired,
  Controller,
  Req,
  Res,
  RequestMapping,
  Param,
  Body,
  Session,
  REQUEST_METHOD
} from "@orkis/core/common";
import logger from "@orkis/core/utils";
import type { GetChatHistoryRequest } from "@orkis-interface/backend/chat";
import { ChatHistoryService } from "../services/ChatHistoryService";

/**
 * 채팅 이력 조회 컨트롤러
 * share/summary 폴더의 JSON 파일 기반 이력 조회
 */
@Controller({ path: "/chat/history" })
export class ChatHistoryController {
  @Autowired("ChatHistoryService")
  private chatHistoryService!: ChatHistoryService;

  /**
   * 채팅 이력 조회
   * GET /chat/history/:sessionId
   * Query Parameters: page, limit, startDate, endDate
   */
  @RequestMapping({
    route: "/:sessionId",
    method: REQUEST_METHOD.GET
  })
  async getChatHistory(
    @Param("sessionId") sessionId: string,
    @Req() req: any,
    @Session() session: any,
    @Res() res: any
  ) {
    try {
      const { page, limit, startDate, endDate } = req.query;

      // 세션에서 userId 추출
      const userId = session?.login_info?.ID || "";

      const request: GetChatHistoryRequest = {
        sessionId,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        startDate: startDate as string,
        endDate: endDate as string
      };

      const result = await this.chatHistoryService.getChatHistory(
        userId,
        request
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error(`[ChatHistoryController] 채팅 이력 조회 실패`, error);
      res.status(500).json({
        success: false,
        error: {
          code: "CHAT_HISTORY_FETCH_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "채팅 이력 조회에 실패했습니다."
        }
      });
    }
  }

  /**
   * POST 방식 채팅 이력 조회 (복잡한 필터링 지원)
   * POST /chat/history/search
   * Body: GetChatHistoryRequest
   */
  @RequestMapping({
    route: "/search",
    method: REQUEST_METHOD.POST
  })
  async searchChatHistory(
    @Body() body: GetChatHistoryRequest,
    @Session() session: any,
    @Res() res: any
  ) {
    try {
      const request: GetChatHistoryRequest = body;

      // 세션에서 userId 추출
      const userId = session?.login_info?.ID || "";

      const result = await this.chatHistoryService.getChatHistory(
        userId,
        request
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error(`[ChatHistoryController] 채팅 이력 검색 실패`, error);
      res.status(500).json({
        success: false,
        error: {
          code: "CHAT_HISTORY_SEARCH_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "채팅 이력 검색에 실패했습니다."
        }
      });
    }
  }

  /**
   * 특정 메시지 상세 조회
   * GET /chat/history/:sessionId/messages/:messageId
   * Query Parameters: dateFolder (optional, YYMMDD format)
   */
  @RequestMapping({
    route: "/:sessionId/messages/:messageId",
    method: REQUEST_METHOD.GET
  })
  async getMessageDetail(
    @Param("sessionId") sessionId: string,
    @Param("messageId") messageId: string,
    @Req() req: any,
    @Session() session: any,
    @Res() res: any
  ) {
    try {
      const { dateFolder } = req.query;

      // 세션에서 userId 추출
      const userId = session?.login_info?.ID || "";

      const result = await this.chatHistoryService.getMessageDetail(
        userId,
        sessionId,
        messageId,
        dateFolder as string
      );

      if (!result) {
        return res.status(404).json({
          success: false,
          error: {
            code: "MESSAGE_NOT_FOUND",
            message: "메시지를 찾을 수 없습니다."
          }
        });
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error(`[ChatHistoryController] 메시지 상세 조회 실패`, error);
      res.status(500).json({
        success: false,
        error: {
          code: "MESSAGE_DETAIL_FETCH_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "메시지 상세 조회에 실패했습니다."
        }
      });
    }
  }
}
