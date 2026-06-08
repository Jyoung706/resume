import * as cron from "node-cron";
import { Service, Autowired } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { ChatSessionCleanupJob } from "@/session/ChatSessionCleanupJob";
import { RedisCleanupJob } from "@/redis/RedisCleanupJob";
import { DataArchiveJob } from "@/archiving/DataArchiveJob";
import { QuestionCountJob } from "@/question/QuestionCountJob";
import { AiServerHealthJob } from "@/health/AiServerHealthJob";

@Service()
export class JobScheduler {
  private scheduledJobs: cron.ScheduledTask[] = [];

  @Autowired("ChatSessionCleanupJob")
  private chatSessionCleanupJob!: ChatSessionCleanupJob;

  @Autowired("RedisCleanupJob")
  private redisCleanupJob!: RedisCleanupJob;

  @Autowired("DataArchiveJob")
  private dataArchiveJob!: DataArchiveJob;

  @Autowired("QuestionCountJob")
  private questionCronJob!: QuestionCountJob;

  @Autowired("AiServerHealthJob")
  private aiServerHealthJob!: AiServerHealthJob;

  /**
   * 모든 스케줄 작업 시작
   */
  startAllJobs(): void {
    logger.info("작업 스케줄러 시작");

    this.scheduleChatSessionCleanup();
    // [2026-05-08] HTTP trigger archive 전환 (Backend ArchiveDispatcher → /archive/internal).
    // cron 자동 등록을 비활성화하되, DataArchiveJob 클래스 본체와 메서드 본체는 보존한다 (추후 확인용).
    // 비상 시 본 라인 + 아래 scheduleDataArchive() 메서드 본체 주석을 해제하면 즉시 cron 부활 가능.
    // this.scheduleDataArchive();
    this.startRedisCleanup();
    this.scheduleQuestionCountJob();
    this.scheduleAiServerHealthCheck();

    logger.info("모든 작업 스케줄링 완료");
  }

  /**
   * AI 서버 헬스체크 스케줄링 (30초 주기).
   * 참고: docs/2026-05-26/jobs-healthcheck-plan.md §4.3
   */
  private scheduleAiServerHealthCheck(): void {
    const intervalSeconds = this.parseIntervalSeconds();
    const cronExpression = `*/${intervalSeconds} * * * * *`;

    const task = cron.schedule(
      cronExpression,
      async () => {
        try {
          await this.aiServerHealthJob.runOnce();
        } catch (error) {
          // runOnce 는 throw 하지 않도록 설계되었으나 만약을 대비한 안전망
          logger.error("[AiServerHealthJob] 실행 중 예외 (안전망 캐치)", error);
        }
      },
      {
        scheduled: true,
        timezone: "Asia/Seoul"
      }
    );

    this.scheduledJobs.push(task);
    logger.info(`[AiServerHealthJob] 스케줄 등록 완료`, { intervalSeconds });

    if (process.env.AI_HEALTH_RUN_ON_STARTUP === "true") {
      logger.info("[AiServerHealthJob] 시작 시 즉시 1회 실행");
      this.aiServerHealthJob
        .runOnce()
        .catch((error: unknown) =>
          logger.error("[AiServerHealthJob] 초기 실행 중 오류", error)
        );
    }
  }

  /**
   * AI_HEALTH_CHECK_INTERVAL_SECONDS 입력 sanitize.
   * - 비정상 입력 (NaN / 음수 / 0) → 기본 30초
   * - 권장 범위 1 ≤ N ≤ 300 초과 시 경고 로그
   */
  private parseIntervalSeconds(): number {
    const raw = parseInt(
      process.env.AI_HEALTH_CHECK_INTERVAL_SECONDS || "30",
      10
    );
    if (!Number.isFinite(raw) || raw <= 0) {
      logger.warn(
        `[AiServerHealthJob] AI_HEALTH_CHECK_INTERVAL_SECONDS 비정상 — 기본 30초 적용`
      );
      return 30;
    }
    if (raw > 300) {
      logger.warn(
        `[AiServerHealthJob] AI_HEALTH_CHECK_INTERVAL_SECONDS=${raw} 권장 범위 초과 — 그대로 사용`
      );
    }
    return raw;
  }

  private scheduleQuestionCountJob(): void {
    const cronExpression = "0 0 0 * * *";
    const questionCount = parseInt(process.env.USER_QUESTION_COUNT || "50");

    const task = cron.schedule(
      cronExpression,
      async () => {
        try {
          await this.questionCronJob.userQuestionInit(questionCount);
        } catch (error) {
          logger.error("QuestionCountJob 실행 중 오류", error);
        }
      },
      {
        scheduled: true,
        timezone: "Asia/Seoul"
      }
    );
    logger.info("[QuestionCountJob] 매일 자정 스케쥴링 등록 완료");

    this.scheduledJobs.push(task);
  }

  /**
   * 채팅 세션 정리 작업 스케줄링
   */
  private scheduleChatSessionCleanup(): void {
    // 초 단위로 변경
    const intervalSeconds = parseInt(
      process.env.SESSION_CHECK_INTERVAL_SECONDS || "10"
    );

    // cron 표현식 생성 (매 N초마다 실행)
    const cronExpression = `*/${intervalSeconds} * * * * *`;

    const task = cron.schedule(
      cronExpression,
      async () => {
        logger.debug(`채팅 세션 정리 작업 실행 (주기: ${intervalSeconds}초)`);
        try {
          await this.chatSessionCleanupJob.checkAndCleanupSessions();
        } catch (error) {
          logger.error("채팅 세션 정리 작업 실행 중 오류", error);
        }
      },
      {
        scheduled: true,
        timezone: "Asia/Seoul"
      }
    );

    this.scheduledJobs.push(task);

    logger.info(`채팅 세션 정리 스케줄 설정 완료`, { intervalSeconds });

    if (process.env.RUN_ON_STARTUP === "true") {
      logger.info("시작 시 채팅 세션 정리 즉시 실행");
      this.chatSessionCleanupJob
        .checkAndCleanupSessions()
        .catch((error: unknown) => logger.error("초기 실행 중 오류", error));
    }
  }

  /**
   * Redis 정리 작업 시작 (지속적 실행)
   */
  private startRedisCleanup(): void {
    logger.info("Redis 정리 작업 시작 (지속적 실행)");

    this.redisCleanupJob.startContinuousCleanup().catch((error: unknown) => {
      logger.error("Redis 정리 작업 실행 중 오류", error);
    });
  }

  // [2026-05-08] HTTP trigger archive 전환으로 cron 자동 등록 비활성화.
  // 메서드 본체는 추후 확인용 보존(라인 주석 사용 — 원본 텍스트 정확 보존).
  // 비상 롤백 시: startAllJobs() 의 호출처 주석 + 아래 라인 주석을 모두 해제하면
  // 10초 cron polling 즉시 부활.
  //
  // /**
  //  * 데이터 아카이브 작업 스케줄링
  //  */
  // private scheduleDataArchive(): void {
  //   // 초 단위로 변경 (환경변수로 설정 가능)
  //   const intervalSeconds = parseInt(
  //     process.env.DATA_ARCHIVE_INTERVAL_SECONDS || "10"
  //   );
  //
  //   const cronExpression = `*/${intervalSeconds} * * * * *`; // 매 N초마다
  //
  //   const task = cron.schedule(
  //     cronExpression,
  //     async () => {
  //       logger.debug(`데이터 아카이브 작업 실행 (주기: ${intervalSeconds}초)`);
  //       try {
  //         await this.dataArchiveJob.execute();
  //       } catch (error) {
  //         logger.error("데이터 아카이브 작업 실행 중 오류", error);
  //       }
  //     },
  //     {
  //       scheduled: true,
  //       timezone: "Asia/Seoul"
  //     }
  //   );
  //
  //   this.scheduledJobs.push(task);
  //
  //   logger.info(`데이터 아카이브 스케줄 설정 완료`, { intervalSeconds });
  //
  //   if (process.env.RUN_ARCHIVE_ON_STARTUP === "true") {
  //     logger.info("시작 시 데이터 아카이브 즉시 실행");
  //     this.dataArchiveJob
  //       .execute()
  //       .catch((error: unknown) =>
  //         logger.error("초기 아카이브 실행 중 오류", error)
  //       );
  //   }
  // }

  /**
   * 모든 스케줄 작업 중지
   */
  stopAllJobs(): void {
    logger.info("모든 스케줄 작업 중지");

    this.scheduledJobs.forEach((job) => job.stop());
    this.scheduledJobs = [];

    this.redisCleanupJob.stopContinuousCleanup();

    logger.info("스케줄러 종료 완료");
  }

  /**
   * 수동으로 특정 작업 실행 (가용성 및 디버깅용)
   */
  async runJobManually(jobName: string, sessionId?: string): Promise<void> {
    logger.info(`수동 작업 실행 요청`, { jobName, sessionId });

    try {
      switch (jobName) {
        case "chat-cleanup":
          await this.chatSessionCleanupJob.checkAndCleanupSessions();
          logger.info("채팅 세션 정리 수동 실행 완료");
          break;
        case "redis-cleanup":
          if (sessionId) {
            await this.redisCleanupJob.deleteSpecificSession(sessionId);
            logger.info(`특정 세션 삭제 완료`, { sessionId });
          } else {
            logger.info("Redis 정리 작업은 지속적으로 실행 중");
          }
          break;
        case "force-delete":
          if (sessionId) {
            await this.redisCleanupJob.forceDeleteSession(sessionId);
            logger.info(`세션 강제 삭제 완료`, { sessionId });
          } else {
            logger.warn("강제 삭제에는 sessionId 필요");
          }
          break;
        case "data-archive":
          await this.dataArchiveJob.execute();
          logger.info("데이터 아카이브 수동 실행 완료");
          break;
        case "archive-session":
          if (sessionId) {
            await this.dataArchiveJob.archiveSpecificSession(sessionId);
            logger.info(`특정 세션 아카이브 완료`, { sessionId });
          } else {
            logger.warn("세션 아카이브에는 sessionId 필요");
          }
          break;
        case "ai-health":
          await this.aiServerHealthJob.runOnce();
          logger.info("AI 서버 헬스체크 수동 실행 완료");
          break;
        default:
          logger.warn(`알 수 없는 작업`, { jobName });
      }
    } catch (error) {
      logger.error(`수동 작업 실행 중 오류`, { jobName, sessionId, error });
      throw error;
    }
  }
}
