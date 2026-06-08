import { Service, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import Redis from "ioredis";
import { RedisProcessData } from "@/shared/types/ChatTypes";

// 성능 메트릭 인터페이스
interface OptimizationMetrics {
  scanDuration: number;
  pipelineOperations: number;
  totalKeysProcessed: number;
  batchCount: number;
  errorCount: number;
  memoryUsage: number;
}

@Service()
export class RedisCleanupJob {
  @InjectConnection("chatRedis", { type: "native" })
  private chatRedis!: Redis;

  @InjectConnection("stageRedis", { type: "native" })
  private stageRedis!: Redis;

  private readonly REQUIRED_STEPS = [
    "0_0", // app_start
    "0_1", // app_work
    "0_2", // app_end
    "1_0", // ai_start
    "1_1", // ai_work
    "1_2", // ai_end
    "2_0", // job_start
    "2_1", // job_work
    "2_2" // job_end
  ];

  private readonly CLEAN_POSSIBLE_STEP = "2_2";

  private isRunning = false;

  // 최적화 설정
  private readonly SCAN_BATCH_SIZE = parseInt(
    process.env.REDIS_SCAN_BATCH_SIZE || "1000"
  );
  private readonly PIPELINE_BATCH_SIZE = parseInt(
    process.env.REDIS_PIPELINE_BATCH_SIZE || "100"
  );
  private readonly DELETE_BATCH_SIZE = parseInt(
    process.env.REDIS_DELETE_BATCH_SIZE || "50"
  );
  private readonly CONCURRENT_SESSIONS = parseInt(
    process.env.REDIS_CONCURRENT_SESSIONS || "5"
  );
  private readonly ENABLE_OPTIMIZATION =
    process.env.ENABLE_REDIS_OPTIMIZATION === "true";
  private readonly ENABLE_METRICS =
    process.env.ENABLE_PERFORMANCE_METRICS === "true";

  /**
   * 완료된 세션의 Redis 정보를 지속적으로 정리
   * 배치가 아닌 지속적인 감시 모드로 동작
   */
  async startContinuousCleanup(): Promise<void> {
    if (this.isRunning) {
      logger.warn("완료된 세션 정리 작업이 이미 실행 중");
      return;
    }

    this.isRunning = true;
    logger.info("완료된 세션 지속적 정리 시작");

    while (this.isRunning) {
      try {
        // 최적화된 방식 또는 기존 방식 선택
        if (this.ENABLE_OPTIMIZATION) {
          await this.cleanupCompletedSessionsOptimized();
        } else {
          await this.cleanupCompletedSessions();
        }

        // 5초 대기 후 다시 검사
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } catch (error) {
        logger.error("정리 과정 중 오류", error);
        // 오류 발생 시 10초 대기 후 재시도
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
    }
  }

  /**
   * 완료된 세션 정리 중지
   */
  stopContinuousCleanup(): void {
    logger.info("완료된 세션 정리 중지");
    this.isRunning = false;
  }

  /**
   * 완료된 세션들을 찾아서 Redis에서 삭제
   */
  private async cleanupCompletedSessions(): Promise<void> {
    try {
      // Redis 연결 상태 확인
      const pingResult = await this.chatRedis.ping();
      if (pingResult !== "PONG") {
        logger.error("Main Redis 연결 실패");
        return;
      }

      // stat 키 패턴으로 모든 세션 조회
      const statKeys = await this.chatRedis.keys("*:stat");
      const completedSessions: string[] = [];

      logger.debug(`세션 검사 중: ${statKeys.length}개`);

      for (const statKey of statKeys) {
        const chatId = statKey.replace(":stat", "");

        if (await this.isSessionCompleted(chatId)) {
          completedSessions.push(chatId);
        }
      }

      if (completedSessions.length > 0) {
        logger.info(
          `완료된 세션 ${completedSessions.length}개 발견 - 삭제 시작`
        );

        for (const chatId of completedSessions) {
          await this.deleteSessionData(chatId);
        }

        logger.info(`${completedSessions.length}개 세션 삭제 완료`);
      } else {
        logger.debug("삭제할 완료된 세션이 없습니다.");
      }
    } catch (error) {
      logger.error("완료된 세션 정리 중 오류", error);
    }
  }

  /**
   * 세션이 완료되었는지 확인
   */
  private async isSessionCompleted(chatId: string): Promise<boolean> {
    try {
      const statData = await this.chatRedis.hgetall(`${chatId}:stat`);

      if (!statData || Object.keys(statData).length === 0) {
        return false; // stat 데이터가 없으면 미완료
      }

      return this.CLEAN_POSSIBLE_STEP in statData;
    } catch (error) {
      logger.error(`세션 ${chatId} 완료 상태 확인 중 오류`, error);
      return false;
    }
  }

  /**
   * 특정 세션의 모든 Redis 데이터 삭제
   */
  private async deleteSessionData(chatId: string): Promise<void> {
    try {
      logger.debug(`세션 ${chatId} 데이터 삭제 시작`);

      // Main Redis에서 삭제할 키 패턴들
      const mainRedisPatterns = [
        `${chatId}:stat`,
        `${chatId}:proc`,
        `${chatId}:*` // 기타 chatId 관련 모든 키
      ];

      let deletedKeysCount = 0;

      // Main Redis에서 키 삭제
      for (const pattern of mainRedisPatterns) {
        const keys = await this.chatRedis.keys(pattern);
        if (keys.length > 0) {
          await this.chatRedis.del(...keys);
          deletedKeysCount += keys.length;
          logger.debug(`Main Redis에서 ${keys.length}개 키 삭제: ${pattern}`);
        }
      }

      // Message Redis에서 키 삭제 (메시지 스트리밍 관련)
      try {
        const messageRedisPing = await this.stageRedis.ping();
        if (messageRedisPing === "PONG") {
          const messageKeys = await this.stageRedis.keys(`${chatId}*`);
          if (messageKeys.length > 0) {
            await this.stageRedis.del(...messageKeys);
            deletedKeysCount += messageKeys.length;
            logger.debug(`Message Redis에서 ${messageKeys.length}개 키 삭제`);
          }
        }
      } catch (messageRedisError) {
        logger.warn(`Message Redis 연결 실패 (선택사항)`, messageRedisError);
      }

      logger.info(`세션 ${chatId} 완료 - 총 ${deletedKeysCount}개 키 삭제됨`);
    } catch (error) {
      logger.error(`세션 ${chatId} 삭제 중 오류`, error);
    }
  }

  /**
   * 수동으로 특정 세션 삭제 (디버깅/관리용)
   */
  async deleteSpecificSession(chatId: string): Promise<void> {
    logger.info(`수동 삭제 요청: ${chatId}`);

    if (await this.isSessionCompleted(chatId)) {
      await this.deleteSessionData(chatId);
      logger.info(`세션 ${chatId} 수동 삭제 완료`);
    } else {
      logger.warn(`세션 ${chatId}는 아직 완료되지 않음 - 삭제하지 않음`);
    }
  }

  /**
   * 강제로 특정 세션 삭제 (완료 여부 무시)
   */
  async forceDeleteSession(chatId: string): Promise<void> {
    logger.info(`강제 삭제 요청: ${chatId}`);

    if (this.ENABLE_OPTIMIZATION) {
      await this.deleteSessionDataOptimized(chatId);
    } else {
      await this.deleteSessionData(chatId);
    }

    logger.info(`세션 ${chatId} 강제 삭제 완료`);
  }

  // ==================== SCAN + Pipeline 최적화 메서드들 ====================

  /**
   * SCAN 명령어를 사용한 비블로킹 키 조회
   * @param pattern - 매칭할 키 패턴
   * @param redisClient - 사용할 Redis 클라이언트 (기본: main redis)
   * @returns 매칭되는 키 배열
   */
  private async scanKeys(
    pattern: string,
    redisClient = this.chatRedis
  ): Promise<string[]> {
    const keys: string[] = [];
    let cursor = "0";

    do {
      try {
        const result = await redisClient.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          this.SCAN_BATCH_SIZE
        );
        cursor = result[0];
        keys.push(...result[1]);

        // 다른 클라이언트에게 CPU 시간 양보 (대량 키 처리 시)
        if (keys.length % (this.SCAN_BATCH_SIZE * 10) === 0) {
          await new Promise((resolve) => setImmediate(resolve));
        }
      } catch (error) {
        logger.error(
          `키 스캔 중 오류 (pattern: ${pattern}, cursor: ${cursor})`,
          error
        );
        break;
      }
    } while (cursor !== "0");

    return keys;
  }

  /**
   * Pipeline을 사용한 배치 삭제
   * @param keys - 삭제할 키 배열
   * @param redisClient - 사용할 Redis 클라이언트
   * @returns 삭제된 키 개수
   */
  private async deleteKeysWithPipeline(
    keys: string[],
    redisClient = this.chatRedis
  ): Promise<number> {
    if (keys.length === 0) return 0;

    let totalDeleted = 0;

    // 배치 단위로 분할 처리
    for (let i = 0; i < keys.length; i += this.DELETE_BATCH_SIZE) {
      const batch = keys.slice(i, i + this.DELETE_BATCH_SIZE);

      try {
        const pipeline = redisClient.pipeline();
        batch.forEach((key) => pipeline.del(key));

        const results = await pipeline.exec();
        const deletedCount =
          results?.reduce(
            (sum, result) => sum + ((result[1] as number) || 0),
            0
          ) || 0;

        totalDeleted += deletedCount;

        if (this.ENABLE_METRICS) {
          logger.debug(`배치 삭제 완료: ${deletedCount}/${batch.length}개`);
        }
      } catch (error) {
        logger.error(
          `배치 삭제 중 오류 (batch: ${i}-${i + batch.length})`,
          error
        );

        // 개별 삭제로 fallback
        for (const key of batch) {
          try {
            const deleted = await redisClient.del(key);
            totalDeleted += deleted;
          } catch (individualError) {
            logger.error(`개별 키 삭제 실패 (${key})`, individualError);
          }
        }
      }
    }

    return totalDeleted;
  }

  /**
   * Pipeline으로 세션 상태 일괄 조회
   */
  private async getSessionStatesWithPipeline(
    statKeys: string[]
  ): Promise<RedisProcessData[]> {
    const sessionStates: RedisProcessData[] = [];

    for (let i = 0; i < statKeys.length; i += this.PIPELINE_BATCH_SIZE) {
      const batch = statKeys.slice(i, i + this.PIPELINE_BATCH_SIZE);

      try {
        const pipeline = this.chatRedis.pipeline();
        batch.forEach((key) => pipeline.hgetall(key));

        const results = await pipeline.exec();
        const batchStates =
          results?.map((result) => result[1] as RedisProcessData) || [];
        sessionStates.push(...batchStates);
      } catch (error) {
        logger.error(
          `세션 상태 조회 중 오류 (batch: ${i}-${i + batch.length})`,
          error
        );

        // 개별 조회로 fallback
        for (const key of batch) {
          try {
            const statData = await this.chatRedis.hgetall(key);
            sessionStates.push(statData as RedisProcessData);
          } catch (individualError) {
            logger.error(`개별 세션 상태 조회 실패 (${key})`, individualError);
            sessionStates.push({} as RedisProcessData);
          }
        }
      }
    }

    return sessionStates;
  }

  /**
   * 세션 데이터로부터 완료 상태 확인 (네트워크 호출 없음)
   */
  private isSessionCompletedFromData(statData: RedisProcessData): boolean {
    if (
      !statData ||
      typeof statData !== "object" ||
      Object.keys(statData).length === 0
    ) {
      return false;
    }

    return this.CLEAN_POSSIBLE_STEP in statData;
  }

  /**
   * SCAN + Pipeline을 활용한 최적화된 완료 세션 정리
   */
  private async cleanupCompletedSessionsOptimized(): Promise<void> {
    const startTime = Date.now();
    const metrics: OptimizationMetrics = {
      scanDuration: 0,
      pipelineOperations: 0,
      totalKeysProcessed: 0,
      batchCount: 0,
      errorCount: 0,
      memoryUsage: 0
    };

    try {
      // Redis 연결 상태 확인
      const pingResult = await this.chatRedis.ping();
      if (pingResult !== "PONG") {
        logger.error("Main Redis 연결 실패 (최적화 모드)");
        return;
      }

      // 1. SCAN으로 비블로킹 키 조회
      if (this.ENABLE_METRICS) {
        logger.debug("세션 키 스캔 시작...");
      }

      const scanStart = Date.now();
      const statKeys = await this.scanKeys("*:stat");
      metrics.scanDuration = Date.now() - scanStart;

      if (this.ENABLE_METRICS) {
        logger.debug(
          `총 ${statKeys.length}개 세션 발견 (${metrics.scanDuration}ms)`
        );
      }

      if (statKeys.length === 0) {
        if (this.ENABLE_METRICS) {
          logger.debug("처리할 세션이 없습니다.");
        }
        return;
      }

      // 2. Pipeline으로 배치 상태 확인
      if (this.ENABLE_METRICS) {
        logger.debug("세션 상태 일괄 조회 시작...");
      }

      const sessionStates = await this.getSessionStatesWithPipeline(statKeys);
      metrics.pipelineOperations++;

      // 3. 완료된 세션 식별
      const completedSessions: string[] = [];
      for (let i = 0; i < statKeys.length; i++) {
        const statData = sessionStates[i];
        if (this.isSessionCompletedFromData(statData)) {
          const chatId = statKeys[i].replace(":stat", "");
          completedSessions.push(chatId);
        }
      }

      if (this.ENABLE_METRICS) {
        logger.debug(`${completedSessions.length}개 완료된 세션 식별`);
      }

      // 4. Pipeline으로 배치 삭제
      if (completedSessions.length > 0) {
        await this.deleteCompletedSessionsWithPipeline(
          completedSessions,
          metrics
        );

        if (this.ENABLE_METRICS) {
          logger.info(`${completedSessions.length}개 세션 정리 완료`);
        }
      } else {
        if (this.ENABLE_METRICS) {
          logger.debug("삭제할 완료된 세션이 없습니다.");
        }
      }

      // 성능 메트릭 로깅
      if (this.ENABLE_METRICS) {
        this.logPerformanceMetrics(metrics, Date.now() - startTime);
      }
    } catch (error) {
      metrics.errorCount++;
      logger.error("최적화된 정리 과정 중 오류", error);

      // 오류 발생 시 기존 방식으로 fallback
      logger.warn("기존 정리 방식으로 전환...");
      await this.cleanupCompletedSessions();
    }
  }

  /**
   * Pipeline으로 완료된 세션 일괄 삭제
   */
  private async deleteCompletedSessionsWithPipeline(
    completedSessions: string[],
    metrics: OptimizationMetrics
  ): Promise<void> {
    const deletionTasks = completedSessions.map((chatId) =>
      this.deleteSessionDataOptimized(chatId)
    );

    // 병렬 처리 (동시 실행 제한)
    for (let i = 0; i < deletionTasks.length; i += this.CONCURRENT_SESSIONS) {
      const batch = deletionTasks.slice(i, i + this.CONCURRENT_SESSIONS);
      await Promise.all(batch);
      metrics.batchCount++;
    }
  }

  /**
   * 개별 세션 데이터 최적화 삭제
   */
  private async deleteSessionDataOptimized(chatId: string): Promise<void> {
    try {
      if (this.ENABLE_METRICS) {
        logger.debug(`${chatId} 데이터 삭제 시작`);
      }

      // 1. Main Redis 키 SCAN + 삭제
      const mainKeys = await this.scanKeys(`${chatId}:*`);
      const mainDeletedCount = await this.deleteKeysWithPipeline(mainKeys);

      // 2. Message Redis 키 SCAN + 삭제 (선택사항)
      let messageDeletedCount = 0;
      try {
        const messageRedisPing = await this.stageRedis.ping();
        if (messageRedisPing === "PONG") {
          const messageKeys = await this.scanKeys(
            `${chatId}*`,
            this.stageRedis
          );
          messageDeletedCount = await this.deleteKeysWithPipeline(
            messageKeys,
            this.stageRedis
          );
        }
      } catch (messageError) {
        logger.warn(`${chatId} Message Redis 처리 중 오류`, messageError);
      }

      const totalDeleted = mainDeletedCount + messageDeletedCount;

      if (this.ENABLE_METRICS || totalDeleted > 0) {
        logger.info(`${chatId} 삭제 완료 - 총 ${totalDeleted}개 키`);
      }
    } catch (error) {
      logger.error(`${chatId} 최적화 삭제 중 오류`, error);

      // fallback to legacy method
      logger.warn(`${chatId} 기존 방식으로 삭제 시도...`);
      await this.deleteSessionData(chatId);
    }
  }

  /**
   * 성능 메트릭 로깅
   */
  private logPerformanceMetrics(
    metrics: OptimizationMetrics,
    totalDuration: number
  ): void {
    logger.info("Redis 정리 성능 메트릭", {
      totalDuration,
      scanDuration: metrics.scanDuration,
      pipelineOperations: metrics.pipelineOperations,
      totalKeysProcessed: metrics.totalKeysProcessed,
      batchCount: metrics.batchCount,
      averageBatchSize:
        metrics.batchCount > 0
          ? Math.round(metrics.totalKeysProcessed / metrics.batchCount)
          : 0,
      errorCount: metrics.errorCount
    });
  }
}
