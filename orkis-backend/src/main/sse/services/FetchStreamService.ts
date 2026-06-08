/**
 * FetchStreamService
 * - Fetch Streaming 방식의 메시지 처리 및 스트리밍
 * - 단일 HTTP 요청으로 메시지 전송 + 스트리밍 응답 처리
 * - EventSource 없이 ReadableStream으로 처리
 */

import { Service, Autowired, InjectConnection } from "@orkis/core/common";
import logger, { SSEStream } from "@orkis/core/utils";
import Redis from "ioredis";
import {
  SendMessageRequest,
  SSEConfig,
  ChatType,
  SSEMultiplexEvent
} from "../types/sse.types";
import { SSEChatService } from "./SSEChatService";
import { SqlExecutionService } from "../../database/SqlExecutionService";
import { AuthService } from "../../auth/AuthService";
import { MessageRedisClient } from "../../redis/messageRedisClient";
import { ArchiveDispatcher } from "../../archive/ArchiveDispatcher";

interface ActiveStream {
  chatId: string;
  sse: SSEStream;
  isCancelled: boolean;
  createdAt: number;
}

@Service()
export class FetchStreamService {
  // 활성 스트림 관리 (취소 처리용)
  private activeStreams: Map<string, ActiveStream> = new Map();

  @InjectConnection("chatRedis", { type: "native" })
  private chatRedis!: Redis;

  @InjectConnection("stageRedis", { type: "native" })
  private stageRedis!: Redis;

  @Autowired("SSEChatService")
  private chatService!: SSEChatService;

  @Autowired("SqlExecutionService")
  private sqlExecutionService!: SqlExecutionService;

  @Autowired("AuthService")
  private authService!: AuthService;

  @Autowired("MessageRedisClient")
  private messageRedisClient!: MessageRedisClient;

  @Autowired("ArchiveDispatcher")
  private archiveDispatcher!: ArchiveDispatcher;

  /**
   * 메시지 처리 및 스트리밍
   * 단일 요청으로 메시지 전송과 스트리밍 응답을 모두 처리
   */
  async processAndStream(
    userId: string,
    request: SendMessageRequest,
    sse: SSEStream
  ): Promise<void> {
    // NOTE: tempMessageId가 chatId로 변경됨 - Frontend에서 UUID v7 기반 ID 생성
    const { sessionId, chatId: frontendMessageId } = request;

    try {
      // 1. 메시지 처리 시작 (AI 서버 호출)
      const result = await this.chatService.processMessage(userId, request);
      const { chatId, title } = result;

      // 활성 스트림 등록
      const activeStream: ActiveStream = {
        chatId,
        sse,
        isCancelled: false,
        createdAt: Date.now()
      };
      this.activeStreams.set(chatId, activeStream);

      // SSE 연결 종료 핸들러
      sse.onClose(() => {
        // cancel-archive race fix (Phase 2): cancelStream() 이 먼저 호출돼 isCancelled
        // 가 이미 true 면 그것이 사용자 정지 의지의 source. 해당 경로는 별도 dispatch
        // (cancelStream 내부) 가 9001 을 명시 전달하므로, onClose 는 reason 만 남기고
        // completionCode 는 jobs 가 redis r 으로 fallback 하도록 둔다. stat[2_2] dedup
        // 으로 first-wins 보장 (cancelStream 의 9001 이 먼저 archive 되면 본 dispatch 는 skip).
        const wasCancelled = activeStream.isCancelled;
        activeStream.isCancelled = true;
        this.activeStreams.delete(chatId);
        this.saveStatAppEnd(chatId)
          .then(() => {
            this.archiveDispatcher.dispatch(chatId, {
              completionCode: wasCancelled ? 9001 : undefined,
              reason: wasCancelled ? "cancel" : "onClose"
            });
          })
          .catch((err) => {
            logger.error(
              `[FetchStreamService] onClose saveStatAppEnd failed chatId=${chatId} err=${String(
                err
              )}`
            );
          });
      });

      // NOTE: message_id 이벤트 제거됨 - Frontend에서 생성한 chatId를 그대로 사용

      // 2. title_update 이벤트 전송 (첫 메시지인 경우)
      if (title) {
        this.sendEvent(sse, {
          chatId,
          type: "title_update",
          payload: {
            title,
            sessionId
          }
        });
      }

      // 3. 스트리밍 시작
      await this.streamMessageContent(
        activeStream,
        {
          ...request,
          userId,
          dbId: request.dbId,
          connectionId: request.connectionId
        }
      );
    } catch (error) {
      logger.error(
        `[FetchStreamService] 메시지 처리 에러:`,
        error
      );
      this.sendEvent(sse, {
        chatId: frontendMessageId,  // Frontend에서 생성한 chatId 사용
        type: "error",
        payload: {
          code: "PROCESS_ERROR",
          message: (error as Error).message
        }
      });
    }
  }

  /**
   * 스트림 취소
   */
  async cancelStream(chatId: string): Promise<boolean> {
    const activeStream = this.activeStreams.get(chatId);
    if (!activeStream) {
      return false;
    }

    activeStream.isCancelled = true;
    this.activeStreams.delete(chatId);

    // 취소 이벤트 전송
    this.sendEvent(activeStream.sse, {
      chatId,
      type: "complete",
      payload: { cancelled: true }
    });

    // 0_2 (app_end) 저장
    await this.saveStatAppEnd(chatId);
    // cancel-archive race fix (Phase 2): 사용자 정지 의지를 jobs 에 명시 전달.
    // backend 가 9001 의 source of truth — AI redis r 도착을 기다리지 않음.
    this.archiveDispatcher.dispatch(chatId, {
      completionCode: 9001,
      reason: "cancel"
    });
    return true;
  }

  /**
   * 메시지 컨텐츠 스트리밍
   */
  private async streamMessageContent(
    activeStream: ActiveStream,
    options: {
      sessionId: string;
      chatId: string;  // Frontend에서 생성한 chatId
      userId: string;
      dbId?: string;
      connectionId?: string;
    }
  ): Promise<void> {
    const { chatId, sse } = activeStream;
    const timeout = Date.now() + SSEConfig.MESSAGE_TIMEOUT;

    let streamedContent = "";
    let chatType: ChatType | null = null;
    let completionCode: number | null = null;

    const mainStreamKey = `${chatId}:stream`;
    let mainStreamLastId = "0-0";
    let currentMsgId: string | null = null;
    let currentStreamLastId = "0-0";

    // chat_type 감지 플래그
    let chatTypeDetected = false;

    // 최종 msg_id 추적 (완료 시 사용)
    let finalMsgId: string | null = null;

    while (!activeStream.isCancelled) {
      if (Date.now() > timeout) {
        this.sendEvent(sse, {
          chatId,
          type: "error",
          payload: {
            message: "응답 시간이 초과되었습니다. 다시 시도해주세요.",
            code: 9998,
            errorCode: "STREAM_TIMEOUT"
          }
        });
        // 타임아웃 시에도 0_2 (app_end) 저장
        await this.saveStatAppEnd(chatId);
        // cancel-archive race fix (Phase 2): timeout -> 9002 명시 전달.
        this.archiveDispatcher.dispatch(chatId, {
          completionCode: 9002,
          reason: "timeout"
        });
        break;
      }

      try {
        // mainStream에서 이벤트 읽기
        const mainStreamResult = await this.chatRedis.xread(
          "COUNT",
          100,
          "STREAMS",
          mainStreamKey,
          mainStreamLastId
        );

        if (mainStreamResult && mainStreamResult.length > 0) {
          const [, entries] = mainStreamResult[0];

          for (const [entryId, fields] of entries) {
            mainStreamLastId = entryId;
            const data = this.parseRedisFields(fields as string[]);

            // r 필드: 완료 시그널(9000번대) 또는 결과 데이터
            if (data.r) {
              const rValue = data.r.trim();
              const rNumeric = parseInt(rValue, 10);

              if (!isNaN(rNumeric) && rNumeric >= 9000 && rNumeric <= 9999) {
                if (completionCode === null) {
                  completionCode = rNumeric;
                }
              } else {
                // SQL 결과 데이터
                try {
                  const sqlResult = JSON.parse(rValue);
                  this.sendEvent(sse, {
                    chatId,
                    type: "result",
                    payload: {
                      type: "sql",
                      sqlQuery: sqlResult.sqlQuery || sqlResult.sql_query || sqlResult.query || sqlResult.sql,
                      columns: sqlResult.columns || [],
                      data: sqlResult.data || sqlResult.rows || [],
                      rowCount: sqlResult.rowCount || sqlResult.row_count || (sqlResult.data || sqlResult.rows || []).length,
                      executionTime: sqlResult.executionTime || sqlResult.execution_time,
                      queryTitle: sqlResult.title || sqlResult.queryTitle || "SQL 쿼리 실행 결과",
                      querySubtitle: sqlResult.subtitle || sqlResult.querySubtitle || ""
                    }
                  });
                } catch (parseError) {
                  logger.error(`[FetchStreamService] r 필드 파싱 에러:`, parseError);
                }
              }
            }

            // s 필드: chat_type 및 프로세스 단계
            if (data.s && !chatTypeDetected) {
              const isGeneralType = data.s.includes("'general'");
              chatType = isGeneralType ? "general" : "sql";
              chatTypeDetected = true;

              this.sendEvent(sse, {
                chatId,
                type: "chat_type",
                payload: { type: chatType }
              });

              // 0_1 (app_work) 저장
              await this.saveStatAppWork(chatId);

              // SQL 타입인 경우 steps 전송
              if (chatType === "sql") {
                const steps = this.parseSqlStepsFromSField(data.s);
                if (steps.length > 0) {
                  this.sendEvent(sse, {
                    chatId,
                    type: "steps",
                    payload: { steps }
                  });
                }
              }
            }

            // id + stat 필드: step 진행 상태
            if (data.id !== undefined && data.stat !== undefined && chatType === "sql") {
              this.sendEvent(sse, {
                chatId,
                type: "step",
                payload: {
                  id: data.id,
                  stat: parseInt(data.stat)
                }
              });
            }

            // msg_id 필드: stageRedis 스트리밍 키
            if (data.msg_id && data.msg_id !== currentMsgId) {
              currentMsgId = data.msg_id;
              finalMsgId = data.msg_id;  // 최종 msg_id 추적
              currentStreamLastId = "0-0";
            }

            // m 필드: 메시지 청크
            if (data.m) {
              streamedContent += data.m;
              this.sendEvent(sse, {
                chatId,
                type: "content",
                payload: { chunk: data.m, contentType: chatType || "general", isComplete: false }
              });
            }

            // t 필드: 토큰
            if (data.t) {
              streamedContent += data.t;
              this.sendEvent(sse, {
                chatId,
                type: "content",
                payload: { chunk: data.t, contentType: chatType || "general", isComplete: false }
              });
            }
          }
        }

        // stageRedis에서 스트리밍 데이터 읽기
        if (currentMsgId) {
          try {
            const stageResult = await this.stageRedis.xread(
              "BLOCK",
              100,
              "STREAMS",
              currentMsgId,
              currentStreamLastId
            );

            if (stageResult && stageResult.length > 0) {
              const [, entries] = stageResult[0];

              for (const [entryId, fields] of entries) {
                if (entryId.startsWith("1-")) continue;

                const data = this.parseRedisFields(fields as string[]);

                if (data.m) {
                  streamedContent += data.m;
                  this.sendEvent(sse, {
                    chatId,
                    type: "content",
                    payload: { chunk: data.m, contentType: chatType || "general", isComplete: false }
                  });
                }

                if (data.t) {
                  streamedContent += data.t;
                  this.sendEvent(sse, {
                    chatId,
                    type: "content",
                    payload: { chunk: data.t, contentType: chatType || "general", isComplete: false }
                  });
                }

                currentStreamLastId = entryId;
              }
            }
          } catch (stageError) {
          }
        }

        // 완료 처리
        if (completionCode !== null) {
          // 완료 신호 후 finalMsgId의 stageRedis에서 종료 신호까지 완전히 읽기
          if (finalMsgId) {
            let drainComplete = false;
            const drainTimeout = Date.now() + 3000;  // 최대 3초 대기

            while (!drainComplete && Date.now() < drainTimeout) {
              try {
                const remainingData = await this.stageRedis.xread(
                  "BLOCK",
                  100,
                  "STREAMS",
                  finalMsgId,
                  currentStreamLastId
                );

                if (!remainingData || remainingData.length === 0) {
                  // 데이터 없음 - 계속 대기
                  continue;
                }

                const [, entries] = remainingData[0];

                for (const [entryId, fields] of entries) {
                  // 종료 신호 감지 (entryId가 "1-"로 시작)
                  if (entryId.startsWith("1-")) {
                    drainComplete = true;
                    break;
                  }

                  const data = this.parseRedisFields(fields as string[]);

                  if (data.m) {
                    streamedContent += data.m;
                    this.sendEvent(sse, {
                      chatId,
                      type: "content",
                      payload: { chunk: data.m, contentType: chatType || "general", isComplete: false }
                    });
                  }

                  if (data.t) {
                    streamedContent += data.t;
                    this.sendEvent(sse, {
                      chatId,
                      type: "content",
                      payload: { chunk: data.t, contentType: chatType || "general", isComplete: false }
                    });
                  }

                  currentStreamLastId = entryId;
                }
              } catch (drainError) {
                logger.error(`[FetchStreamService] stageRedis drain 에러:`, drainError);
                break;
              }
            }
          }

          await this.handleCompletion(
            activeStream,
            options,
            streamedContent,
            chatType,
            completionCode,
            finalMsgId
          );
          break;
        }

        await this.delay(50);
      } catch (error) {
        logger.error(`[FetchStreamService] 스트리밍 에러:`, error);
        await this.delay(100);
      }
    }

    // 정리
    this.activeStreams.delete(chatId);
  }

  /**
   * 완료 처리
   */
  private async handleCompletion(
    activeStream: ActiveStream,
    options: {
      sessionId: string;
      chatId: string;  // Frontend에서 생성한 chatId
      userId: string;
      dbId?: string;
      connectionId?: string;
    },
    streamedContent: string,
    chatType: ChatType | null,
    completionCode: number,
    finalMsgId: string | null
  ): Promise<void> {
    const { chatId, sse } = activeStream;
    const currentChatType = chatType || "general";

    // SQL 타입 처리
    if (currentChatType === "sql") {
      try {
        let sqlQuery: string | null = null;

        // finalMsgId로 최종 SQL 조회 (정상 케이스)
        if (finalMsgId) {
          try {
            logger.info(`[FetchStreamService] finalMsgId로 SQL 조회: ${finalMsgId}`);
            const finalContent = await this.messageRedisClient.getCompleteStreamMessage(finalMsgId);
            logger.info(`[FetchStreamService] finalMsgId 조회 결과 - 길이: ${finalContent?.length || 0}, 내용: ${finalContent?.substring(0, 200) || 'null'}`);
            if (finalContent) {
              sqlQuery = this.extractSqlQuery(finalContent);
              logger.info(`[FetchStreamService] SQL 추출 결과: ${sqlQuery ? sqlQuery.substring(0, 100) : 'null'}`);
            }
          } catch (msgError) {
            logger.error(`[FetchStreamService] finalMsgId에서 메시지 조회 실패:`, msgError);
          }
        }

        // fallback: finalMsgId가 없거나 조회 실패 시 streamedContent에서 추출
        if (!sqlQuery) {
          logger.info(`[FetchStreamService] fallback - streamedContent에서 SQL 추출 (길이: ${streamedContent.length})`);
          sqlQuery = this.extractSqlQuery(streamedContent);
        }

        const connectionIdForSql = options.connectionId || options.dbId;

        let queryColumns: string[] = [];
        let queryData: Record<string, any>[] = [];
        let queryError: string | undefined;
        let executionTime: number | undefined;

        if (sqlQuery && connectionIdForSql && this.sqlExecutionService) {
          try {
            const queryResult = await this.sqlExecutionService.executeSqlQuery(
              sqlQuery,
              connectionIdForSql,
              options.userId
            );

            if (queryResult.success) {
              queryColumns = queryResult.columns || [];
              queryData = queryResult.data || [];
              executionTime = queryResult.executionTime;
            } else {
              queryError = queryResult.error || "SQL 쿼리 실행에 실패했습니다";
            }
          } catch (execError: any) {
            queryError = execError?.message || "SQL 쿼리 실행 중 오류가 발생했습니다";
          }
        } else {
          if (!sqlQuery) queryError = "SQL 쿼리를 추출할 수 없습니다";
          else if (!connectionIdForSql) queryError = "데이터베이스가 선택되지 않았습니다";
        }

        this.sendEvent(sse, {
          chatId,
          type: "result",
          payload: {
            type: "sql",
            sqlQuery: sqlQuery || "",
            columns: queryColumns,
            data: queryData,
            rowCount: queryData.length,
            executionTime,
            queryTitle: queryError ? "SQL 쿼리 실행 실패" : "SQL 쿼리 실행 결과",
            querySubtitle: queryError || (queryData.length > 0 ? `(${queryData.length}건 조회됨)` : "(결과 없음)"),
            error: queryError
          }
        });
      } catch (error) {
        logger.error(`[FetchStreamService] SQL 처리 에러:`, error);
        this.sendEvent(sse, {
          chatId,
          type: "result",
          payload: {
            type: "sql",
            sqlQuery: "",
            columns: [],
            data: [],
            rowCount: 0,
            error: (error as Error).message
          }
        });
      }
    } else {
      // General 타입 처리
      if (!streamedContent) {
        try {
          let finalContent: string | null = null;

          // finalMsgId가 있으면 직접 조회 (Redis proc 타이밍 문제 방지)
          if (finalMsgId) {
            finalContent = await this.messageRedisClient.getCompleteStreamMessage(finalMsgId);
          }

          // finalMsgId로 조회 실패 시 :stream에서 msg_id 재탐색 (Option C fallback)
          if (!finalContent || finalContent.trim() === "") {
            const streamKey = `${chatId}:stream`;
            const allEntries = await this.chatRedis.xrange(streamKey, "-", "+");
            let recoveredMsgId: string | null = null;
            if (allEntries) {
              for (const [entryId, fields] of allEntries) {
                const data = this.parseRedisFields(fields as string[]);
                if (data.msg_id) {
                  recoveredMsgId = data.msg_id;
                }
              }
            }
            if (recoveredMsgId && recoveredMsgId !== finalMsgId) {
              finalContent = await this.messageRedisClient.getCompleteStreamMessage(recoveredMsgId);
            }
          }

          if (finalContent && finalContent.trim() !== "" && !finalContent.includes("처리 중")) {
            streamedContent = finalContent;
            this.sendEvent(sse, {
              chatId,
              type: "content",
              payload: { chunk: finalContent, contentType: currentChatType, isComplete: true }
            });
          }
        } catch (error) {
          logger.error(`[FetchStreamService] 최종 콘텐츠 조회 에러:`, error);
        }
      }

      if (streamedContent) {
        this.sendEvent(sse, {
          chatId,
          type: "result",
          payload: { type: "general", content: streamedContent }
        });
      }
    }

    // question_count 이벤트 전송
    if (options.userId && this.authService && completionCode < 9002) {
      try {
        const newCount = await this.authService.decrementQuestionCount(options.userId);
        if (typeof newCount === "number") {
          this.sendEvent(sse, {
            chatId,
            type: "question_count",
            payload: { count: newCount }
          });
        }
      } catch (countError) {
      }
    }

    // 에러 또는 완료 이벤트 전송
    const errorCodeMessages: Record<number, string> = {
      9002: "백엔드 서버가 종료되었습니다.",
      9003: "AI 서버 처리 중 오류가 발생했습니다."
    };

    if (completionCode >= 9002) {
      const errorMessage = errorCodeMessages[completionCode] || `처리 실패 (코드: ${completionCode})`;
      this.sendEvent(sse, {
        chatId,
        type: "error",
        payload: {
          message: errorMessage,
          code: completionCode,
          errorCode: `PROCESS_ERROR_${completionCode}`
        }
      });
    } else {
      this.sendEvent(sse, {
        chatId,
        type: "complete",
        payload: {
          cancelled: completionCode === 9001,
          completionCode
        }
      });
    }

    // 0_2 (app_end) 저장
    await this.saveStatAppEnd(chatId);
    // cancel-archive race fix (Phase 2): 정상 종료 경로 — 이미 stream 에서 모은
    // completionCode 를 그대로 전달. 9002+ (timeout 등 AI 측 에러 코드) 는 error 로
    // 분류해 jobs/모니터링이 구분 가능하게 한다.
    this.archiveDispatcher.dispatch(chatId, {
      completionCode,
      reason: completionCode >= 9002 ? "error" : "complete"
    });
  }

  /**
   * SSE 이벤트 전송
   */
  private sendEvent(sse: SSEStream, event: SSEMultiplexEvent): void {
    try {
      sse.send({
        event: "message_stream",
        data: JSON.stringify(event)
      });
    } catch (error) {
      logger.error(`[FetchStreamService] SSE 전송 에러:`, error);
    }
  }

  /**
   * Redis 필드 파싱
   */
  private parseRedisFields(fields: string[]): Record<string, string> {
    const data: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      data[fields[i]] = fields[i + 1];
    }
    return data;
  }

  /**
   * SQL 쿼리 추출
   */
  private extractSqlQuery(streamedContent: string): string | null {
    if (!streamedContent || streamedContent.trim() === "") {
      return null;
    }

    // 1. <FINAL_ANSWER> 태그
    const finalAnswerMatch = streamedContent.match(/<FINAL_ANSWER>([\s\S]*?)<\/FINAL_ANSWER>/i);
    if (finalAnswerMatch && finalAnswerMatch[1]) {
      const extracted = finalAnswerMatch[1].trim();
      if (extracted) return extracted;
    }

    // 2. ```sql 코드 블록
    const sqlBlockMatch = streamedContent.match(/```sql\s*([\s\S]*?)```/i);
    if (sqlBlockMatch && sqlBlockMatch[1]) {
      const extracted = sqlBlockMatch[1].trim();
      if (extracted) return extracted;
    }

    // 3. ``` 일반 코드 블록
    const codeBlockMatch = streamedContent.match(/```\s*([\s\S]*?)```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      const extracted = codeBlockMatch[1].trim();
      if (extracted && /^(SELECT|INSERT|UPDATE|DELETE|WITH|CREATE|ALTER|DROP)/i.test(extracted)) {
        return extracted;
      }
    }

    // 4. 전체 콘텐츠가 SQL인 경우
    const trimmedContent = streamedContent.trim();
    if (/^(SELECT|INSERT|UPDATE|DELETE|WITH|CREATE|ALTER|DROP)/i.test(trimmedContent)) {
      return trimmedContent;
    }

    return null;
  }

  /**
   * s 필드에서 SQL steps 파싱
   */
  private parseSqlStepsFromSField(sField: string): Array<{
    id: string;
    name: string;
    label: string;
    stat: number;
  }> {
    const steps: Array<{ id: string; name: string; label: string; stat: number }> = [];
    const labelMap: Record<string, string> = {
      generate_hint: "Hint",
      schema_linking: "스키마",
      generate_sql: "SQL",
      evaluate: "검증"
    };

    try {
      const stepPattern = /\{(\d+):\s*'([^']+)'\}/g;
      let match;

      while ((match = stepPattern.exec(sField)) !== null) {
        const id = match[1];
        const name = match[2];
        const label = labelMap[name] || `Step ${parseInt(id) + 1}`;
        steps.push({ id, name, label, stat: 0 });
      }

      steps.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    } catch (error) {
      logger.error(`[FetchStreamService] s 필드 파싱 에러:`, error);
    }

    return steps;
  }

  /**
   * 0_1 (app_work) 저장
   */
  private async saveStatAppWork(chatId: string): Promise<void> {
    try {
      const workTime = Math.floor(Date.now() / 1000);
      const statKey = `${chatId}:stat`;
      const result = await this.chatRedis.hsetnx(statKey, "0_1", workTime.toString());
      if (result === 1) {
      }
    } catch (error) {
    }
  }

  /**
   * 0_2 (app_end) 저장
   */
  private async saveStatAppEnd(chatId: string): Promise<void> {
    try {
      const endTime = Math.floor(Date.now() / 1000);
      const statKey = `${chatId}:stat`;
      await this.chatRedis.hset(statKey, "0_2", endTime.toString());
    } catch (error) {
    }
  }

  /**
   * 딜레이 헬퍼
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
