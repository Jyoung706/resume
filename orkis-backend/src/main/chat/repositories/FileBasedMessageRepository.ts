import { Dao } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { promises as fs } from "fs";
import * as path from "path";
import { ChatMessageBackend as ChatMessage } from "../../types/compatibility";

interface FileMessage {
  msg_id: string;
  proc_index: number;
  proc_content: string;
  message_data: any;
  stream_message: {
    streamKey: string;
    messageCount: number;
    fullMessage: string;
    preview: string;
    timestamp: string;
  } | null;
  timestamp: string | null;
}

interface MessageFile {
  chatId: string;
  chatroomId: string;
  timestamp: string;
  stat: Record<string, string>;
  proc: Record<string, string>;
  messages: FileMessage[];
}

/**
 * 파일 기반 메시지 저장소
 * share/jobs 폴더의 세션별 파일을 읽어 메시지 관리
 *
 * 호출 및 사용여부: 사용됨
 * 호출 위치: MessageRepositoryFactory.getRepository(), ChatSessionService (직접 생성)
 * 사용 위치: ChatMessageService에서 메시지 저장소로 사용
 */
@Dao("FileBasedMessageRepository")
export class FileBasedMessageRepository {
  private readonly BASE_PATH = path.join(process.cwd(), "share", "jobs");

  // [v2.2 Phase 4.7 D13] in-memory 캐시 완전 제거.
  // 사유: HTTP trigger 시기에 archive 가 event-driven 으로 갱신되어 5분 TTL 캐시는
  //       race window stale 을 5분간 고정하는 부작용. Frontend chatMessageStore 가
  //       session-lifetime cache 를 보유해 multi-call 보호. disk read ~10-15ms 측정값은
  //       사용자 체감 없음. clearCache(sessionId) public 메서드는 유지(no-op) — caller
  //       (MessageRepositoryFactory) 보존.

  /**
   * 세션의 모든 메시지 조회 (전체 read).
   *
   * 호출 및 사용여부: 사용됨
   * 호출 위치: ChatMessageService.getSessionMessages() (legacy /chat/sessions/messages)
   *
   * Phase 4.7 신규 Lazy-load 페이지네이션 사용 시 findMessagesByCursor() 호출.
   */
  async findMessagesBySessionId(sessionId: string): Promise<ChatMessage[]> {
    try {
      const result = await this.readArchiveDir(sessionId);
      return result.messages;
    } catch (error) {
      logger.error(
        `[FileBasedMessageRepository] 메시지 조회 오류: ${sessionId}`,
        error
      );
      return [];
    }
  }

  /**
   * Phase 4.7 신규 — chatId 단위 cursor 페이지네이션 메서드.
   *
   * 동작:
   * - cursor 미지정: 가장 최근 archive 부터 chatId N개에 해당하는 메시지 반환
   * - cursor 지정: 그 chatId 보다 더 오래된 archive 부터 chatId N개 반환
   *
   * @returns messages(시간순 asc) + pageInfo(hasOlder, nextCursor 등)
   */
  async findMessagesByCursor(
    sessionId: string,
    options: { limit: number; cursor?: string }
  ): Promise<{
    messages: ChatMessage[];
    pageInfo: {
      limit: number;
      returnedRecords: number;
      returnedMessages: number;
      hasOlder: boolean;
      nextCursor: string | null;
    };
  }> {
    try {
      const result = await this.readArchiveDir(sessionId, {
        chatIdLimit: options.limit,
        beforeChatId: options.cursor
      });

      const oldestChatId =
        result.uniqueChatIds.length > 0
          ? result.uniqueChatIds[result.uniqueChatIds.length - 1]
          : null;

      // hasOlder 판정 — limit 도달 했거나, archive 에 oldestChatId 보다 더 오래된 record 존재
      const hasOlder =
        result.reachedLimit ||
        (oldestChatId !== null &&
          (await this.hasOlderThan(sessionId, oldestChatId)));

      return {
        messages: result.messages,
        pageInfo: {
          limit: options.limit,
          returnedRecords: result.uniqueChatIds.length,
          returnedMessages: result.messages.length,
          hasOlder,
          nextCursor: hasOlder ? oldestChatId : null
        }
      };
    } catch (error) {
      logger.error(
        `[FileBasedMessageRepository] cursor 조회 오류: ${sessionId}`,
        error
      );
      return {
        messages: [],
        pageInfo: {
          limit: options.limit,
          returnedRecords: 0,
          returnedMessages: 0,
          hasOlder: false,
          nextCursor: null
        }
      };
    }
  }

  /**
   * Phase 4.7 신규 — archive 디렉토리 read 공통 helper.
   *
   * @param opts.chatIdLimit  도달 시 read 중단 (페이지네이션 용)
   * @param opts.beforeChatId 이 chatId 보다 더 오래된 record 만 포함 (cursor 용)
   */
  private async readArchiveDir(
    sessionId: string,
    opts?: { chatIdLimit?: number; beforeChatId?: string }
  ): Promise<{
    messages: ChatMessage[];
    uniqueChatIds: string[];
    reachedLimit: boolean;
  }> {
    const sessionPath = path.join(this.BASE_PATH, sessionId);
    const exists = await this.fileExists(sessionPath);
    if (!exists) {
      return { messages: [], uniqueChatIds: [], reachedLimit: false };
    }

    // 날짜 파일 newest → oldest 순서
    const files = await fs.readdir(sessionPath);
    const jsonFilesAsc = files.filter((f) => f.endsWith(".json")).sort();
    const jsonFilesDesc = [...jsonFilesAsc].reverse();

    const allMessages: ChatMessage[] = [];
    const seenChatIds: string[] = [];
    const seenChatIdSet = new Set<string>();
    let reachedLimit = false;
    let cursorPassed = !opts?.beforeChatId; // cursor 미지정 시 처음부터 포함

    for (const file of jsonFilesDesc) {
      const filePath = path.join(sessionPath, file);
      const fileMessages = await this.readMessageFile(filePath, sessionId);

      // chatId 그룹별로 묶기 (같은 chatId 의 메시지들 함께)
      const groups = this.groupByChatId(fileMessages);

      // newest → oldest (chatId timestamp 기준)
      groups.sort((g1, g2) => {
        const t1 = this.groupTimestamp(g1);
        const t2 = this.groupTimestamp(g2);
        return t2 - t1;
      });

      for (const group of groups) {
        const chatId = group[0]?.metadata
          ? (group[0].metadata as any)?.chatId
          : null;
        if (!chatId) continue;

        // cursor 처리 — beforeChatId 와 일치할 때까지 skip, 일치 후부터 포함
        if (!cursorPassed) {
          if (chatId === opts!.beforeChatId) cursorPassed = true;
          continue; // beforeChatId 자체도 skip (cursor 의미: 이 chatId 보다 더 오래된 것)
        }

        if (seenChatIdSet.has(chatId)) continue;

        // limit 도달 검사
        if (
          opts?.chatIdLimit !== undefined &&
          seenChatIdSet.size >= opts.chatIdLimit
        ) {
          reachedLimit = true;
          break;
        }

        seenChatIdSet.add(chatId);
        seenChatIds.push(chatId);
        allMessages.push(...group);
      }

      if (reachedLimit) break;
    }

    // sort: timestamp asc, chatId asc, role(user→assistant), id asc (Phase 4.7 D18)
    const sorted = this.sortMessages(allMessages);

    return {
      messages: sorted,
      uniqueChatIds: seenChatIds,
      reachedLimit
    };
  }

  /**
   * Phase 4.7 — 가장 오래된 chatId 보다 더 오래된 record 가 archive 에 있는가?
   * hasOlder 판정 보조.
   */
  private async hasOlderThan(
    sessionId: string,
    oldestChatId: string
  ): Promise<boolean> {
    const sessionPath = path.join(this.BASE_PATH, sessionId);
    if (!(await this.fileExists(sessionPath))) return false;

    const files = await fs.readdir(sessionPath);
    const jsonFilesAsc = files.filter((f) => f.endsWith(".json")).sort();
    if (jsonFilesAsc.length === 0) return false;

    // 가장 오래된 파일에 oldestChatId 가 없거나, oldestChatId 보다 더 오래된 record 가 있으면 true
    // 단순 구현: 가장 오래된 파일 read 후 oldestChatId 가 그 파일에 있고 그것보다 더 오래된 record 가 있는지 검사
    // 그러나 이는 비싸므로 단순화: 파일 수 > 1 또는 가장 오래된 파일에 oldestChatId 가 아닌 다른 record 있으면 true
    try {
      const oldestFile = path.join(sessionPath, jsonFilesAsc[0]);
      const fileMessages = await this.readMessageFile(oldestFile, sessionId);
      const groups = this.groupByChatId(fileMessages);
      // groups 안에 oldestChatId 가 아닌 다른 record 가 1개라도 있고, 그것이 oldestChatId 보다 더 이른 것이면 true
      // 간단화: oldest file 의 가장 오래된 group chatId 가 oldestChatId 가 아니면 true
      groups.sort((g1, g2) => this.groupTimestamp(g1) - this.groupTimestamp(g2));
      const earliestChatId = groups[0]?.[0]
        ? ((groups[0][0].metadata as any)?.chatId ?? null)
        : null;
      return earliestChatId !== null && earliestChatId !== oldestChatId;
    } catch {
      return false;
    }
  }

  /**
   * Phase 4.7 — 메시지 array 를 chatId 단위로 그룹화.
   */
  private groupByChatId(messages: ChatMessage[]): ChatMessage[][] {
    const groups = new Map<string, ChatMessage[]>();
    for (const m of messages) {
      const chatId = (m.metadata as any)?.chatId ?? "";
      if (!chatId) continue;
      if (!groups.has(chatId)) groups.set(chatId, []);
      groups.get(chatId)!.push(m);
    }
    return Array.from(groups.values());
  }

  private groupTimestamp(group: ChatMessage[]): number {
    // 그룹의 가장 빠른 timestamp 사용
    return Math.min(
      ...group.map((m) => {
        const t = new Date(m.createdAt).getTime();
        return Number.isFinite(t) ? t : 0;
      })
    );
  }

  /**
   * Phase 4.7 D18 — sort 안정성 보조 키 (timestamp, chatId, role, id) asc.
   */
  private sortMessages(messages: ChatMessage[]): ChatMessage[] {
    return messages.sort((a, b) => {
      const tA = new Date(a.createdAt).getTime();
      const tB = new Date(b.createdAt).getTime();
      if (tA !== tB) return tA - tB;
      const cA = (a.metadata as any)?.chatId || "";
      const cB = (b.metadata as any)?.chatId || "";
      if (cA !== cB) return cA.localeCompare(cB);
      if (a.role !== b.role) return a.role === "user" ? -1 : 1;
      return (a.id || "").localeCompare(b.id || "");
    });
  }

  /**
   * 특정 날짜의 메시지 조회
   */
  async findMessagesByDate(
    sessionId: string,
    date: string
  ): Promise<ChatMessage[]> {
    try {
      const filePath = path.join(this.BASE_PATH, sessionId, `${date}.json`);

      const exists = await this.fileExists(filePath);
      if (!exists) {
        // logger.info(
        //   `[FileBasedMessageRepository] 날짜 파일 없음: ${sessionId}/${date}`
        // );
        return [];
      }

      return await this.readMessageFile(filePath, sessionId);
    } catch (error) {
      logger.error(
        `[FileBasedMessageRepository] 날짜별 메시지 조회 오류: ${sessionId}/${date}`,
        error
      );
      return [];
    }
  }

  /**
   * 사용 가능한 날짜 목록 조회
   */
  async getAvailableDates(sessionId: string): Promise<string[]> {
    try {
      const sessionPath = path.join(this.BASE_PATH, sessionId);

      const exists = await this.fileExists(sessionPath);
      if (!exists) {
        return [];
      }

      const files = await fs.readdir(sessionPath);
      const dates = files
        .filter((file) => file.endsWith(".json"))
        .map((file) => file.replace(".json", ""))
        .sort()
        .reverse(); // 최신 날짜 먼저

      return dates;
    } catch (error) {
      logger.error(
        `[FileBasedMessageRepository] 날짜 목록 조회 오류: ${sessionId}`,
        error
      );
      return [];
    }
  }

  /**
   * 페이지네이션을 지원하는 메시지 조회
   */
  async findMessagesPaginated(
    sessionId: string,
    offset: number = 0,
    limit: number = 50
  ): Promise<{ messages: ChatMessage[]; hasMore: boolean; total: number }> {
    try {
      const allMessages = await this.findMessagesBySessionId(sessionId);
      const total = allMessages.length;

      // offset부터 limit만큼 슬라이싱
      const messages = allMessages.slice(offset, offset + limit);
      const hasMore = offset + limit < total;

      return {
        messages,
        hasMore,
        total
      };
    } catch (error) {
      logger.error(
        `[FileBasedMessageRepository] 페이지네이션 조회 오류: ${sessionId}`,
        error
      );
      return { messages: [], hasMore: false, total: 0 };
    }
  }

  /**
   * 메시지 파일 읽기 및 변환
   * chatId 기준으로 질문-답변 쌍을 그룹화하여 반환
   */
  private async readMessageFile(
    filePath: string,
    sessionId: string
  ): Promise<ChatMessage[]> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const rawData = JSON.parse(content);

      // JSON 파일이 배열인 경우 (새로운 형식)
      const dataArray: MessageFile[] = Array.isArray(rawData)
        ? rawData
        : [rawData];

      const allMessages: ChatMessage[] = [];

      // 각 chatId별로 처리
      for (const data of dataArray) {
        const processInfo = this.parseProc(data.proc);

        // chatId를 기준으로 질문-답변 쌍 구성
        // 하나의 chatId는 하나의 대화(질문 1개 + 답변 1개)를 의미
        let userMessage: string | null = null;
        let userTimestamp: string | null = null;
        let aiResponse: string | null = null;
        let aiMessageId: string | null = null;
        let aiTimestamp: string | null = null;
        let aiMetadata: any = {};

        // messages 배열에서 사용자 질문(proc_index=1)과 AI 응답(stream_message) 찾기
        for (const fileMsg of data.messages) {
          // proc_index가 1인 경우 사용자 질문 추출
          if (fileMsg.proc_index === 1 && fileMsg.proc_content) {
            try {
              const procData = JSON.parse(fileMsg.proc_content);
              userMessage = procData.question;
              userTimestamp = fileMsg.timestamp || data.timestamp;
            } catch (e) {
            }
          }

          // stream_message가 있는 경우 AI 응답 - 마지막 것만 사용해야 함
          if (fileMsg.stream_message?.fullMessage) {
            aiResponse = fileMsg.stream_message.fullMessage;
            aiMessageId = fileMsg.msg_id || `${data.chatId}_assistant`;
            aiTimestamp = fileMsg.stream_message.timestamp || data.timestamp;
          }
        }

        // 완료 코드 확인 (proc_index 9000~9004)
        // 9000: 정상 종료, 9001: 사용자 취소, 9002: 서버 종료, 9003: AI 오류, 9004: RAG 프리프로세싱
        let completionCode: number | null = null;
        let completionTimestamp: string | null = null;

        for (const fileMsg of data.messages) {
          if (fileMsg.proc_index >= 9000 && fileMsg.proc_index <= 9004) {
            completionCode = fileMsg.proc_index;
            // 완료 코드의 타임스탬프 추출
            if (fileMsg.proc_content) {
              try {
                const procData = JSON.parse(fileMsg.proc_content);
                if (procData.timestamp) {
                  completionTimestamp = new Date(
                    procData.timestamp * 1000
                  ).toISOString();
                }
              } catch (e) {
                // 파싱 실패 시 무시
              }
            }
            break;
          }
        }

        // AI 응답이 있으면 메타데이터 생성 (루프 밖에서 한 번만)
        if (aiResponse) {
          const isSqlType = processInfo.questionType === "sql";

          // metadata에는 processes를 포함하지 않음 (실시간 메시지와 구분하기 위해)
          // 로드된 메시지는 별도 필드(sqlSteps)로 processes를 전달
          aiMetadata = {
            chatId: data.chatId,
            questionType: processInfo.questionType, // 항상 포함 (general 또는 sql)
            finalStatus: processInfo.finalStatus,
            ...(completionCode !== null && { completionCode })
          };
        }

        // 질문이 있으면 사용자 메시지 추가
        if (userMessage) {
          allMessages.push({
            id: `${data.chatId}_user`,
            sessionId,
            content: userMessage,
            role: "user",
            createdAt: userTimestamp || data.timestamp,
            updatedAt: userTimestamp || data.timestamp,
            metadata: {
              chatId: data.chatId
            }
          });
        } else if (aiResponse) {
          // [v2.2 Phase 4.7 D17] cron-era archive (proc_index=0 에 i 필드, =1 에 s 필드)
          // 에서는 reader 가 user 질문을 추출하지 못함. 답변만 화면에 표출되면 사용자
          // 혼란("왜 답변만 있고 질문이 없지?") 유발. legacy placeholder user 메시지를
          // prepend 하여 시각적 구분 (Frontend 가 isLegacyPlaceholder=true 시 회색/italic).
          allMessages.push({
            id: `${data.chatId}_user_legacy`,
            sessionId,
            content: "(이전 시기 채팅 — 질문 미보존)",
            role: "user",
            createdAt: data.timestamp,
            updatedAt: data.timestamp,
            metadata: {
              chatId: data.chatId,
              isLegacyPlaceholder: true
            }
          });
        }

        // AI 응답이 있으면 어시스턴트 메시지 추가
        if (aiResponse) {
          // SQL 쿼리 결과 정보 추출
          let sqlResult: any = undefined;
          if (processInfo.questionType === "sql") {
            // stat 필드에서 SQL 결과 정보 추출 시도
            const sqlData = this.extractSqlResultFromStat(data.stat);
            if (sqlData) {
              sqlResult = {
                type: "sql",
                columns: sqlData.columns || [],
                data: sqlData.data || [],
                sqlQuery: sqlData.sqlQuery || "",
                title: sqlData.title,
                subtitle: sqlData.subtitle,
                metadata: {
                  query: sqlData.sqlQuery || ""
                }
              };
            }
          }

          const assistantMessage: any = {
            id: aiMessageId || `${data.chatId}_assistant`,
            sessionId,
            content: aiResponse,
            role: "assistant" as "assistant",
            createdAt: aiTimestamp || data.timestamp,
            updatedAt: aiTimestamp || data.timestamp,
            metadata: aiMetadata
          };

          if (
            processInfo.questionType === "sql" &&
            processInfo.processes &&
            processInfo.processes.length > 0
          ) {
            assistantMessage.sqlSteps = processInfo.processes;
          }

          // SQL 결과가 있으면 result 필드 추가
          if (sqlResult) {
            assistantMessage.result = sqlResult;
          }

          // 특정 chatId 디버깅
          if (data.chatId === "0199e16d-d0e7-7dac-9322-c5229b146367") {
          }

          allMessages.push(assistantMessage);
        } else if (userMessage && !aiResponse) {
          // AI 응답이 없고 사용자 질문만 있는 경우: "중지됨" 상태의 assistant 메시지 추가
          // 완료 코드가 있으면 해당 시간을, 없으면 파일 타임스탬프 사용
          const stoppedAt = completionTimestamp || data.timestamp;

          // 완료 코드에 따른 중지 메시지 결정
          let stoppedMessage = "";
          switch (completionCode) {
            case 9001:
              stoppedMessage = "사용자 에 의해 응답이 중지 되었습니다."; // 사용자 취소
              break;
            case 9002:
              stoppedMessage = "서버가 종료되어 응답이 중단되었습니다.";
              break;
            case 9003:
              stoppedMessage = "AI 서버 오류로 응답이 중단되었습니다.";
              break;
            case 9004:
              stoppedMessage = "RAG 처리 중 중단되었습니다.";
              break;
            default:
              stoppedMessage = ""; // 기본 중지 메시지
          }

          const stoppedAssistantMessage: any = {
            id: `${data.chatId}_assistant`,
            sessionId,
            content: stoppedMessage,
            role: "assistant" as "assistant",
            createdAt: stoppedAt || data.timestamp,
            updatedAt: stoppedAt || data.timestamp,
            // 9001: 사용자 취소 (노란색 경고), 9002/9003/9004: 에러 (빨간색)
            isStopped: completionCode === 9001,
            isError:
              completionCode !== null &&
              completionCode >= 9002 &&
              completionCode <= 9004,
            stoppedAt: stoppedAt,
            metadata: {
              chatId: data.chatId,
              questionType: processInfo.questionType || "general",
              completionCode: completionCode
            }
          };

          allMessages.push(stoppedAssistantMessage);
        }
      }
      return allMessages;
    } catch (error) {
      logger.error(
        `[FileBasedMessageRepository] 파일 읽기 오류: ${filePath}`,
        error
      );
      return [];
    }
  }

  /**
   * 파일/폴더 존재 확인
   */
  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * [v2.2 Phase 4.7 D13] 캐시 제거됨 — 본 메서드는 외부 caller(MessageRepositoryFactory)
   * 호환을 위해 보존되며 no-op 으로 동작.
   */
  clearCache(_sessionId?: string): void {
    // no-op: 캐시 제거됨 (Phase 4.7)
  }

  /**
   * 메시지 생성 (파일에 추가)
   */
  async createMessage(message: ChatMessage): Promise<ChatMessage> {
    // 현재는 읽기 전용으로 구현
    // AI 서버가 파일을 생성하므로 백엔드에서는 읽기만 수행
    return message;
  }

  /**
   * proc 필드에서 프로세스 정보 추출
   * @param proc - 파일의 proc 객체
   * @returns 프로세스 정보 (questionType, processes, finalStatus)
   */
  private parseProc(proc: Record<string, string> | undefined): {
    questionType: "general" | "sql";
    processes?: Array<{
      id: string;
      label: string;
      status: "pending" | "processing" | "success" | "error";
      percentage?: string;
    }>;
    finalStatus: "success" | "error" | "partial";
  } {
    try {
      // logger.debug(`[parseProc] Started - checking proc field:`, {
      //   hasProc: !!proc,
      //   hasProcField2: !!(proc && proc["2"]),
      //   procKeys: proc ? Object.keys(proc) : []
      // });

      // proc가 없거나 proc["2"]가 없으면 일반 질문으로 처리
      if (!proc || !proc["2"]) {
        return { questionType: "general", finalStatus: "success" };
      }

      // proc["2"]가 문자열이면 파싱, 이미 객체면 그대로 사용
      let procDef;
      if (typeof proc["2"] === "string") {
        procDef = JSON.parse(proc["2"]);
      } else {
        procDef = proc["2"];
      }

      // logger.debug(`[parseProc] procDef:`, procDef);

      // 일반 질문: [{"0": "general"}]
      if (Array.isArray(procDef) && procDef.length > 0) {
        const firstProc = procDef[0];
        const firstValue = Object.values(firstProc)[0];

        // logger.debug(`[parseProc] firstValue: ${firstValue}`);

        if (firstValue === "general") {
          // logger.debug(`[parseProc] Detected as GENERAL`);
          return { questionType: "general", finalStatus: "success" };
        }

        // SQL 프로세스: [{"0": "generate_hint"}, {"1": "schema_linking"}, ...]
        const sqlProcessIds = [
          "generate_hint",
          "schema_linking",
          "generate_sql",
          "evaluate"
        ];
        if (sqlProcessIds.includes(firstValue as string)) {
          // 프로세스 라벨 매핑
          const processLabels: Record<string, string> = {
            generate_hint: "Hint",
            schema_linking: "스키마",
            generate_sql: "SQL",
            evaluate: "검증"
          };

          // 각 프로세스의 실제 상태를 proc 필드에서 확인
          const processes = procDef.map((item: any, processIndex: number) => {
            const processId = Object.values(item)[0] as string;
            const label = processLabels[processId] || processId;

            // 이 프로세스의 최종 상태 찾기
            let latestStat = 0; // 기본값: pending
            let latestKey = -1; // 가장 큰 키 번호

            // proc의 모든 항목을 순회하여 이 프로세스(processIndex)의 최신 상태 찾기
            // 키를 숫자로 변환하여 가장 큰 키의 값을 사용
            for (const key in proc) {
              const keyNum = parseInt(key, 10);
              if (keyNum >= 3) {
                // proc["3"] 이후 항목만 확인
                try {
                  const statusInfo = JSON.parse(proc[key]);
                  if (statusInfo.id === processIndex) {
                    // 더 큰 키 번호를 가진 상태만 업데이트
                    if (keyNum > latestKey) {
                      latestKey = keyNum;
                      latestStat = statusInfo.stat;
                    }
                  }
                } catch (e) {
                  // JSON 파싱 실패 시 무시
                }
              }
            }

            // latestStat 값에 따라 상태 설정
            // stat: 0=pending, 1=success, 2=processing, -1=error
            let status: "pending" | "processing" | "success" | "error";
            let percentage: string;

            switch (latestStat) {
              case 1:
                status = "success";
                percentage = "100";
                break;
              case 2:
                status = "processing";
                percentage = "50";
                break;
              case -1:
                status = "error";
                percentage = "0";
                break;
              default:
                status = "pending";
                percentage = "0";
            }

            return {
              id: processId,
              label,
              status,
              percentage
            };
          });

          // finalStatus 결정: 하나라도 에러가 있으면 error, 모두 성공이면 success, 그 외 partial
          const hasError = processes.some((p) => p.status === "error");
          const allSuccess = processes.every((p) => p.status === "success");

          // logger.debug(`[parseProc] SQL process parsing completed:`, {
          //   questionType: "sql",
          //   processesLength: processes.length,
          //   processes,
          //   finalStatus: hasError ? "error" : allSuccess ? "success" : "partial"
          // });

          return {
            questionType: "sql",
            processes,
            finalStatus: hasError ? "error" : allSuccess ? "success" : "partial"
          };
        }
      }

      // 파싱 실패 시 기본값
      return { questionType: "general", finalStatus: "success" };
    } catch (error) {
      return { questionType: "general", finalStatus: "success" };
    }
  }

  /**
   * 메시지 ID로 특정 메시지 조회
   */
  async findMessageById(messageId: string): Promise<ChatMessage | undefined> {
    try {
      // 모든 캐시된 세션에서 메시지 검색
      // [v2.2 Phase 4.7] 캐시 제거됨

      // 캐시에 없으면 파일 시스템 전체 검색 (비효율적이므로 경고)
      // share/jobs 폴더의 모든 세션 검색
      const sessionsPath = this.BASE_PATH;
      const exists = await this.fileExists(sessionsPath);
      if (!exists) {
        return undefined;
      }

      const sessionDirs = await fs.readdir(sessionsPath);

      for (const sessionDir of sessionDirs) {
        const sessionPath = path.join(sessionsPath, sessionDir);
        const stat = await fs.stat(sessionPath);

        if (stat.isDirectory()) {
          const messages = await this.findMessagesBySessionId(sessionDir);
          const found = messages.find((msg) => msg.id === messageId);
          if (found) {
            return found;
          }
        }
      }

      return undefined;
    } catch (error) {
      logger.error(
        `[FileBasedMessageRepository] 메시지 ID 조회 오류: ${messageId}`,
        error
      );
      return undefined;
    }
  }

  /**
   * 메시지 메타데이터 업데이트
   * 파일 기반 시스템에서는 읽기 전용이므로 업데이트 불가
   */
  async updateMessageMetadata(
    messageId: string,
    metadata: any
  ): Promise<ChatMessage | null> {
    // 메시지는 조회해서 반환 (업데이트는 되지 않음)
    const message = await this.findMessageById(messageId);
    return message || null;
  }

  /**
   * 세션의 모든 메시지 삭제
   * 파일 기반 시스템에서는 읽기 전용이므로 삭제 불가
   */
  async deleteMessagesBySessionId(sessionId: string): Promise<boolean> {
    // 캐시만 초기화
    this.clearCache(sessionId);
    return false;
  }

  /**
   * stat 필드에서 SQL 결과 정보 추출
   * @param stat - 파일의 stat 객체
   * @returns SQL 결과 정보 (columns, data, sqlQuery 등)
   */
  private extractSqlResultFromStat(stat: Record<string, string> | undefined): {
    columns?: string[];
    data?: any[];
    sqlQuery?: string;
    title?: string;
    subtitle?: string;
  } | null {
    try {
      if (!stat || Object.keys(stat).length === 0) {
        return null;
      }

      // stat에서 SQL 관련 정보 찾기
      // stat 구조: {"0": "...", "1": "...", ...}
      // 일반적으로 SQL 쿼리는 stat["6"] 또는 stat["7"]에 있을 수 있음
      let sqlQuery: string | undefined;
      let columns: string[] | undefined;
      let data: any[] | undefined;

      // stat의 모든 키를 순회하며 SQL 관련 정보 추출
      for (const key in stat) {
        try {
          const value = stat[key];

          // JSON 형식인 경우 파싱 시도
          if (
            value &&
            typeof value === "string" &&
            (value.startsWith("{") || value.startsWith("["))
          ) {
            const parsed = JSON.parse(value);

            // SQL 쿼리 추출
            if (parsed.query || parsed.sql || parsed.sqlQuery) {
              sqlQuery = parsed.query || parsed.sql || parsed.sqlQuery;
            }

            // 컬럼 정보 추출
            if (parsed.columns && Array.isArray(parsed.columns)) {
              columns = parsed.columns;
            }

            // 데이터 추출
            if (parsed.data && Array.isArray(parsed.data)) {
              data = parsed.data;
            } else if (parsed.rows && Array.isArray(parsed.rows)) {
              data = parsed.rows;
            }
          }

          // SQL 쿼리 패턴 매칭 (SELECT, INSERT, UPDATE, DELETE 등)
          if (
            !sqlQuery &&
            value &&
            typeof value === "string" &&
            /^\s*(SELECT|INSERT|UPDATE|DELETE|WITH)/i.test(value)
          ) {
            sqlQuery = value.trim();
          }
        } catch (e) {
          // 파싱 실패는 무시
        }
      }

      // SQL 쿼리가 있으면 결과 반환
      if (sqlQuery || (columns && data)) {
        return {
          sqlQuery,
          columns,
          data,
          title: data && data.length > 0 ? "SQL 쿼리 실행 결과" : undefined,
          subtitle: data ? `(${data.length}건 조회)` : undefined
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * [v2.2 Phase 4.7] 캐시 제거됨 — getCacheStats 는 호환을 위해 빈 stats 반환.
   */
  getCacheStats(): { size: number; sessions: string[] } {
    return { size: 0, sessions: [] };
  }
}
