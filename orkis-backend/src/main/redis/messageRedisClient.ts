import { Component, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import Redis from "ioredis";

@Component("MessageRedisClient")
export class MessageRedisClient {
  @InjectConnection("stageRedis", { type: "native" })
  private stageRedisClient!: Redis;

  private async connectCheck(): Promise<boolean> {
    try {
      // stageRedisClient Promise resolve
      let client: Redis;
      try {
        client = this.stageRedisClient;
      } catch (error) {
        logger.error(
          "[MessageRedis] stageRedisClient Promise resolve 실패:",
          error
        );
        return false;
      }

      if (!client) {
        logger.error(
          "[MessageRedis] stageRedisClient resolve 결과가 null/undefined입니다."
        );
        return false;
      }

      // Redis 클라이언트 상태 확인
      // PING 테스트
      try {
        const pingResult = await client.ping();
        if (pingResult !== "PONG") {
          logger.error(
            `[MessageRedis] PING 응답이 비정상입니다: ${pingResult}`
          );
          return false;
        }
      } catch (pingError) {
        logger.error("[MessageRedis] PING 테스트 실패:", pingError);
        return false;
      }
      return true;
    } catch (error) {
      logger.error("[MessageRedis] connectCheck 오류:", error);
      logger.error(
        "[MessageRedis] 오류 스택:",
        error instanceof Error ? error.stack : "No stack"
      );
      return false;
    }
  }

  /**
   * Consumer Group과 XRANGE를 결합한 하이브리드 메시지 조회
   * 기존 메시지는 XRANGE로, 새 메시지는 Consumer Group으로 처리
   */
  async getCompleteStreamMessage(msgId: string): Promise<string | null> {
    try {
      const isConnected = await this.connectCheck();
      if (!isConnected) {
        return null;
      }

      const client = this.stageRedisClient;

      // msgId를 그대로 스트림 키로 사용
      let streamKey = msgId;
      // 1. 먼저 XRANGE로 모든 기존 메시지 조회
      const allMessages = await client.xrange(streamKey, "-", "+");
      if (!allMessages || allMessages.length === 0) {
        // 키 존재 여부 확인
        const keyType = await client.type(streamKey);
        if (keyType === "none") {
          // 디버깅을 위해 현재 Redis에 있는 모든 스트림 키 확인
          try {
            const allKeys = await client.keys("*");
            if (allKeys.length < 20) {
            }

            // 스트림 타입 키만 필터링
            const streamKeys = [];
            for (const key of allKeys) {
              const type = await client.type(key);
              if (type === "stream") {
                streamKeys.push(key);
              }
            }
          } catch (e) {
            logger.error(`[MessageRedis] 키 목록 조회 중 오류:`, e);
          }
        }

        return null;
      }

      // 2. 모든 메시지 조각을 조합
      let fullMessage = "";
      for (const [entryId, fields] of allMessages) {
        if (fields && fields.length >= 2 && fields[0] === "m") {
          fullMessage += fields[1];
        }
      }

      return fullMessage;
    } catch (error) {
      logger.error(`[MessageRedis] getCompleteStreamMessage 오류:`, error);
      return null;
    }
  }

  /**
   * msg_id로 스트리밍 메시지 조회
   */
  async getStreamingMessageById(msgId: string): Promise<string | null> {
    try {
      const client = this.stageRedisClient;

      await this.connectCheck();
      // Redis Streams 방식으로 메시지 조회
      const streamKey = msgId; // msgId가 이미 stream key 형태 (예: de966ca6-9d1b-47aa-9d52-4e0c14baa174:1)
      try {
        // 먼저 키 타입 확인
        const keyType = await client.type(streamKey);
        if (keyType !== "stream" && keyType !== "none") {
          // string 타입이면 직접 가져오기 시도
          if (keyType === "string") {
            const stringValue = await client.get(streamKey);
            return stringValue;
          }
        }

        // 기존 클라이언트로 Stream의 모든 메시지를 가져와서 조합
        const messages = await client.xrange(streamKey, "-", "+");

        // 메시지 조합 (각 entry의 'm' 필드를 연결)
        let fullMessage = "";
        for (const message of messages) {
          const [id, fields] = message;
          // fields는 ['m', 'content'] 형태
          if (fields && fields.length >= 2 && fields[0] === "m") {
            fullMessage += fields[1];
          }
        }
        return fullMessage;
      } catch (streamError) {
        logger.error(
          `[MessageRedis] Redis Streams 조회 실패, 기존 방식 시도:`,
          streamError
        );

        // Fallback: 기존 방식으로 시도
        const streamingKey = `${msgId}:streaming`;
        const messageData = await client.get(streamingKey);

        if (messageData) {
          return messageData;
        }
        return null;
      }
    } catch (error) {
      logger.error(
        `[MessageRedis] getStreamingMessageById 최상위 오류:`,
        error
      );
      logger.error(
        `[MessageRedis] 오류 스택:`,
        error instanceof Error ? error.stack : "No stack trace"
      );
      return null;
    }
  }

  /**
   * Consumer Group을 사용한 실시간 스트리밍 메시지 소비
   * @param streamKey Redis Stream 키 (msg_id)
   * @param groupName Consumer Group 이름
   * @param consumerName Consumer 이름
   * @param callback 메시지 수신 콜백
   * @param abortSignal 취소 신호
   */
  async consumeStreamWithGroup(
    streamKey: string,
    groupName: string,
    consumerName: string,
    callback: (data: string) => void,
    abortSignal?: AbortSignal
  ): Promise<void> {
    try {
      const client = this.stageRedisClient;

      await this.connectCheck();
      // 먼저 스트림 존재 여부 및 타입 확인
      try {
        const keyType = await client.type(streamKey);
        if (keyType === "stream") {
          const streamInfo = await client.xinfo("STREAM", streamKey);
        } else if (keyType === "none") {
        } else {
          throw new Error(
            `키 '${streamKey}'가 stream 타입이 아닙니다: ${keyType}`
          );
        }
      } catch (keyCheckError) {
        logger.error(`[MessageRedis] 키 확인 중 오류:`, keyCheckError);
      }

      // Consumer Group 생성 (이미 존재하면 무시)
      try {
        await client.xgroup("CREATE", streamKey, groupName, "0", "MKSTREAM");
      } catch (err) {
        // 이미 존재하는 그룹이면 무시
        if (err instanceof Error && err.message.includes("BUSYGROUP")) {
        } else {
          logger.error(`[MessageRedis] Consumer Group 생성 오류:`, err);
        }
      }

      // Consumer 생성 (파이썬 코드와 동일하게)
      try {
        await client.call(
          "XGROUP",
          "CREATECONSUMER",
          streamKey,
          groupName,
          consumerName
        );
      } catch (err) {
        // Consumer가 이미 존재할 수 있음
      }

      // 실시간 메시지 소비 루프
      let messageBuffer = "";

      while (!abortSignal?.aborted) {
        try {
          // XREADGROUP으로 새 메시지 읽기 (1초 블로킹, 파이썬과 동일)
          const messages = (await client.call(
            "XREADGROUP",
            "GROUP",
            groupName,
            consumerName,
            "BLOCK",
            "1000",
            "COUNT",
            "1",
            "STREAMS",
            streamKey,
            ">"
          )) as any[];

          if (messages && messages.length > 0) {
            // 파이썬 코드와 동일한 구조: [[stream, entries]]
            for (const [stream, entries] of messages) {
              if (Array.isArray(entries)) {
                for (const [entryId, fields] of entries) {
                  try {
                    // 종료 신호 확인 (파이썬 코드와 동일)
                    if (entryId.startsWith("1")) {
                      await client.xack(streamKey, groupName, entryId);
                      return; // 함수 종료
                    }

                    // 필드에서 메시지 내용 추출
                    if (fields && fields.length >= 2 && fields[0] === "m") {
                      const messageContent = fields[1];
                      messageBuffer += messageContent;
                      // 콜백으로 부분 메시지 전달
                      callback(messageContent);

                      // 메시지 처리 완료 ACK (파이썬과 동일)
                      await client.xack(streamKey, groupName, entryId);
                    } else {
                    }
                  } catch (msgError) {
                    logger.error(
                      `[MessageRedis] 메시지 처리 실패: ${entryId}`,
                      msgError
                    );
                    // 파이썬 코드와 동일: 실패 시 ACK하지 않아서 XPENDING 상태로 남음
                  }
                }
              }
            }
          } else {
          }

          // 짧은 대기 후 계속
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (readError) {
          logger.error(`[MessageRedis] XREADGROUP 오류:`, readError);
          // 오류 발생 시 잠시 대기 후 재시도
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      logger.error(`[MessageRedis] Consumer Group 스트리밍 오류:`, error);
    }
  }

  /**
   * 실시간 스트리밍 메시지 감시
   */
  async watchStreamingMessage(
    msgId: string,
    callback: (data: string) => void
  ): Promise<void> {
    try {
      await this.connectCheck();
      const client = this.stageRedisClient;

      const streamingKey = `${msgId}:streaming`;
      // 500ms 간격으로 polling하여 실시간 감시
      const intervalId = setInterval(async () => {
        try {
          const data = await client.get(streamingKey);
          if (data) {
            callback(data);
          }
        } catch (error) {
          logger.error(`[MessageRedis] 스트리밍 감시 중 오류:`, error);
        }
      }, 500);

      // 정리 로직 (필요시 clearInterval 호출할 수 있도록 interval ID 관리)
      // 실제 구현에서는 AbortController나 cleanup 메커니즘 필요
    } catch (error) {
      logger.error(`[MessageRedis] 스트리밍 메시지 감시 설정 오류:`, error);
    }
  }

  /**
   * Redis 키 디버깅 함수
   * 특정 패턴의 키들과 그 타입을 확인
   */
  async debugRedisKeys(pattern: string = "*"): Promise<void> {
    const client = this.stageRedisClient;
    try {
      // 패턴에 맞는 키들 검색
      const keys = await client.keys(pattern);
      if (keys.length === 0) {
        return;
      }

      // 각 키의 타입과 정보 출력
      for (const key of keys) {
        try {
          const keyType = await client.type(key);
          switch (keyType) {
            case "string":
              const stringVal = await client.get(key);
              break;

            case "stream":
              const streamLen = await client.xlen(key);
              if (streamLen > 0) {
                const entries = await client.xrange(
                  key,
                  "-",
                  "+",
                  "COUNT",
                  "3"
                );
              }
              break;

            case "hash":
              const hashData = await client.hgetall(key);
              break;

            case "list":
              const listLen = await client.llen(key);
              break;

            default:
          }
        } catch (keyError) {
          logger.error(`[MessageRedis] 키 ${key} 처리 중 오류:`, keyError);
        }
      }
    } catch (error) {
      logger.error(`[MessageRedis] Redis 키 디버깅 오류:`, error);
    }
  }

  /**
   * Consumer Group 테스트 함수 (파이썬 코드 참조)
   * 실제 msg_id로 테스트할 수 있는 함수
   */
  async testConsumerGroup(msgId: string): Promise<void> {
    const groupName = "message_consumers";
    const consumerName = `consumer_${Date.now().toString(16)}`;
    try {
      // 스트림 존재 여부 확인
      const client = this.stageRedisClient;
      const keyType = await client.type(msgId);
      if (keyType !== "stream" && keyType !== "none") {
        logger.error(
          `[MessageRedis] 키 '${msgId}'는 stream이 아닙니다: ${keyType}`
        );
        return;
      }

      // Consumer Group 생성
      try {
        await client.xgroup("CREATE", msgId, groupName, "0", "MKSTREAM");
      } catch (err: any) {
        if (err.message.includes("BUSYGROUP")) {
        } else {
          logger.error(`[MessageRedis] Consumer Group 생성 실패:`, err);
          return;
        }
      }

      // Consumer 생성
      try {
        await client.call(
          "XGROUP",
          "CREATECONSUMER",
          msgId,
          groupName,
          consumerName
        );
      } catch (err) {
      }

      // 한 번만 메시지 읽기 시도
      const messages = (await client.call(
        "XREADGROUP",
        "GROUP",
        groupName,
        consumerName,
        "BLOCK",
        "2000", // 2초 대기
        "COUNT",
        "5",
        "STREAMS",
        msgId,
        ">"
      )) as any[];

      if (messages && messages.length > 0) {
        for (const [stream, entries] of messages) {
          for (const [entryId, fields] of entries) {
            // ACK 처리
            await client.xack(msgId, groupName, entryId);
          }
        }
      } else {
      }
    } catch (error) {
      logger.error(`[MessageRedis] Consumer Group 테스트 오류:`, error);
    }
  }
}
