import { InjectConnection } from "@orkis/core/common";
import { RedisAdapter } from "@orkis/core/database";
import logger from "@orkis/core/utils";
import Redis from "ioredis";

export abstract class BaseRepository {
  //  Redis 읽기 전용 변환: AI 서버 키 패턴만 유지
  protected readonly AI_SERVER_REDIS_KEYS = {
    PROCESS_STATE: (chatId: string) => `${chatId}:proc`,
    CHAT_MESSAGES: (chatId: string, msgId: string) =>
      `${chatId}:chat_messages:${msgId}`,
    METADATA: (chatId: string) => `${chatId}:metadata`,
    CMD_TERMINATE: (chatId: string) => `${chatId}:cmd:terminate`
  };

  @InjectConnection("stageRedis", { type: "native" })
  private stageRedisClient!: Redis;

  //  Redis 읽기 전용: AI 서버 데이터만 읽기
  protected async getFromRedis(key: string): Promise<string | null> {
    try {
      // AI 서버 키 패턴 검증
      const aiServerPatterns = [
        /^[^:]+:proc$/,
        /^[^:]+:chat_messages:/,
        /^[^:]+:metadata$/,
        /^[^:]+:cmd:/
      ];

      const isAiServerKey = aiServerPatterns.some((pattern) =>
        pattern.test(key)
      );
      if (!isAiServerKey) {        return null;
      }

      return this.stageRedisClient.get(key);
    } catch (error) {
      logger.error(`[BaseRepository] Redis get error for key ${key}:`, error);
      return null;
    }
  }

  //  Redis 쓰기 메서드들 제거 - 읽기 전용으로 제한
  // setToRedis, deleteFromRedis 메서드 제거됨
}
