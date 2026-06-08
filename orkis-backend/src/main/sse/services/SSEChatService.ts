/**
 * SSEChatService
 * - 채팅 비즈니스 로직
 * - 세션 소유권 검증
 * - 메시지 처리 시작
 * - SSE는 :stream 키만 사용 (proc 키는 WebSocket 전용)
 */

import { Service, Autowired, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import Redis from "ioredis";
import { SendMessageRequest, RedisKeys, ProcessMessageResult } from "../types/sse.types";
import { ChatAIServerService } from "../../chat/services/ChatAIServerService";
import { ChatSessionService } from "../../chat/services/ChatSessionService";

@Service()
export class SSEChatService {
  @InjectConnection("chatRedis", { type: "native" })
  private chatRedis!: Redis;

  @Autowired("ChatAIServerService")
  private chatAIServerService!: ChatAIServerService;

  @Autowired("ChatSessionService")
  private chatSessionService!: ChatSessionService;

  /**
   * 세션 소유권 검증
   */
  async validateSessionOwnership(
    sessionId: string,
    userId: string
  ): Promise<boolean> {
    try {
      // Redis에서 세션 정보 조회
      const sessionData = await this.chatRedis.hget(
        `session:${sessionId}`,
        "userId"
      );

      if (!sessionData) {
        // 세션이 Redis에 없으면 DB에서 확인 (추후 구현)
        return true; // 임시: 세션이 없으면 허용
      }

      return sessionData === userId;
    } catch (error) {
      logger.error(
        `[SSEChatService] 세션 소유권 검증 에러:`,
        error
      );
      return false;
    }
  }

  /**
   * 메시지 처리 시작
   * - ChatAIServerService를 통해 AI 서버 호출
   * - Frontend에서 생성한 chatId를 그대로 사용
   * - SSE는 :stream 키만 사용 (proc 키는 WebSocket 전용)
   * - Redis 폴링은 SessionStreamManager가 담당
   *
   * NOTE: chatId 변환 로직 제거됨 - Frontend에서 UUID v7 기반 chatId 생성
   */
  async processMessage(
    userId: string,
    request: SendMessageRequest
  ): Promise<ProcessMessageResult> {
    const {
      sessionId,
      chatId,  // Frontend에서 생성한 UUID v7 기반 ID
      content,
      keywords,
      dbId,
      schemaContext,
      modelId,
      apiKey
    } = request;

    try {
      // 1. 세션 존재 확인 (없으면 자동 생성)
      await this.chatSessionService.ensureSessionExists(sessionId, userId);

      // 2. ChatAIServerService를 통해 AI 서버 호출 (Frontend chatId 전달)
      const result = await this.chatAIServerService.sendMessageAndGetChatId(
        userId,
        {
          sessionId,
          chatId,  // Frontend에서 생성한 chatId 전달
          message: content,
          modelId,
          keywords,
          selectedSchema: schemaContext,
          dbId: dbId,
          apiKey
        }
      );

      const { title } = result;

      // NOTE: chatId 변환 로직 제거됨
      // Frontend에서 생성한 chatId를 그대로 사용
      // AI 서버도 동일한 chatId로 Redis 키 생성

      // SSE는 :stream 키만 사용 (proc 키는 WebSocket 전용)
      // AI 서버가 chatId:stream 키에 s, id, stat, m, r 필드를 씀
      // SessionStreamManager가 :stream 키를 폴링하여 프론트엔드에 전달

      return { chatId, title };
    } catch (error) {
      logger.error(
        `[SSEChatService] 메시지 처리 시작 에러:`,
        error
      );
      throw error;
    }
  }

  /**
   * 메시지 스트림 정리
   * SSE는 :stream 키만 사용
   */
  async cleanupMessageStream(chatId: string): Promise<void> {
    try {
      const streamKey = RedisKeys.chatStream(chatId);

      // :stream 키 삭제 (TTL로 자동 삭제되므로 선택적)
      // await this.chatRedis.del(streamKey);
    } catch (error) {
      logger.error(
        `[SSEChatService] 메시지 스트림 정리 에러:`,
        error
      );
    }
  }

  /**
   * 세션의 모든 메시지 정리
   */
  async cleanupSessionMessages(sessionId: string): Promise<void> {
    try {
      // 세션에 연결된 모든 메시지 ID 조회 (추후 구현)
    } catch (error) {
      logger.error(
        `[SSEChatService] 세션 메시지 정리 에러:`,
        error
      );
    }
  }

  /**
   * 메시지 취소 요청
   * SSE에서는 SessionStreamManager의 cancelMessageStream을 통해 처리
   * AI 서버로 취소 요청을 보내 ai_end(1_2) 상태가 기록되도록 함
   */
  async cancelMessage(chatId: string): Promise<boolean> {
    try {
      // AI 서버로 취소 요청 (chatId = chatId)
      // 이 요청으로 AI 서버가 1_2 (ai_end) 상태를 기록하여
      // orkis-jobs가 파일 저장 조건을 충족할 수 있음
      await this.chatAIServerService.cancelRagServerProcessSync(chatId);
      return true;
    } catch (error) {
      logger.error(
        `[SSEChatService] AI 서버 취소 요청 실패:`,
        error
      );
      // AI 서버 취소 실패해도 클라이언트 측 취소는 진행
      return true;
    }
  }
}
