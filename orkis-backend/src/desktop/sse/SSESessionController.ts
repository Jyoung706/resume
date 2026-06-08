/**
 * SSESessionController (Desktop)
 * - cloud src/main/sse/controllers/SSESessionController 와 동일 라우트/이벤트 계약.
 *   (cloud 갈래는 chatRedis/stageRedis 의존이라 tsconfig exclude — 본 컨트롤러가 동명 대체)
 * - ChatStreamService 가 AI SSE 구독 + 비즈니스 로직(영속화/제목/SQL) + frontend forward 담당.
 */

import {
  Controller,
  Autowired,
  RequestMapping,
  Param,
  Body,
  Session,
  Sse,
  REQUEST_METHOD,
  FILTER_TYPES,
  REQUEST_TYPE
} from "@orkis/core/common";
import logger, { SSEStream } from "@orkis/core/utils";
import { ChatStreamService } from "../chat/ChatStreamService";

@Controller({ path: "/sse/chat" })
export class SSESessionController {
  @Autowired("ChatStreamService")
  private streamService!: ChatStreamService;

  /**
   * Fetch Streaming 엔드포인트 (메시지 전송 + 스트리밍 응답)
   * POST /api/sse/chat/stream
   */
  @RequestMapping({
    route: "/stream",
    method: REQUEST_METHOD.POST,
    filteredType: FILTER_TYPES.CHECK_SESSION,
    requestType: REQUEST_TYPE.SSE
  })
  async streamMessage(
    @Sse sse: SSEStream,
    @Body() body: Record<string, unknown>,
    @Session() session: any
  ): Promise<void> {
    const userId = session?.login_info?.ID;
    const chatId = String(body?.chatId || "");

    if (!userId) {
      sse.send({
        event: "error",
        data: JSON.stringify({
          code: "UNAUTHORIZED",
          message: "로그인이 필요합니다"
        })
      });
      return;
    }
    if (!chatId) {
      sse.send({
        event: "error",
        data: JSON.stringify({
          code: "INVALID_CHAT_ID",
          message: "chatId가 필요합니다"
        })
      });
      return;
    }

    try {
      await this.streamService.streamChat(body, sse, userId);
    } catch (error) {
      logger.error(`[SSESessionController] stream 실패 - ${chatId}`, error);
      sse.send({
        event: "error",
        data: JSON.stringify({
          code: "STREAM_ERROR",
          message: (error as Error).message
        })
      });
    }
  }

  /**
   * Fetch Streaming 취소 (HTTP POST)
   * POST /api/sse/chat/stream/:chatId/cancel
   */
  @RequestMapping({
    route: "/stream/:chatId/cancel",
    method: REQUEST_METHOD.POST,
    filteredType: FILTER_TYPES.CHECK_SESSION
  })
  async cancelStreamMessage(
    @Param("chatId") chatId: string,
    @Session() session: any
  ): Promise<any> {
    const userId = session?.login_info?.ID;
    if (!userId) {
      return { chatId, status: "not_found", message: "로그인이 필요합니다" };
    }

    try {
      await this.streamService.cancelChat(chatId);
      return { chatId, status: "cancelled" };
    } catch (error) {
      logger.error(`[SSESessionController] cancel 실패 - ${chatId}`, error);
      return {
        chatId,
        status: "not_found",
        message: (error as Error).message
      };
    }
  }
}
