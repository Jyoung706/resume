import { Service, Autowired, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import Redis from "ioredis";
import * as fs from "fs";
import * as path from "path";
import { RedisService } from "@/shared/services/RedisService";
import { RedisProcessData } from "@/shared/types/ChatTypes";

@Service()
export class DataArchiveJob {
  @InjectConnection("chatRedis", { type: "native" })
  private chatRedis!: Redis;

  @InjectConnection("stageRedis", { type: "native" })
  private stageRedis!: Redis;

  @Autowired("RedisService")
  private redisService!: RedisService;

  private DATA_ARCHIVE_DIR_PATH: string =
    process.env.DATA_ARCHIVE_DIR_PATH ?? "data-archive";

  /**
   * Redis 데이터 저장 작업 실행
   */
  async execute(): Promise<void> {
    try {
      logger.info("데이터 저장 작업 시작");

      // 저장 가능한 세션 찾기
      const completedSessions = await this.findCompletedSessions();

      if (completedSessions.length === 0) {
        logger.info("저장 가능한 완료된 세션이 없습니다");
        return;
      }

      logger.info(`저장할 세션 ${completedSessions.length}개 발견`);

      // 각 세션별로 데이터 저장
      for (const chatId of completedSessions) {
        await this.archiveSessionData(chatId);
      }

      logger.info("데이터 저장 작업 완료");
    } catch (error) {
      logger.error("데이터 저장 작업 중 오류 발생", error);
    }
  }

  /**
   * 저장 가능한 완료된 세션 찾기 (app_end, ai_end 완료)
   */
  private async findCompletedSessions(): Promise<string[]> {
    const statKeys = await this.redisService.scanKeys("*:stat");
    logger.info(`총 ${statKeys.length}개의 :stat 키 발견`);

    const completedSessions: string[] = [];
    const sessionStates =
      await this.redisService.getSessionStatesWithPipeline(statKeys);

    for (let i = 0; i < statKeys.length; i++) {
      const statKey = statKeys[i];
      const statData = sessionStates[i] as RedisProcessData;

      const chatId = statKey.replace(":stat", "");

      logger.debug(`[${chatId}] stat 데이터 확인:`, {
        hasAppEnd: !!(statData && statData["0_2"]),
        hasAiEnd: !!(statData && statData["1_2"]),
        hasJobEnd: !!(statData && statData["2_2"]),
        statData: statData
      });

      // 저장 조건 확인: app_end(0_2)와 ai_end(1_2)가 모두 완료되었는지 확인
      if (statData && this.isReadyForArchive(statData)) {
        logger.info(`[${chatId}] 저장 조건 충족 - 저장 대상에 추가`);
        completedSessions.push(chatId);
      } else {
        logger.debug(`[${chatId}] 저장 조건 불충족 - 건너뜀`);
      }
    }

    logger.info(
      `저장 조건을 충족하는 세션 ${completedSessions.length}개 발견: ${completedSessions.join(", ")}`
    );
    return completedSessions;
  }

  /**
   * 세션이 저장 준비 상태인지 확인
   */
  private isReadyForArchive(statData: RedisProcessData): boolean {
    const hasAppEnd = statData["0_2"] && statData["0_2"].trim() !== "";
    const hasAiEnd = statData["1_2"] && statData["1_2"].trim() !== "";
    const hasJobEnd = statData["2_2"] && statData["2_2"].trim() !== "";

    logger.debug("저장 조건 상세 확인:", {
      app_end_0_2: statData["0_2"],
      ai_end_1_2: statData["1_2"],
      job_end_2_2: statData["2_2"],
      hasAppEnd,
      hasAiEnd,
      hasJobEnd,
      isReady: hasAppEnd && hasAiEnd && !hasJobEnd
    });

    // app과 ai가 종료되고, job이 아직 종료되지 않은 상태
    return !!(hasAppEnd && hasAiEnd && !hasJobEnd);
  }

  /**
   * 특정 세션의 데이터를 파일로 저장
   */
  private async archiveSessionData(chatId: string): Promise<void> {
    try {
      // job_start 상태 업데이트 (2_0)
      await this.updateJobStatus(chatId, "2_0", Date.now().toString());
      logger.info(`[${chatId}] 데이터 저장 시작`);

      // job_work 상태 업데이트 (2_1)
      await this.updateJobStatus(chatId, "2_1", Date.now().toString());

      // Redis 데이터 수집
      const sessionData = await this.collectSessionData(chatId);

      // 파일 저장
      await this.saveToFile(chatId, sessionData);

      // job_end 상태 업데이트 (2_2)
      await this.updateJobStatus(chatId, "2_2", Date.now().toString());
      logger.info(`[${chatId}] 데이터 저장 완료`);
    } catch (error) {
      logger.error(`[${chatId}] 데이터 저장 중 오류`, error);

      // 오류 발생 시에도 job_end 상태 업데이트 (오류 표시)
      await this.updateJobStatus(chatId, "2_2", `ERROR_${Date.now()}`);
    }
  }

  /**
   * Job 상태 업데이트
   */
  private async updateJobStatus(
    chatId: string,
    statusKey: string,
    timestamp: string
  ): Promise<void> {
    const updates: Record<string, string> = {};
    updates[statusKey] = timestamp;
    await this.redisService.updateSessionStat(chatId, updates);
  }

  /**
   * 세션의 모든 Redis 데이터 수집
   */
  private async collectSessionData(chatId: string): Promise<any> {
    logger.info(`[${chatId}] 세션 데이터 수집 시작`);

    // proc 데이터 조회
    const procData = await this.redisService.getSessionProc(chatId);
    logger.info(`[${chatId}] proc 데이터 조회 결과:`, {
      procDataKeys: Object.keys(procData || {}),
      procDataLength: Object.keys(procData || {}).length,
      procData: procData
    });

    // proc 데이터의 key 1에서 chatroom_id 추출
    const chatroomId = this.extractChatroomId(procData);
    logger.info(`[${chatId}] 추출된 chatroomId: ${chatroomId}`);

    // stat 데이터 조회
    const statData = await this.redisService.getSessionStat(chatId);
    logger.info(`[${chatId}] stat 데이터 조회 결과:`, {
      statDataKeys: Object.keys(statData || {}),
      statData: statData
    });

    const sessionData = {
      chatId,
      chatroomId,
      timestamp: new Date().toISOString(),
      stat: statData,
      proc: procData,
      messages: await this.collectMessages(procData)
    };

    logger.info(`[${chatId}] 세션 데이터 수집 완료`, {
      hasProc: !!(procData && Object.keys(procData).length > 0),
      hasStat: !!(statData && Object.keys(statData).length > 0),
      messagesCount: sessionData.messages.length
    });

    return sessionData;
  }

  /**
   * proc 데이터에서 chatroom_id 추출 (Stream 데이터 반영)
   */
  private extractChatroomId(procData: any): string | null {
    try {
      if (procData && Object.keys(procData).length > 0) {
        logger.debug(
          `chatroom_id 추출 시도, proc keys: ${Object.keys(procData).length}개`
        );

        // Stream에서 변환된 proc 데이터에서 JSON 포함 메시지 찾기
        const sortedKeys = Object.keys(procData).sort(
          (a, b) => parseInt(a) - parseInt(b)
        );

        for (const key of sortedKeys) {
          const message = procData[key];
          if (!message || typeof message !== "string") continue;

          // JSON 형식인 경우 파싱 시도
          try {
            const parsed = JSON.parse(message);
            const chatroomId = parsed.chatroom_id || parsed.chatroomId || null;
            if (chatroomId) {
              logger.info(
                `JSON 파싱 성공, chatroom_id: ${chatroomId} (proc[${key}])`
              );
              return chatroomId;
            }
          } catch (parseError) {
            // JSON이 아닌 경우 계속
          }

          // 텍스트 형식에서 정규식으로 추출
          const patterns = [
            /"chatroom_id"\s*:\s*"([^"]+)"/,
            /chatroom_id[:\s]*"?([a-f0-9-]{36})"?/i,
            /'chatroom_id'\s*:\s*'([^']+)'/,
            /chatroom_id[=:\s]+([a-f0-9-]{36})/i
          ];

          for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match && match[1]) {
              logger.info(
                `정규식으로 chatroom_id 추출 성공: ${match[1]} (proc[${key}])`
              );
              return match[1];
            }
          }

          // 디버깅: 긴 메시지에서 chatroom 관련 내용 확인
          if (message.length > 50 && message.includes("chatroom")) {
            logger.debug(
              `proc[${key}] chatroom 관련 내용: ${message.substring(0, 200)}...`
            );
          }
        }

        logger.warn(`proc 데이터에서 chatroom_id를 찾을 수 없습니다`);
      } else {
        logger.warn("proc 데이터가 비어있습니다", {
          procKeys: Object.keys(procData || {})
        });
      }
    } catch (error) {
      logger.error("chatroom_id 추출 중 오류", error);
    }
    return null;
  }

  /**
   * proc 데이터에서 메시지 정보 수집 (backend 패턴 적용)
   */
  private async collectMessages(procData: any): Promise<any[]> {
    const messages: any[] = [];

    try {
      if (procData && Object.keys(procData).length > 0) {
        logger.info(
          `proc 데이터에서 메시지 수집 시작, proc keys: ${Object.keys(procData).length}개`
        );

        // proc 데이터의 모든 키를 순회하며 수치 순으로 정렬
        const sortedKeys = Object.keys(procData).sort(
          (a, b) => parseInt(a) - parseInt(b)
        );
        logger.debug(`proc 데이터 순서: ${sortedKeys.join(", ")}`);

        for (const key of sortedKeys) {
          const procContent = procData[key];

          // proc 내용에서 msg_id 추출
          const msgId = this.extractMsgId(procContent);
          logger.debug(`proc[${key}] msg_id 추출 결과: ${msgId}`);

          if (msgId) {
            // backend에서 실제 메시지 조회 (backend 파일과 Redis Stream 모두 시도)
            const messageData = await this.getMessageFromBackend(msgId);

            // Message Redis에서 Stream 메시지 조회 시도
            const streamMessage = await this.getStreamMessage(msgId);

            messages.push({
              msg_id: msgId,
              proc_index: parseInt(key),
              proc_content: procContent,
              message_data: messageData,
              stream_message: streamMessage,
              timestamp: this.extractTimestamp(procContent)
            });
          } else {
            // msg_id가 없는 경우 proc 내용만 저장
            messages.push({
              msg_id: null,
              proc_index: parseInt(key),
              proc_content: procContent,
              message_data: null,
              stream_message: null,
              timestamp: this.extractTimestamp(procContent)
            });
          }
        }

        logger.info(`메시지 수집 완료: 총 ${messages.length}개`);
      } else {
        logger.warn("비어있는 proc 데이터");
      }
    } catch (error) {
      logger.error("메시지 수집 중 오류", error);
    }

    return messages;
  }

  /**
   * proc 내용에서 msg_id 추출 (backend 패턴 적용)
   */
  private extractMsgId(procContent: string): string | null {
    try {
      if (!procContent || typeof procContent !== "string") {
        return null;
      }

      // JSON 형식인 경우 파싱 시도
      try {
        const parsed = JSON.parse(procContent);
        const msgId =
          parsed.msg_id || parsed.msgId || parsed.message_id || parsed.id;
        if (msgId && typeof msgId === "string") {
          return msgId;
        }
      } catch {
        // JSON이 아닌 경우 정규식으로 추출
      }

      // 다양한 msg_id 패턴 시도 (backend 기반)
      const patterns = [
        /"msg_id"\s*:\s*"([a-f0-9-]{36})"/i, // JSON msg_id
        /"message_id"\s*:\s*"([a-f0-9-]{36})"/i, // JSON message_id
        /msg_id[:\s]*["']?([a-f0-9-]{36})["']?/i, // UUID 형식
        /msgId[:\s]*["']?([a-f0-9-]{36})["']?/i, // camelCase
        /id[:\s]*["']?([a-f0-9-]{36})["']?/i, // 단순 id
        /([a-f0-9-]{36})\s*:\s*\d+/i // Stream key 패턴
      ];

      for (const pattern of patterns) {
        const match = procContent.match(pattern);
        if (match && match[1]) {
          const msgId = match[1];
          // UUID 형식 유효성 간단 검증
          if (msgId.length === 36 && msgId.indexOf("-") !== -1) {
            return msgId;
          }
        }
      }
    } catch (error) {
      logger.debug(`msg_id 추출 실패: ${procContent.substring(0, 100)}...`);
    }

    return null;
  }

  /**
   * backend에서 실제 메시지 데이터 조회 (backend 패턴 적용)
   */
  private async getMessageFromBackend(msgId: string): Promise<any> {
    try {
      logger.debug(`Backend에서 메시지 조회 시도: ${msgId}`);

      // backend의 CHAT_MESSAGES.json 파일에서 메시지 조회
      const backendDbPath = this.getBackendDbPath();
      const messagesFilePath = path.join(backendDbPath, "CHAT_MESSAGES.json");

      logger.debug(`메시지 파일 경로: ${messagesFilePath}`);

      if (await this.fileExists(messagesFilePath)) {
        const messagesData = await fs.promises.readFile(
          messagesFilePath,
          "utf8"
        );
        const messages = JSON.parse(messagesData);

        logger.debug(`전체 메시지 수: ${messages.length}개`);

        // msg_id로 메시지 찾기
        const message = messages.find((msg: any) => msg.id === msgId);

        if (message) {
          logger.debug(`Backend에서 메시지 발견: ${msgId}`);
          return {
            id: message.id,
            sessionId: message.sessionId,
            userId: message.userId,
            role: message.role,
            content: message.content,
            status: message.status,
            createdAt: message.createdAt
          };
        } else {
          logger.debug(`Backend에서 msg_id ${msgId}를 찾을 수 없습니다`);
          return null;
        }
      } else {
        logger.warn(
          `Backend 메시지 파일을 찾을 수 없습니다: ${messagesFilePath}`
        );
        return null;
      }
    } catch (error) {
      logger.error(`Backend 메시지 조회 중 오류 (msg_id: ${msgId})`, error);
      return null;
    }
  }

  /**
   * Message Redis에서 Stream 메시지 조회 (backend messageRedisClient 패턴 완전 적용)
   */
  private async getStreamMessage(msgId: string): Promise<any> {
    try {
      logger.debug(`Message Redis에서 Stream 메시지 조회: ${msgId}`);

      const messageRedis = this.stageRedis;

      // Stream key는 msgId와 동일 (backend와 동일)
      const streamKey = msgId;

      // 키 타입 확인
      const keyType = await messageRedis.type(streamKey);
      logger.debug(`Stream key ${streamKey} 타입: ${keyType}`);

      if (keyType === "stream") {
        // XRANGE로 모든 메시지 조회 (backend와 동일)
        const messages = await messageRedis.xrange(streamKey, "-", "+");
        logger.debug(
          `Stream ${streamKey}에서 조회된 메시지 수: ${messages ? messages.length : 0}`
        );

        if (messages && messages.length > 0) {
          // 모든 메시지 조각을 조합 (backend getCompleteStreamMessage 로직 동일)
          let fullMessage = "";
          for (const [entryId, fields] of messages) {
            if (fields && fields.length >= 2 && fields[0] === "m") {
              fullMessage += fields[1];
            }
          }

          logger.debug(
            `Stream 메시지 조합 완료: ${msgId} -> 길이: ${fullMessage.length}글자`
          );

          return {
            streamKey,
            messageCount: messages.length,
            fullMessage: fullMessage.length > 0 ? fullMessage : null,
            preview:
              fullMessage.length > 200
                ? fullMessage.substring(0, 200) + "..."
                : fullMessage,
            entries:
              messages.length <= 10
                ? messages.map(([id, fields]) => ({ id, fields }))
                : `${messages.length} entries (truncated)`
          };
        } else {
          logger.debug(`Stream ${streamKey}에 메시지가 없습니다`);
          return null;
        }
      } else if (keyType === "string") {
        // String 타입인 경우 직접 조회 (fallback)
        const stringValue = await messageRedis.get(streamKey);
        logger.debug(
          `String key ${streamKey} 조회 결과: ${stringValue ? stringValue.length : 0}글자`
        );
        return {
          streamKey,
          type: "string",
          content: stringValue,
          preview:
            stringValue && stringValue.length > 200
              ? stringValue.substring(0, 200) + "..."
              : stringValue
        };
      } else {
        logger.debug(
          `Stream key ${streamKey}이 존재하지 않거나 예상치 못한 타입: ${keyType}`
        );
        return null;
      }
    } catch (error) {
      logger.error(`Stream 메시지 조회 중 오류 (msg_id: ${msgId})`, error);
      return null;
    }
  }

  /**
   * backend db_file 경로 추정
   */
  private getBackendDbPath(): string {
    // orkis-jobs와 orkis-backend가 같은 레벨에 있다고 가정
    const currentDir = process.cwd();
    const projectRoot = path.dirname(currentDir); // workspace/ORKIS
    return path.join(projectRoot, "orkis-backend", "src", "db_file");
  }

  /**
   * 메시지에서 타임스탬프 추출 (있는 경우)
   */
  private extractTimestamp(message: string): string | null {
    try {
      // 타임스탬프 패턴 추출 시도
      const timestampMatch = message.match(
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );
      return timestampMatch ? timestampMatch[0] : null;
    } catch {
      return null;
    }
  }

  /**
   * 데이터를 파일로 저장 (shared_data/{chatroom_id}/일자.json 형식)
   * 배열 방식으로 기존 데이터에 추가
   */
  private async saveToFile(chatId: string, sessionData: any): Promise<void> {
    const today = new Date();
    const dateString = today.toISOString().split("T")[0]; // YYYY-MM-DD 형식

    // chatroom_id가 있으면 사용하고, 없으면 chatId 사용
    const folderName = sessionData.chatroomId || chatId;

    // shared_data/{chatroom_id} 폴더 구조
    const folderPath = path.join(
      process.cwd(),
      this.DATA_ARCHIVE_DIR_PATH,
      folderName
    );
    const fileName = `${dateString}.json`;
    const filePath = path.join(folderPath, fileName);

    // 폴더 생성 (재귀적)
    await this.ensureDirectoryExists(folderPath);

    // 기존 데이터 읽기
    let existingData: any[] = [];
    if (await this.fileExists(filePath)) {
      try {
        const fileContent = await fs.promises.readFile(filePath, "utf8");
        const parsedData = JSON.parse(fileContent);

        // 기존 데이터가 배열이면 그대로 사용, 아니면 배열로 감싸기
        existingData = Array.isArray(parsedData) ? parsedData : [parsedData];

        logger.info(`[${chatId}] 기존 데이터 ${existingData.length}개 발견`);
      } catch (error) {
        logger.warn(`[${chatId}] 기존 파일 읽기 실패, 새로 생성: ${error}`);
        existingData = [];
      }
    }

    // 새로운 세션 데이터 추가
    existingData.push(sessionData);

    // JSON 배열로 저장
    const jsonData = JSON.stringify(existingData, null, 2);
    await fs.promises.writeFile(filePath, jsonData, "utf8");

    logger.info(`[${chatId}] 데이터 파일 저장 완료: ${filePath}`);
    logger.info(
      `사용된 chatroom_id: ${folderName}, 총 세션 수: ${existingData.length}`
    );
  }

  /**
   * Redis 키 타입에 따라 적절한 데이터 수집
   */
  private async collectKeyData(key: string): Promise<any> {
    const redis = this.chatRedis;

    try {
      // 키 타입 확인
      const keyType = await redis.type(key);

      switch (keyType) {
        case "string":
          return await redis.get(key);

        case "hash":
          return await redis.hgetall(key);

        case "list":
          return await redis.lrange(key, 0, -1);

        case "set":
          return await redis.smembers(key);

        case "zset":
          return await redis.zrange(key, 0, -1, "WITHSCORES");

        case "none":
          logger.warn(`키 ${key}가 존재하지 않습니다`);
          return null;

        default:
          logger.warn(`알 수 없는 키 타입: ${keyType} (키: ${key})`);
          return { type: keyType, data: "unsupported" };
      }
    } catch (error) {
      logger.error(`키 ${key} 데이터 수집 중 오류`, error);
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * 디렉토리가 존재하지 않으면 생성
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.promises.access(dirPath);
    } catch {
      // 디렉토리가 존재하지 않으면 생성
      await fs.promises.mkdir(dirPath, { recursive: true });
      logger.info(`디렉토리 생성: ${dirPath}`);
    }
  }

  /**
   * 특정 세션의 데이터 저장 (수동 실행용)
   */
  async archiveSpecificSession(chatId: string): Promise<void> {
    try {
      // 세션 상태 확인
      const statData = (await this.redisService.getSessionStat(
        chatId
      )) as RedisProcessData;

      if (!this.isReadyForArchive(statData)) {
        logger.warn(
          `[${chatId}] 저장 조건 불충족: app_end=${!!statData["0_2"]}, ai_end=${!!statData["1_2"]}, job_end=${!!statData["2_2"]}`
        );
        return;
      }

      await this.archiveSessionData(chatId);
      logger.info(`[${chatId}] 수동 저장 완료`);
    } catch (error) {
      logger.error(`[${chatId}] 수동 저장 중 오류`, error);
    }
  }

  /**
   * 저장된 파일 목록 조회 (새로운 구조: shared_data/{chatroom_id}/일자.json)
   */
  async getArchivedFiles(
    chatroomId?: string,
    dateString?: string
  ): Promise<string[]> {
    const files: string[] = [];
    const basePath = path.join(process.cwd(), "shared_data");

    try {
      if (chatroomId && dateString) {
        // 특정 채팅방, 특정 날짜 파일
        const filePath = path.join(basePath, chatroomId, `${dateString}.json`);
        if (await this.fileExists(filePath)) {
          files.push(filePath);
        }
      } else if (chatroomId) {
        // 특정 채팅방의 모든 파일
        const chatPath = path.join(basePath, chatroomId);
        if (await this.fileExists(chatPath)) {
          const dateFiles = await fs.promises.readdir(chatPath);
          files.push(...dateFiles.map((f) => path.join(chatPath, f)));
        }
      } else {
        // 모든 저장된 파일
        if (await this.fileExists(basePath)) {
          const chatFolders = await fs.promises.readdir(basePath);

          for (const chatFolder of chatFolders) {
            const chatPath = path.join(basePath, chatFolder);
            const stat = await fs.promises.stat(chatPath);

            if (stat.isDirectory()) {
              const dateFiles = await fs.promises.readdir(chatPath);
              files.push(...dateFiles.map((f) => path.join(chatPath, f)));
            }
          }
        }
      }
    } catch (error) {
      logger.error("저장된 파일 목록 조회 중 오류", error);
    }

    return files;
  }

  /**
   * 파일/디렉토리 존재 여부 확인
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
