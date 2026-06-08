import Redis from "ioredis";
import { Service, Autowired, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { StreamArchiveMapper } from "@/archiving/StreamArchiveMapper";
import { ArchiveWriter } from "@/archiving/ArchiveWriter";
import {
  ArchiveHints,
  BadRequestError,
  QueueOverflowError,
  StatHash,
  StreamEntryRaw
} from "@/archiving/archiveTypes";

// Controller 가 한 곳에서 import 할 수 있도록 re-export
export {
  BadRequestError,
  QueueOverflowError
} from "@/archiving/archiveTypes";

/**
 * Backend HTTP trigger 로 들어온 chatId 를 큐 적재 후 워커에서 archive 작성.
 *
 * 큐 자료구조: per-chatId Promise chain mutex (Map<chatId, Promise<void>>).
 * dedup: stat[2_2] 가 이미 박혀있으면 워커 진입 직후 skip.
 * 큐 깊이 ARCHIVE_MAX_QUEUE_SIZE 초과 시 QueueOverflowError(=> HTTP 503).
 * payload 검증 실패 시 BadRequestError(=> HTTP 400).
 */
@Service()
export class ArchiveService {
  @InjectConnection("chatRedis", { type: "native" })
  private chatRedis!: Redis;

  // m chunks 는 chatRedis 가 아닌 stageRedis 의 별도 stream(streamKey=msg_id) 에 저장됨.
  // cron DataArchiveJob.getStreamMessage(L435+) 패턴과 동일.
  @InjectConnection("stageRedis", { type: "native" })
  private stageRedis!: Redis;

  @Autowired("StreamArchiveMapper")
  private mapper!: StreamArchiveMapper;

  @Autowired("ArchiveWriter")
  private writer!: ArchiveWriter;

  // per-chatId 직렬화
  private readonly inflight = new Map<string, Promise<void>>();

  private readonly settleDelayMs = parseInt(
    process.env.ARCHIVE_SETTLE_DELAY_MS ?? "50",
    10
  );

  private readonly maxQueueSize = parseInt(
    process.env.ARCHIVE_MAX_QUEUE_SIZE ?? "100",
    10
  );

  /**
   * 큐 적재. 큐 깊이 반환. 비동기 처리는 워커가 수행.
   *
   * cancel-archive race fix (Phase 3b):
   * - hints (backend dispatch payload) 를 runOne 으로 전달.
   * - conflict resolution: 동일 chatId 의 여러 dispatch 가 inflight chain 으로 직렬화되며,
   *   stat[2_2] dedup 으로 **가장 먼저 archive 작성에 성공한 task 가 hints 도 결정**한다
   *   (first-wins-by-execution-order). 후속 dispatch 의 hints 는 dedup 에서 skip 되어 무시.
   * - 실무 영향: cancelStream 의 9001 dispatch 가 sse.onClose 보다 먼저 enqueue 되므로
   *   대부분의 cancel 케이스는 9001 로 정확히 기록됨. 네트워크 역전으로 onClose 가 먼저
   *   도착하는 드문 경우엔 hints 없이 처리되어 redis r 로 fallback (이전 행동과 동일).
   */
  enqueue(chatId: string, hints?: ArchiveHints): number {
    if (typeof chatId !== "string" || chatId.length === 0) {
      throw new BadRequestError("chatId required");
    }
    if (this.inflight.size >= this.maxQueueSize) {
      throw new QueueOverflowError(this.inflight.size, this.maxQueueSize);
    }

    const prev = this.inflight.get(chatId) ?? Promise.resolve();
    const next = prev
      .then(() => this.runOne(chatId, hints))
      .catch((err) => {
        logger.error(`[archive] worker error chatId=${chatId}`, err);
      })
      .finally(() => {
        // 가장 최근 등록 task 만 정리 (중간 task 는 chain 유지 중일 수 있음)
        if (this.inflight.get(chatId) === next) {
          this.inflight.delete(chatId);
        }
      });

    this.inflight.set(chatId, next);
    return this.inflight.size;
  }

  private async runOne(chatId: string, hints?: ArchiveHints): Promise<void> {
    // 1) settle delay (R1 대응 - AI r 필드 XADD 안정화 대기)
    if (this.settleDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.settleDelayMs));
    }

    // 2) stat[2_2] dedup
    const stat = (await this.chatRedis.hgetall(`${chatId}:stat`)) as StatHash;
    if (stat["2_2"]) {
      logger.info(`[archive] skip stat[2_2] already set chatId=${chatId}`);
      return;
    }

    // 3) XRANGE chatRedis stream — i / s / msg_id / r 등 메타데이터
    const entries = (await this.chatRedis.xrange(
      `${chatId}:stream`,
      "-",
      "+"
    )) as StreamEntryRaw[];

    // 4) stageRedis 에서 msg_id 별 m chunks 합본 (assistant 답변 본문)
    //    chatRedis stream 에는 msg_id 만 있고 실제 m chunks 는 stageRedis 에 별도 저장됨
    //    (cron DataArchiveJob.getStreamMessage 와 동일 패턴, streamKey = msg_id)
    const msgIds = this.mapper.collectMsgIds(entries);
    const assistantMessage = await this.collectAssistantMessage(chatId, msgIds);

    // 5) Mapper - SessionData 생성 (pure transform)
    //    hints (backend payload) 는 completionCode 1순위 결정에 사용
    const sessionData = this.mapper.toSessionData({
      chatId,
      stat,
      streamEntries: entries,
      assistantMessage,
      hints
    });

    // 6) Writer - atomic append
    const result = await this.writer.appendAtomic(sessionData);

    // 7) 작성 성공 시에만 stat[2_2] 박음 (skip 시는 다음 trigger 에서 재시도 여지)
    if (result.written) {
      await this.chatRedis.hset(
        `${chatId}:stat`,
        "2_2",
        Date.now().toString()
      );
    }
  }

  /**
   * msg_id 별 stageRedis stream 에서 m 필드 chunks 를 모두 합본해 반환.
   * msg_id 가 string 키인 fallback 케이스도 처리(GET 으로 직접 read).
   */
  private async collectAssistantMessage(
    chatId: string,
    msgIds: string[]
  ): Promise<string> {
    if (msgIds.length === 0) return "";

    const parts: string[] = [];
    for (const msgId of msgIds) {
      try {
        const keyType = await this.stageRedis.type(msgId);
        if (keyType === "stream") {
          const messages = (await this.stageRedis.xrange(
            msgId,
            "-",
            "+"
          )) as StreamEntryRaw[];
          for (const [, fields] of messages) {
            for (let i = 0; i + 1 < fields.length; i += 2) {
              if (fields[i] === "m") parts.push(fields[i + 1]);
            }
          }
        } else if (keyType === "string") {
          const v = await this.stageRedis.get(msgId);
          if (v) parts.push(v);
        }
      } catch (err) {
        logger.warn(
          `[archive] stageRedis read 실패 chatId=${chatId} msgId=${msgId} err=${String(
            err
          )}`
        );
      }
    }
    return parts.join("");
  }
}
