import {
  Autowired,
  Controller,
  Req,
  Body,
  RequestMapping,
  Session,
  REQUEST_METHOD
} from "@orkis/core/common";
import { Request as ExpressRequest } from "@orkis/core/application";
import logger from "@orkis/core/utils";
import { ChatMessageService } from "../services/ChatMessageService";
import { SessionMessagesRequest } from "../types/common";
import { ResponseHelper } from "../utils/ResponseHelper";

@Controller({ path: "/chat" })
export class ChatStreamController {
  @Autowired("ChatMessageService")
  private chatMessageService!: ChatMessageService;
  // ChatLegacyController에서 이전된 세션 메시지 조회 API
  @RequestMapping({
    route: "/sessions/messages",
    method: REQUEST_METHOD.POST
  })
  async getSessionMessages(
    @Body() request: SessionMessagesRequest,
    @Session() session: any,
    @Req() req: ExpressRequest
  ): Promise<any> {
    try {
      // OrkisInterCeptor가 이미 인증을 처리했으므로 세션에서 userId만 추출
      const userId = session?.login_info?.ID;

      if (!userId) {
        // 이 경우는 인터셉터 설정 문제 (정상적으로는 발생하지 않아야 함)
        logger.error(
          "[ChatStreamController] 인터셉터를 통과했지만 userId가 없음"
        );
        req.res
          ?.status(401)
          .json(
            ResponseHelper.createErrorResponse("AUTH_ERROR", "인증 정보 오류")
          );
        return;
      }
      if (!request.sessionId) {
        req.res
          ?.status(400)
          .json(
            ResponseHelper.createErrorResponse(
              "INVALID_REQUEST",
              "sessionId가 필요합니다."
            )
          );
        return;
      }

      const result = await this.chatMessageService.getSessionMessages(request);

      // Pagination 정보 추가 (향후 실제 pagination 구현 필요)
      const responseData = {
        ...result,
        pagination: {
          page: request.page || 1,
          limit: request.limit || 100,
          total: result.messages.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      };

      req.res?.json(ResponseHelper.createSuccessResponse(responseData));
    } catch (error) {
      logger.error("메시지 목록 조회 오류:", error);
      req.res
        ?.status(500)
        .json(
          ResponseHelper.handleError(
            error,
            "MESSAGE_LIST_ERROR",
            "메시지 목록 조회 중 오류가 발생했습니다."
          )
        );
    }
  }

  /**
   * [v2.2 Phase 4.7] chatId 단위 cursor 페이지네이션 endpoint.
   * "지난 대화 더 보기" 기능 — 가장 최근 N개 chatId 의 메시지 반환,
   * cursor 지정 시 그 이전 chatId N개 추가 반환.
   */
  @RequestMapping({
    route: "/sessions/messages/page",
    method: REQUEST_METHOD.POST
  })
  async getSessionMessagesPage(
    @Body() request: { sessionId?: string; limit?: number; cursor?: string },
    @Session() session: any,
    @Req() req: ExpressRequest
  ): Promise<any> {
    try {
      const userId = session?.login_info?.ID;
      if (!userId) {
        req.res
          ?.status(401)
          .json(
            ResponseHelper.createErrorResponse("AUTH_ERROR", "인증 정보 오류")
          );
        return;
      }

      if (!request.sessionId) {
        req.res
          ?.status(400)
          .json(
            ResponseHelper.createErrorResponse(
              "INVALID_REQUEST",
              "sessionId가 필요합니다."
            )
          );
        return;
      }

      const limit =
        typeof request.limit === "number" && request.limit > 0
          ? Math.min(request.limit, 200) // 안전 상한
          : 30; // default

      const result = await this.chatMessageService.getSessionMessagesPage({
        sessionId: request.sessionId,
        limit,
        cursor: request.cursor
      });

      req.res?.json(ResponseHelper.createSuccessResponse(result));
    } catch (error) {
      logger.error("페이지네이션 메시지 조회 오류:", error);
      req.res
        ?.status(500)
        .json(
          ResponseHelper.handleError(
            error,
            "MESSAGE_PAGE_ERROR",
            "메시지 페이지 조회 중 오류가 발생했습니다."
          )
        );
    }
  }
}
