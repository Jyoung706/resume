/**
 * SSESessionController
 * - Fetch Streaming 엔드포인트 (/stream)
 * - 메시지 전송/취소 HTTP API
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
import { SSEChatService } from "../services/SSEChatService";
import { FetchStreamService } from "../services/FetchStreamService";
import {
  SendMessageRequest,
  CancelMessageResponse
} from "../types/sse.types";

@Controller({ path: "/sse/chat" })
export class SSESessionController {
  @Autowired("SSEChatService")
  private chatService!: SSEChatService;

  @Autowired("FetchStreamService")
  private fetchStreamService!: FetchStreamService;

  /**
   * Fetch Streaming 엔드포인트 (메시지 전송 + 스트리밍 응답)
   * POST /api/sse/chat/stream
   *
   * EventSource 없이 단일 HTTP 요청으로 메시지 전송 및 스트리밍 응답 처리
   * - 메시지 전송과 스트리밍이 하나의 연결에서 처리됨
   * - 프론트엔드에서 fetch + ReadableStream으로 처리
   */
  @RequestMapping({
    route: "/stream",
    method: REQUEST_METHOD.POST,
    filteredType: FILTER_TYPES.CHECK_SESSION,
    requestType: REQUEST_TYPE.SSE
  })
  async streamMessage(
    @Sse sse: SSEStream,
    @Body() body: SendMessageRequest,
    @Session() session: any
  ): Promise<void> {
    const userId = session?.login_info?.ID;
    const { sessionId, chatId } = body;

    if (!userId) {      sse.send({
        event: "error",
        data: JSON.stringify({
          code: "UNAUTHORIZED",
          message: "로그인이 필요합니다"
        })
      });
      return;
    }    try {
      // 세션 소유권 검증
      const isOwner = await this.chatService.validateSessionOwnership(
        sessionId,
        userId
      );

      if (!isOwner) {        sse.send({
          event: "error",
          data: JSON.stringify({
            code: "UNAUTHORIZED",
            message: "세션 접근 권한이 없습니다"
          })
        });
        return;
      }

      // FetchStreamService를 통해 메시지 처리 및 스트리밍
      await this.fetchStreamService.processAndStream(userId, body, sse);    } catch (error) {
      logger.error(
        `[SSESessionController] Fetch Stream 에러:`,
        error
      );
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
   *
   * Fetch Streaming 방식에서 사용하는 취소 엔드포인트
   */
  @RequestMapping({
    route: "/stream/:chatId/cancel",
    method: REQUEST_METHOD.POST,
    filteredType: FILTER_TYPES.CHECK_SESSION
  })
  async cancelStreamMessage(
    @Param("chatId") chatId: string,
    @Session() session: any
  ): Promise<CancelMessageResponse> {
    const userId = session?.login_info?.ID;

    if (!userId) {
      return {
        chatId,
        status: "not_found",
        message: "로그인이 필요합니다"
      };
    }    try {
      // FetchStreamService에서 스트림 취소
      const cancelled = await this.fetchStreamService.cancelStream(chatId);

      if (!cancelled) {      }

      // AI 서버로 취소 요청
      await this.chatService.cancelMessage(chatId);

      // Redis 스트림 정리
      await this.chatService.cleanupMessageStream(chatId);      return {
        chatId,
        status: "cancelled"
      };
    } catch (error) {
      logger.error(
        `[SSESessionController] Fetch Stream 취소 에러:`,
        error
      );
      return {
        chatId,
        status: "not_found",
        message: (error as Error).message
      };
    }
  }
}
