import { Autowired, Service } from "@orkis/core/common";
import logger, { SSEStream } from "@orkis/core/utils";
import { promises as fs } from "fs";
import * as path from "path";
import { ChatStreamContext, type ChatStreamEntry } from "./ChatStreamContext";
import { ChatSessionRepositoryFactory } from "./repositories/ChatSessionRepositoryFactory";
import { QueryExecutionService } from "@/query/QueryExecutionService";
import { LLMModelService } from "@/llm/services/LLMModelService";
import { FileBasedMessageRepository } from "@/chat/repositories/FileBasedMessageRepository";

// desktop 전용 채팅 스트림 서비스 (cloud FetchStreamService 의 desktop 등가).
//
// cloud: AI 가 chatRedis/stageRedis stream 에 쓰고 FetchStreamService 가 폴링해
//        message_stream 이벤트로 변환 → frontend SSE.
// desktop: backend 가 AI /chat/start SSE 를 직접 구독(Redis 제거)하고 같은
//        message_stream 이벤트 계약으로 frontend 에 forward.
//        → frontend(streamManager)는 cloud/desktop 무분기.
//
// 비즈니스 로직은 전부 backend 처리 (사용자 결정):
// - 메시지 영속화: share/jobs/{sessionId}/{날짜}.json (cloud data-archive 호환 포맷)
// - 세션 제목: AI raw:chat:title → ChatSessionSqliteRepository.updateSessionTitle
//   (cloud ChatAIServerService 동형 — titleModified 미전달로 사용자 수정 플래그 보존)
// - SQL 실행: QueryExecutionService.executeRealQuery (desktop query 도메인 재사용)
//
// tmp/desktop ChatStreamService 와의 차이 (구 frontend 계약 → 현 계약):
// - 개별 이벤트(chat:token 등) → 단일 "message_stream" + {chatId, type, payload}
// - step stat 의 {0→1, 1→2} 변환 제거 — 현 frontend statToStatus 가
//   AI 원본 스케일(0=running, 1=completed, -1=error)을 기대
// - SQL 실행 실패 시 completionCode 를 9003 으로 바꾸지 않음 — cloud 동형으로
//   result.error 전달 + complete 정상 송신 (frontend 가 result.error 를 표시)
@Service("ChatStreamService")
export class ChatStreamService {
  @Autowired("ChatStreamContext")
  private chatStreamContext!: ChatStreamContext;

  @Autowired("ChatSessionRepositoryFactory")
  private sessionRepositoryFactory!: ChatSessionRepositoryFactory;

  @Autowired("QueryExecutionService")
  private queryExecutionService!: QueryExecutionService;

  @Autowired("LLMModelService")
  private llmModelService!: LLMModelService;

  @Autowired("FileBasedMessageRepository")
  private messageRepository!: FileBasedMessageRepository;

  // cloud FileBasedMessageRepository.BASE_PATH 와 동일 규칙 (조회 갈래가 같은 경로를 읽음).
  // 컨테이너에서 /app/share 는 host dataDir/share 볼륨 마운트로 영속 (orkis-desktop 57a295d).
  private readonly BASE_PATH = path.join(process.cwd(), "share", "jobs");

  // chatId → SSE stream 매핑. sendEvent 호출 시 chatId 로 lookup.
  private sseMap = new Map<string, SSEStream>();

  /**
   * frontend 로 message_stream 이벤트 forward (cloud FetchStreamService.sendEvent 동형).
   */
  private sendEvent(
    chatId: string,
    type: string,
    payload: Record<string, unknown>
  ): void {
    const sse = this.sseMap.get(chatId);
    if (!sse) return;
    try {
      sse.send({
        event: "message_stream",
        data: JSON.stringify({ chatId, type, payload })
      });
    } catch (error) {
      logger.error(`[ChatStreamService] SSE 전송 에러 - ${chatId}:`, error);
    }
  }

  /**
   * Chat SSE 스트림 — AI /chat/start SSE 구독 + 비즈니스 로직 + frontend forward.
   */
  async streamChat(
    body: Record<string, unknown>,
    sse: SSEStream,
    userId: string
  ): Promise<void> {
    const chatId = String(body.chatId);
    const sessionId = String(body.sessionId || "");
    const content = String(body.content || "");
    const dbId = body.dbId ? String(body.dbId) : undefined;
    const connectionId = body.connectionId
      ? String(body.connectionId)
      : undefined;

    // sse 등록 + cleanup
    this.sseMap.set(chatId, sse);
    sse.onClose(() => this.sseMap.delete(chatId));

    // 첫 메시지 판단 (cloud ChatAIServerService 동형) → AI 제목 생성 트리거
    let generateTitle = false;
    try {
      const session = await this.sessionRepositoryFactory
        .getInstance()
        .findSessionById(sessionId);
      generateTitle =
        !session || (session.messageCount === 0 && !session.titleModified);
    } catch (err) {
      logger.warn(`[ChatStreamService] 세션 조회 실패 - ${sessionId}:`, err);
    }

    // LLM 모델/apiKey resolve (cloud ChatAIServerService 동형 — env 폴백 없음,
    // llm_user_models 단일 진실 원천). body.modelId 는 DB 레코드 id 이므로
    // AI 에는 resolved.modelName(gpt-4o 등 모델명)을 전달해야 한다.
    const requestedModelId = body.modelId ? String(body.modelId) : "";
    const resolved = requestedModelId
      ? await this.llmModelService.resolveByIdForInternal(
          userId,
          requestedModelId
        )
      : await this.llmModelService.resolveDefaultForInternal(userId);
    if (!resolved) {
      this.sendEvent(chatId, "error", {
        message:
          "사용할 LLM 모델이 설정되지 않았습니다. 설정에서 모델을 등록해주세요.",
        code: 9003,
        errorCode: "MODEL_NOT_CONFIGURED"
      });
      this.sseMap.delete(chatId);
      return;
    }
    const modelName = resolved.modelName;
    const apiKey = resolved.apiKey;

    // chat stream 상태 등록
    this.chatStreamContext.register(
      chatId,
      sessionId,
      userId,
      content,
      dbId,
      connectionId
    );

    // AI SSE 구독
    const aiUrl = process.env.RAG_SERVER_URL || "http://localhost:8000";
    let response: Response;
    try {
      response = await fetch(`${aiUrl}/chat/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream"
        },
        body: JSON.stringify({
          chatId,
          sessionId,
          content,
          modelId: modelName,
          apiKey,
          dbId,
          generateTitle
        })
      });
    } catch (err) {
      logger.error(`[ChatStreamService] AI fetch 에러 - ${chatId}`, err);
      this.onError({
        chatId,
        code: 9003,
        message: "AI 서버에 연결할 수 없습니다."
      });
      return;
    }

    if (!response.ok || !response.body) {
      logger.error(
        `[ChatStreamService] AI 응답 에러 - ${chatId}, status: ${response.status}`
      );
      this.onError({
        chatId,
        code: 9003,
        message: `AI 서버 응답 오류 (${response.status})`
      });
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const eventLine of events) {
          if (!eventLine.startsWith("data: ")) continue;
          let parsed: { event: string; data: Record<string, unknown> };
          try {
            parsed = JSON.parse(eventLine.slice(6));
          } catch (err) {
            logger.error(`[ChatStreamService] parse 에러 - ${chatId}`, err);
            continue;
          }

          // AI 이벤트(raw:chat:*) → 비즈니스 로직 + frontend forward
          switch (parsed.event) {
            case "raw:chat:type":
              this.onChatType(parsed.data);
              break;
            case "raw:chat:token":
              this.onToken(parsed.data);
              break;
            case "raw:chat:steps":
              this.onSteps(parsed.data);
              break;
            case "raw:chat:step:update":
              this.onStepUpdate(parsed.data);
              break;
            case "raw:chat:complete":
              await this.onComplete(parsed.data);
              break;
            case "raw:chat:title":
              await this.onTitleUpdate(parsed.data);
              break;
            case "raw:chat:error":
              this.onError(parsed.data);
              break;
            case "raw:chat:llm:start":
              this.onLlmStart(parsed.data);
              break;
            case "raw:chat:llm:end":
              this.onLlmEnd(parsed.data);
              break;
            default:
              logger.debug(
                `[ChatStreamService] unhandled event: ${parsed.event}`
              );
          }
        }
      }
    } catch (err) {
      logger.error(`[ChatStreamService] stream read 에러 - ${chatId}`, err);
      this.onError({ chatId, code: 9003, message: String(err) });
    } finally {
      this.sseMap.delete(chatId);
    }
  }

  /**
   * Chat 취소 — AI 에 cancel 전파. AI 가 CHAT_COMPLETE(9001) 를 emit 하면
   * streamChat 의 reader 루프가 onComplete 에서 부분 메시지를 영속화한다.
   */
  async cancelChat(chatId: string): Promise<void> {
    const aiUrl = process.env.RAG_SERVER_URL || "http://localhost:8000";
    try {
      await fetch(`${aiUrl}/chat/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId })
      });
    } catch (err) {
      logger.error(`[ChatStreamService] cancel 에러 - ${chatId}`, err);
    }
  }

  onChatType(data: Record<string, unknown>): void {
    const chatId = String(data.chatId);
    const chatType = String(data.chatType || "general");
    this.chatStreamContext.setChatType(chatId, chatType);
    this.sendEvent(chatId, "chat_type", { type: chatType });
  }

  onToken(data: Record<string, unknown>): void {
    const chatId = String(data.chatId);
    const token = String(data.token || "");
    const msgId = data.msgId ? String(data.msgId) : null;
    const entry = this.chatStreamContext.get(chatId);

    if (token) {
      // 기존 단일 tokens 배열 (step:update 리셋 대상, fallback용)
      this.chatStreamContext.appendToken(chatId, token);
      // msg_id 있으면 LLM 호출별 분리 저장 (Cloud {msg_id} stream 대응)
      if (msgId) {
        this.chatStreamContext.appendMsgToken(chatId, msgId, token);
      }
    }
    this.sendEvent(chatId, "content", {
      chunk: token,
      contentType: entry?.chatType || "general",
      isComplete: false
    });
  }

  onLlmStart(data: Record<string, unknown>): void {
    const chatId = String(data.chatId);
    const msgId = data.msgId ? String(data.msgId) : null;
    const procId = typeof data.procId === "number" ? data.procId : null;
    if (msgId) {
      this.chatStreamContext.startMsg(chatId, msgId, procId);
    }
  }

  onLlmEnd(data: Record<string, unknown>): void {
    const chatId = String(data.chatId);
    const msgId = data.msgId ? String(data.msgId) : null;
    if (msgId) {
      this.chatStreamContext.endMsg(chatId, msgId);
    }
  }

  onSteps(data: Record<string, unknown>): void {
    const chatId = String(data.chatId);
    const steps = data.steps;
    if (Array.isArray(steps)) {
      // step:update 의 id 와 매칭되도록 id 문자열 정규화
      const normalizedSteps = steps.map((step: any) => ({
        ...step,
        id: String(step.id)
      }));
      // AI 원본 steps 정의를 Context에 저장 (persistMessage에서 proc[2]로 사용)
      this.chatStreamContext.setSteps(
        chatId,
        steps as Array<Record<string, unknown>>
      );
      this.sendEvent(chatId, "steps", { steps: normalizedSteps });
    }
  }

  onStepUpdate(data: Record<string, unknown>): void {
    const chatId = String(data.chatId);

    // AI stat:0(단계 시작) 시점에 이전 단계 토큰 버퍼 리셋
    // (여러 LLM 호출 출력이 concat되어 content가 깨지는 문제 해결)
    if (Number(data.stat) === 0 && data.chatId) {
      this.chatStreamContext.resetTokens(chatId);
    }

    // 시계열 proc 이벤트 기록 (AI stat 원본 값 그대로 보존)
    if (typeof data.id !== "undefined" && typeof data.stat !== "undefined") {
      this.chatStreamContext.appendProcEvent(chatId, {
        id: Number(data.id),
        stat: Number(data.stat),
        timestamp: new Date().toISOString()
      });
    }

    // stat 은 AI 원본 그대로 전달 — frontend statToStatus 가
    // {0: running, 1: completed, -1: error} 매핑을 담당 (cloud 동형)
    this.sendEvent(chatId, "step", {
      id: data.id !== undefined ? String(data.id) : undefined,
      s: data.s !== undefined ? String(data.s) : undefined,
      stat: Number(data.stat)
    });
  }

  async onComplete(data: Record<string, unknown>): Promise<void> {
    const chatId = String(data.chatId);
    const code = Number(data.code || 9000);
    const sqlQuery = data.sqlQuery ? String(data.sqlQuery) : null;

    const entry = this.chatStreamContext.remove(chatId);
    // 이력 조회 시 extractSqlResultFromStat이 SQL 결과를 복원할 수 있도록
    // 실행 결과를 stat 객체에 영속화 (Cloud {chat_id}:stat hash 대응)
    const persistStat: Record<string, string> = {};

    if (entry && entry.sessionId) {
      // 1) SQL 실행 (SQL 질문인 경우) — cloud handleCompletion 동형:
      //    실행 실패는 result.error 로 전달하고 complete 는 정상 송신
      if (entry.chatType === "sql") {
        let columns: string[] = [];
        let rows: Array<Record<string, unknown>> = [];
        let executionTime: number | undefined;
        let queryError: string | undefined;

        if (sqlQuery && entry.connectionId) {
          try {
            const result = await this.queryExecutionService.executeRealQuery(
              sqlQuery,
              undefined,
              parseInt(entry.connectionId),
              undefined,
              entry.userId
            );
            columns = result.columns;
            rows = result.data;
            executionTime = result.executionTime;
            // stat["result"]: 새로고침 후 이력 로드 시 결과 테이블 복원용
            persistStat["result"] = JSON.stringify({
              sqlQuery,
              columns,
              data: rows,
              executionTime,
              rowCount: rows.length
            });
            logger.info(
              `[ChatStreamService] SQL exec ok - ${chatId} (${rows.length} rows)`
            );
          } catch (err: any) {
            logger.error(`[ChatStreamService] SQL exec fail - ${chatId}`, err);
            queryError =
              err?.message || "SQL 쿼리 실행 중 오류가 발생했습니다";
          }
        } else {
          if (!sqlQuery) queryError = "SQL 쿼리를 추출할 수 없습니다";
          else queryError = "데이터베이스가 선택되지 않았습니다";
        }

        this.sendEvent(chatId, "result", {
          type: "sql",
          sqlQuery: sqlQuery || "",
          columns,
          data: rows,
          rowCount: rows.length,
          executionTime,
          queryTitle: queryError ? "SQL 쿼리 실행 실패" : "SQL 쿼리 실행 결과",
          querySubtitle:
            queryError ||
            (rows.length > 0 ? `(${rows.length}건 조회됨)` : "(결과 없음)"),
          error: queryError
        });
      } else {
        // General 타입 — 마지막 msg(LLM 호출별 분리 저장)를 최종 답변으로 사용
        const lastMsg =
          entry.msgOrder.length > 0
            ? entry.msgs.get(entry.msgOrder[entry.msgOrder.length - 1])
            : null;
        const fullMessage = lastMsg
          ? lastMsg.tokens.join("")
          : entry.tokens.join("");
        if (fullMessage) {
          this.sendEvent(chatId, "result", {
            type: "general",
            content: fullMessage
          });
        }
      }

      // 2) 메시지 영속화
      try {
        await this.persistMessage(entry, code, sqlQuery, persistStat);
      } catch (err) {
        logger.error(`[ChatStreamService] persist fail - ${chatId}`, err);
      }
    }

    // 3) 에러 또는 완료 이벤트 (cloud handleCompletion 동형)
    if (code >= 9002) {
      const errorCodeMessages: Record<number, string> = {
        9002: "백엔드 서버가 종료되었습니다.",
        9003: "AI 서버 처리 중 오류가 발생했습니다."
      };
      this.sendEvent(chatId, "error", {
        message:
          errorCodeMessages[code] || `처리 실패 (코드: ${code})`,
        code,
        errorCode: `PROCESS_ERROR_${code}`
      });
    } else {
      this.sendEvent(chatId, "complete", {
        cancelled: code === 9001,
        completionCode: code
      });
    }
  }

  async onTitleUpdate(data: Record<string, unknown>): Promise<void> {
    const chatId = String(data.chatId || "");
    const sessionId = data.sessionId ? String(data.sessionId) : "";
    const title = data.title ? String(data.title).replace(/^"|"$/g, "") : "";
    if (!sessionId || !title) return;

    try {
      // titleModified 미전달 — AI 자동 제목은 사용자 수정 플래그를 세우지 않음
      // (cloud ChatAIServerService.updateSessionTitle 호출 동형)
      await this.sessionRepositoryFactory
        .getInstance()
        .updateSessionTitle(sessionId, title);
      logger.info(`[ChatStreamService] title persisted - ${sessionId}: ${title}`);
    } catch (err) {
      logger.error(`[ChatStreamService] title persist fail - ${sessionId}`, err);
    }

    // DB 저장 후 정규화된 제목 전달
    this.sendEvent(chatId, "title_update", { title, sessionId });
  }

  onError(data: Record<string, unknown>): void {
    const chatId = String(data.chatId);
    const code = Number(data.code || 9003);

    const entry = this.chatStreamContext.remove(chatId);
    if (entry && entry.sessionId) {
      this.persistMessage(entry, code).catch((err) =>
        logger.error(`[ChatStreamService] persist fail (error) - ${chatId}`, err)
      );
    }
    this.sendEvent(chatId, "error", {
      message: data.message
        ? String(data.message)
        : "AI 서버 처리 중 오류가 발생했습니다.",
      code,
      errorCode: `PROCESS_ERROR_${code}`
    });
  }

  /**
   * FileBasedMessageRepository MessageFile format
   * Path: share/jobs/{sessionId}/{YYYY-MM-DD}.json
   *
   * proc 포맷: cloud data-archive 호환
   * - SQL: proc["2"] = generate_hint/schema_linking/generate_sql/evaluate + step status
   * - General: proc["2"] = [{"0":"general"}]
   */
  private async persistMessage(
    entry: ChatStreamEntry,
    completionCode: number,
    sqlQuery?: string | null,
    stat: Record<string, string> = {}
  ): Promise<void> {
    const {
      chatId,
      sessionId,
      content,
      chatType,
      tokens,
      createdAt,
      procEvents,
      steps,
      msgs,
      msgOrder
    } = entry;
    // msgs(msg_id 분리 저장)가 있으면 마지막 msg 출력을 최종 답변으로 사용 (Cloud 동형)
    // 없으면 tokens(step:update 경계 리셋판)을 fallback으로 사용
    const lastMsg =
      msgOrder.length > 0 ? msgs.get(msgOrder[msgOrder.length - 1]) : null;
    const fullMessage = lastMsg ? lastMsg.tokens.join("") : tokens.join("");
    const now = new Date().toISOString();
    const dateString = now.split("T")[0];

    const isSql = chatType === "sql";

    // proc 구성 (cloud data-archive 호환 포맷)
    const proc: Record<string, string> = {
      "1": JSON.stringify({ question: content })
    };

    // proc["2"]: AI가 emit한 steps 정의 우선 사용, 없으면 chatType 기반 fallback
    // Cloud 포맷: [{"0":"generate_hint"},{"1":"schema_linking"},...] (name 우선)
    if (steps && steps.length > 0) {
      proc["2"] = JSON.stringify(
        steps.map((s, i) => ({
          [String(i)]: String((s as any).name ?? (s as any).id ?? i)
        }))
      );
    } else if (isSql) {
      // AI가 steps를 emit하지 않은 경우의 안전 fallback
      proc["2"] = JSON.stringify([
        { "0": "generate_hint" },
        { "1": "schema_linking" },
        { "2": "generate_sql" },
        { "3": "evaluate" }
      ]);
    } else {
      proc["2"] = JSON.stringify([{ "0": "general" }]);
    }

    // proc["3..N"]: AI step:update 이벤트의 시계열 기록
    const finalProcEvents = [...procEvents];

    // 성공(9000) 완료 시, AI가 close(stat:1) 이벤트를 누락한 단계에 대해 backfill
    // (LangGraph 마지막 노드 end 이벤트가 누락되는 케이스 보정)
    if (completionCode === 9000 && steps && steps.length > 0) {
      const closedIds = new Set<number>();
      finalProcEvents.forEach((ev) => {
        if (ev.stat === 1) closedIds.add(ev.id);
      });
      steps.forEach((_, i) => {
        if (!closedIds.has(i)) {
          finalProcEvents.push({
            id: i,
            stat: 1,
            timestamp: new Date().toISOString()
          });
        }
      });
    }

    finalProcEvents.forEach((ev, i) => {
      proc[String(3 + i)] = JSON.stringify({ id: ev.id, stat: ev.stat });
    });

    // SQL일 때는 sqlQuery를 assistant content로 저장
    // (FileBasedMessageRepository가 content fallback으로 SQL 쿼리 인식)
    const assistantContent = isSql && sqlQuery ? sqlQuery : fullMessage;

    // LLM 호출별 stream_message 엔트리 생성 (Cloud 포맷 동형)
    const assistantEntries: Array<Record<string, unknown>> = [];

    if (msgOrder.length > 0 && !sqlQuery) {
      // msg 여러 개: 각각을 개별 stream_message로 기록
      // (readMessageFile은 "마지막 stream_message"를 aiResponse로 채택)
      msgOrder.forEach((mid) => {
        const m = msgs.get(mid);
        if (!m) return;
        const msgFullMessage = m.tokens.join("");
        assistantEntries.push({
          msg_id: mid,
          proc_index: m.procId !== null ? m.procId + 3 : 2,
          proc_content: "",
          message_data: null,
          stream_message: {
            streamKey: mid,
            messageCount: m.tokens.length,
            fullMessage: msgFullMessage,
            preview:
              msgFullMessage.length > 200
                ? msgFullMessage.substring(0, 200) + "..."
                : msgFullMessage,
            timestamp: m.startedAt
          },
          timestamp: m.startedAt
        });
      });
    } else if (assistantContent) {
      // 기존 단일 entry 형태 (msgs 없거나 SQL 쿼리 최종값이 있는 경우)
      assistantEntries.push({
        msg_id: `${chatId}_assistant`,
        proc_index: 2,
        proc_content: "",
        message_data: null,
        stream_message: {
          streamKey: `${chatId}_assistant`,
          messageCount: isSql && sqlQuery ? 1 : tokens.length,
          fullMessage: assistantContent,
          preview:
            assistantContent.length > 200
              ? assistantContent.substring(0, 200) + "..."
              : assistantContent,
          timestamp: now
        },
        timestamp: now
      });
    }

    const messageFile: any = {
      chatId,
      chatroomId: sessionId,
      timestamp: createdAt,
      stat,
      proc,
      messages: [
        {
          msg_id: `${chatId}_user`,
          proc_index: 1,
          proc_content: JSON.stringify({ question: content }),
          message_data: null,
          stream_message: null,
          timestamp: createdAt
        },
        ...assistantEntries,
        {
          msg_id: `${chatId}_complete`,
          proc_index: completionCode,
          proc_content: JSON.stringify({
            timestamp: Math.floor(Date.now() / 1000)
          }),
          message_data: null,
          stream_message: null,
          timestamp: now
        }
      ]
    };

    // create session directory
    const sessionDir = path.join(this.BASE_PATH, sessionId);
    await fs.mkdir(sessionDir, { recursive: true });

    // read existing + append (DataArchiveJob pattern)
    const filePath = path.join(sessionDir, `${dateString}.json`);
    let existingData: any[] = [];
    try {
      const fileContent = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(fileContent);
      existingData = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // file not found -> empty array
    }

    existingData.push(messageFile);
    await fs.writeFile(
      filePath,
      JSON.stringify(existingData, null, 2),
      "utf-8"
    );

    // 파일 직접 기록 후 Repository 캐시 무효화 (현 main 구현은 no-op 이나 인터페이스 유지)
    this.messageRepository.clearCache(sessionId);

    logger.info(`[ChatStreamService] persist ok - ${chatId} -> ${filePath}`);
  }
}
