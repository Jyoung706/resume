import { Service, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import Redis from "ioredis";

@Service()
export class RedisService {
  @InjectConnection("chatRedis", { type: "native" })
  private chatRedis!: Redis;

  @InjectConnection("stageRedis", { type: "native" })
  private stageRedis!: Redis;

  /**
   * SCAN으로 키 목록 조회
   */
  async scanKeys(pattern: string, count: number = 1000): Promise<string[]> {
    const keys: string[] = [];
    let cursor = "0";

    do {
      try {
        const result = await this.chatRedis.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          count
        );
        cursor = result[0];
        keys.push(...result[1]);

        // CPU 시간 양보
        if (keys.length % (count * 5) === 0) {
          await new Promise((resolve) => setImmediate(resolve));
        }
      } catch (error) {
        logger.error(`키 스캔 중 오류 (pattern: ${pattern})`, error);
        break;
      }
    } while (cursor !== "0");

    return keys;
  }

  /**
   * 세션 상태 데이터 조회
   */
  async getSessionStat(chatId: string): Promise<any> {
    return await this.chatRedis.hgetall(`${chatId}:stat`);
  }

  /**
   * 세션 프로세스 데이터 조회 (실제 backend 패턴: Main Redis proc 키)
   */
  async getSessionProc(chatId: string): Promise<any> {
    logger.info(`proc 데이터 조회 시작: ${chatId}`);

    try {
      // 실제 backend 패턴: Main Redis의 {chatId}:proc (Hash 타입)
      const procKey = `${chatId}:proc`;
      logger.debug(`proc 키: ${procKey}`);

      // Main Redis에서 키 존재 여부 확인
      const exists = await this.chatRedis.exists(procKey);
      logger.debug(`proc 키 존재 확인: ${procKey} = ${exists}`);

      if (!exists) {
        logger.warn(`proc 키가 존재하지 않습니다: ${procKey}`);

        // 디버깅을 위해 Main Redis 관련 키들 확인
        const relatedKeys = await this.scanKeys(`${chatId}:*`);
        logger.info(`Main Redis 관련 키들:`, {
          chatId,
          relatedKeys,
          pattern: `${chatId}:*`
        });

        return {};
      }

      // 키 타입 확인
      const keyType = await this.chatRedis.type(procKey);
      logger.debug(`proc 키 타입: ${keyType}`);

      if (keyType !== "hash") {
        logger.warn(`proc 키가 hash 타입이 아닙니다: ${keyType}`);
        return {};
      }

      // Main Redis에서 proc 데이터 조회
      const procData = await this.chatRedis.hgetall(procKey);
      logger.info(`proc 데이터 조회 성공:`, {
        procKey,
        keysCount: Object.keys(procData).length,
        keys: Object.keys(procData).slice(0, 10),
        hasKey1: !!(procData && procData["1"])
      });

      if (procData && Object.keys(procData).length > 0) {
        return procData;
      } else {
        logger.warn(`proc 데이터가 비어있습니다`);
        return {};
      }
    } catch (error) {
      logger.error(`proc 데이터 조회 중 오류: ${chatId}`, error);
      return {};
    }
  }

  /**
   * 세션 관련 모든 키 삭제
   */
  async deleteSessionKeys(chatId: string): Promise<void> {
    const pattern = `${chatId}:*`;

    // Main Redis에서 삭제
    const mainKeys = await this.scanKeys(pattern);
    if (mainKeys.length > 0) {
      await this.chatRedis.del(...mainKeys);
    }

    // Message Redis에서 삭제
    const messageKeys = await this.scanKeysFromMessageRedis(pattern);
    if (messageKeys.length > 0) {
      await this.stageRedis.del(...messageKeys);
    }
  }

  private async scanKeysFromMessageRedis(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = "0";

    do {
      try {
        const result = await this.stageRedis.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          1000
        );
        cursor = result[0];
        keys.push(...result[1]);
      } catch (error) {
        logger.error(`Message Redis 키 스캔 중 오류`, error);
        break;
      }
    } while (cursor !== "0");

    return keys;
  }

  /**
   * 세션 상태 업데이트
   */
  async updateSessionStat(
    chatId: string,
    updates: Record<string, string>
  ): Promise<void> {
    await this.chatRedis.hmset(`${chatId}:stat`, updates);
  }

  /**
   * 프로세스 메시지 추가 (실제 backend 패턴: Main Redis hash)
   */
  async addProcessMessage(chatId: string, message: string): Promise<void> {
    const procKey = `${chatId}:proc`;

    try {
      // Main Redis에서 기존 proc 데이터 조회
      const procData = await this.chatRedis.hgetall(procKey);

      // 가장 큰 인덱스 찾기 (backend와 동일한 로직)
      let maxIndex = -1;
      for (const key in procData) {
        const index = parseInt(key);
        if (!isNaN(index) && index > maxIndex) {
          maxIndex = index;
        }
      }

      const newIndex = maxIndex + 1;
      await this.chatRedis.hset(procKey, newIndex.toString(), message);

      logger.debug(
        `proc 메시지 Main Redis에 추가: ${procKey}[${newIndex}] = ${message}`
      );
    } catch (error) {
      logger.error(`proc 메시지 Main Redis 추가 중 오류: ${chatId}`, error);
    }
  }

  /**
   * Pipeline으로 세션 상태 일괄 조회
   */
  async getSessionStatesWithPipeline(statKeys: string[]): Promise<any[]> {
    const PIPELINE_BATCH_SIZE = parseInt(
      process.env.REDIS_PIPELINE_BATCH_SIZE || "50"
    );
    const sessionStates: any[] = [];

    for (let i = 0; i < statKeys.length; i += PIPELINE_BATCH_SIZE) {
      const batch = statKeys.slice(i, i + PIPELINE_BATCH_SIZE);

      try {
        const pipeline = this.chatRedis.pipeline();
        batch.forEach((key) => pipeline.hgetall(key));

        const results = await pipeline.exec();
        const batchStates = results?.map((result: any) => result[1]) || [];
        sessionStates.push(...batchStates);
      } catch (error) {
        logger.error(`세션 상태 조회 중 오류`, error);

        // fallback to individual queries
        for (const key of batch) {
          try {
            const statData = await this.chatRedis.hgetall(key);
            sessionStates.push(statData);
          } catch (individualError) {
            logger.error(`개별 세션 상태 조회 실패 (${key})`, individualError);
            sessionStates.push({});
          }
        }
      }
    }

    return sessionStates;
  }

  /**
   * Pipeline에 종료 메시지 추가 작업 추가 (실제 backend 패턴: Main Redis hash)
   */
  async addProcessEndMessageToPipeline(
    pipeline: any,
    chatId: string
  ): Promise<void> {
    try {
      // 기존 proc 데이터 조회 (개별 호출 필요)
      const procKey = `${chatId}:proc`;
      const procData = await this.chatRedis.hgetall(procKey);

      // 가장 큰 인덱스 찾기 (backend와 동일한 로직)
      let maxIndex = -1;
      for (const key in procData) {
        const index = parseInt(key);
        if (!isNaN(index) && index > maxIndex) {
          maxIndex = index;
        }
      }

      // Pipeline에 종료 메시지 추가
      const newIndex = maxIndex + 1;
      const endMessage = "| 9002 | Orkis-Jobs 종료";
      pipeline.hset(procKey, newIndex.toString(), endMessage);

      logger.debug(
        `Pipeline에 Main Redis 종료 메시지 추가: ${procKey}[${newIndex}]`
      );
    } catch (error) {
      logger.error(`Main Redis 종료 메시지 추가 준비 중 오류`, {
        chatId,
        error
      });
      // Fallback: 고정 인덱스 사용
      const endMessage = "| 9002 | Orkis-Jobs 종료";
      pipeline.hset(`${chatId}:proc`, "9002", endMessage);
    }
  }
}
