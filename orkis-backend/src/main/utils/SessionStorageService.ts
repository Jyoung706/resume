import { Component, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";

const KEY_PREFIX = "orkis:session:";

@Component("SessionStorageService")
export class SessionStorageService {
  // node-redis v4 클라이언트 (DatabaseType.NEW_REDIS)
  @InjectConnection("sessionRedis", { type: "native" })
  private redisClient!: any;

  /**
   * 데이터 저장 (TTL 지원)
   * node-redis v4 API 사용
   */
  async saveData(key: string, data: any, ttlSeconds?: number): Promise<void> {
    try {
      const fullKey = KEY_PREFIX + key;
      const jsonData = JSON.stringify(data);

      if (ttlSeconds && ttlSeconds > 0) {
        // node-redis v4: set with EX option
        await this.redisClient.set(fullKey, jsonData, { EX: ttlSeconds });
      } else {
        await this.redisClient.set(fullKey, jsonData);
      }
    } catch (error) {
      logger.error(`[SessionStorage] saveData 오류 (key: ${key}):`, error);
      throw error;
    }
  }

  /**
   * 데이터 조회
   */
  async readData(key: string): Promise<any | null> {
    try {
      const fullKey = KEY_PREFIX + key;
      const raw = await this.redisClient.get(fullKey);

      if (!raw) {
        return null;
      }

      return JSON.parse(raw);
    } catch (error) {
      logger.error(`[SessionStorage] readData 오류 (key: ${key}):`, error);
      return null;
    }
  }

  /**
   * 데이터 삭제
   */
  async deleteData(key: string): Promise<boolean> {
    try {
      const fullKey = KEY_PREFIX + key;
      const result = await this.redisClient.del(fullKey);
      return result > 0;
    } catch (error) {
      logger.error(`[SessionStorage] deleteData 오류 (key: ${key}):`, error);
      return false;
    }
  }

  /**
   * 키 존재 여부 확인
   */
  async exists(key: string): Promise<boolean> {
    try {
      const fullKey = KEY_PREFIX + key;
      const result = await this.redisClient.exists(fullKey);
      return result > 0;
    } catch (error) {
      logger.error(`[SessionStorage] exists 오류 (key: ${key}):`, error);
      return false;
    }
  }
}
