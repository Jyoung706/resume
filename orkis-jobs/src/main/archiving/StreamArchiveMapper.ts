import { Service } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import {
  ArchiveHints,
  ArchiveRecord,
  SessionData,
  StatHash,
  StreamEntryRaw
} from "@/archiving/archiveTypes";

/** completionCode 결정 출처 (KPI metric 용). */
type CompletionCodeSource = "payload" | "redis" | "fallback";

/**
 * SSE 경로 stream 데이터 → archive 파일 형식(SessionData) 변환 매퍼.
 *
 * 변환 규칙:
 * - 첫 entry i 필드 JSON.parse → proc_index=1 record
 *   (proc_content = JSON.stringify({question}) — reader 가 JSON.parse 후 .question 추출)
 * - assistantMessage(stageRedis 에서 ArchiveService 가 합본해 전달) → proc_index=2 record
 *   (stream_message.fullMessage = assistantMessage)
 * - 마지막 r 필드 또는 9000 fallback → proc_index=<N> record
 * - stream `s` 필드 → archive.proc["2"] (steps 정의, reader.parseProc 가 questionType/processes 추출)
 * - stream `id`/`stat` 필드 entries → archive.proc["3"], proc["4"], ... (progress updates)
 *
 * 누락 케이스(i/m/r/s 부재) 는 logger.warn 1줄 + 안전한 default 로 처리.
 * proc 재구성에서 s/id/stat 부재 시 reader 가 general fallback 하므로 별도 warn 없이 빈 객체로 둠.
 *
 * 주의: m chunks 는 chatRedis stream 이 아닌 stageRedis 의 별도 stream(streamKey=msg_id)
 *       에 저장되므로, ArchiveService 에서 stageRedis 를 read 해 합본한 결과를
 *       assistantMessage 인자로 전달받는다 (매퍼는 pure transform 유지).
 *
 * 주의: Redis 의 {chatId}:proc hash 는 본 매퍼가 읽지 않는다. archive 파일의 proc JSON 필드는
 *       stream entries 만으로 재구성한다 (stream 단일 소스 설계).
 */
@Service()
export class StreamArchiveMapper {
  toSessionData(input: {
    chatId: string;
    stat: StatHash;
    streamEntries: StreamEntryRaw[];
    assistantMessage: string; // stageRedis 에서 합본된 본문 (빈 문자열 가능)
    hints?: ArchiveHints; // backend dispatch payload (Phase 3 cancel-archive race fix)
  }): SessionData {
    const { chatId, stat, streamEntries, assistantMessage, hints } = input;

    const iParsed = this.extractIField(chatId, streamEntries);
    const completionCode = this.extractCompletionCode(
      chatId,
      streamEntries,
      hints
    );

    // reader 는 proc_content 를 JSON.parse 후 .question 추출하므로 객체 직렬화로 박는다
    const procContent =
      iParsed.question != null
        ? JSON.stringify({ question: iParsed.question })
        : null;

    // record timestamp 는 null 로 박는다 — cron archive 패턴과 동일.
    // reader 가 data.timestamp(ISO) 를 fallback 사용하도록 위임.
    // (Redis stream entry id "1778236586001-0" 같은 값을 박으면 reader 의 new Date()
    //  파싱 시 Invalid Date 가 되어 setCachedMessages 에서 RangeError 발생)
    const messages: ArchiveRecord[] = [
      {
        msg_id: iParsed.chatId,
        proc_index: 1,
        proc_content: procContent,
        message_data: null,
        stream_message: null,
        timestamp: null
      },
      {
        msg_id: this.lastMsgId(streamEntries) ?? iParsed.chatId,
        proc_index: 2,
        proc_content: null,
        message_data: null,
        stream_message: { fullMessage: assistantMessage },
        timestamp: null
      },
      {
        msg_id: null,
        proc_index: completionCode,
        proc_content: null,
        message_data: null,
        stream_message: null,
        timestamp: null
      }
    ];

    return {
      chatId,
      chatroomId: iParsed.chatroomId,
      timestamp: new Date().toISOString(),
      stat,
      proc: this.buildProcFromStream(chatId, streamEntries),
      messages
    };
  }

  /**
   * stream entries → archive 파일의 proc JSON 필드 재구성.
   *
   * reader.parseProc(FileBasedMessageRepository) 가 기대하는 형식:
   *   proc["2"]: JSON-stringified steps 정의 배열
   *     - general: [{"0":"general"}]
   *     - sql:     [{"0":"generate_hint"},{"1":"schema_linking"},{"2":"generate_sql"},{"3":"evaluate"}]
   *   proc["3"]+: JSON-stringified {id:number, stat:number} progress update (큰 키 = 최신)
   *
   * stream 필드:
   *   `s`: AI 서버 proc_init_step 이 박는 값. AI 측 현행 코드가 Python str() 출력 형식이므로
   *        normalizeStepsField 로 JSON 호환 변환 후 proc["2"] 에 박음.
   *   `id`/`stat`: AI 서버 proc_update 가 박는 단계 진행 상태 — 순서대로 proc["3"]+ 에 박음
   *
   * 누락/변환실패 시 동작:
   *   - s 부재 또는 변환 실패 → proc["2"] 미박음 → reader.parseProc 가 general fallback
   *   - id/stat 부재 → proc["3"]+ 미박음 → reader 가 모든 step 을 pending 으로 표시
   */
  private buildProcFromStream(
    chatId: string,
    entries: StreamEntryRaw[]
  ): Record<string, string> {
    const proc: Record<string, string> = {};

    const stepsRaw = this.extractFieldRaw(entries, "s");
    if (stepsRaw) {
      const normalized = this.normalizeStepsField(stepsRaw);
      if (normalized) {
        proc["2"] = normalized;
      } else {
        logger.warn("archive_steps_field_normalize_fail", {
          chatId,
          rawPreview: stepsRaw.slice(0, 120)
        });
      }
    }

    const statusUpdates = this.extractStatusUpdates(entries);
    statusUpdates.forEach((update, index) => {
      proc[String(3 + index)] = JSON.stringify(update);
    });

    return proc;
  }

  /**
   * AI 서버 chat_redis_repository.proc_init_step 이 stream 에 박는 `s` 필드는
   * Python str() 출력 형식(작은따옴표, 정수 key 무따옴표).
   *   예: "[{0: 'generate_hint'}, {1: 'schema_linking'}]"
   * reader.parseProc 가 JSON.parse 가능한 형식으로 변환:
   *   - 이미 valid JSON 이면 그대로 반환 (AI 측 향후 변경 호환)
   *   - 그 외엔 작은따옴표 → 큰따옴표, 정수 key → 큰따옴표 감싸기
   * 변환 후에도 JSON.parse 실패하면 null 반환 (호출부가 archive 에 박지 않음).
   *
   * AI 소스를 변경하지 않고 consumer 측에서 양식을 흡수하는 패턴.
   */
  private normalizeStepsField(raw: string): string | null {
    try {
      JSON.parse(raw);
      return raw;
    } catch {
      // fallthrough to repr 변환
    }

    try {
      let converted = raw.replace(/'/g, '"');
      converted = converted.replace(/([\{,]\s*)(\d+)(\s*:)/g, '$1"$2"$3');
      JSON.parse(converted);
      return converted;
    } catch {
      return null;
    }
  }

  private extractFieldRaw(
    entries: StreamEntryRaw[],
    field: string
  ): string | null {
    for (const entry of entries) {
      const value = this.fieldsToMap(entry[1]).get(field);
      if (value !== undefined) return value;
    }
    return null;
  }

  /**
   * stream entries 중 `id` 와 `stat` 필드를 모두 가진 entry 를 등장 순서대로 추출.
   * 값은 reader 가 number 비교를 하므로 parseInt 변환.
   * (AI 서버 chat_redis_repository.proc_update 가 작성하는 entry)
   */
  private extractStatusUpdates(
    entries: StreamEntryRaw[]
  ): Array<{ id: number; stat: number }> {
    const updates: Array<{ id: number; stat: number }> = [];
    for (const entry of entries) {
      const fields = this.fieldsToMap(entry[1]);
      const idStr = fields.get("id");
      const statStr = fields.get("stat");
      if (idStr === undefined || statStr === undefined) continue;
      const id = parseInt(idStr, 10);
      const stat = parseInt(statStr, 10);
      if (Number.isNaN(id) || Number.isNaN(stat)) continue;
      updates.push({ id, stat });
    }
    return updates;
  }

  /**
   * stream entries 에서 msg_id 목록 추출 (중복 제거, 등장 순서 유지).
   * ArchiveService 가 stageRedis 에서 m chunks 를 read 할 때 사용.
   */
  collectMsgIds(streamEntries: StreamEntryRaw[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const entry of streamEntries) {
      const msgId = this.fieldsToMap(entry[1]).get("msg_id");
      if (msgId && !seen.has(msgId)) {
        seen.add(msgId);
        out.push(msgId);
      }
    }
    return out;
  }

  // ===== 누락 케이스 분기 =====

  private extractIField(
    chatId: string,
    entries: StreamEntryRaw[]
  ): {
    chatroomId: string | null;
    question: string | null;
    chatId: string | null;
  } {
    const first = entries[0];
    if (!first) {
      logger.warn("archive_missing_i_field", {
        chatId,
        reason: "empty_stream"
      });
      return { chatroomId: null, question: null, chatId: null };
    }
    const fields = this.fieldsToMap(first[1]);
    const iRaw = fields.get("i");
    if (!iRaw) {
      logger.warn("archive_missing_i_field", {
        chatId,
        reason: "no_i_field"
      });
      return { chatroomId: null, question: null, chatId: null };
    }
    try {
      const parsed = JSON.parse(iRaw);
      return {
        chatroomId: parsed.chatroom_id ?? parsed.chatroomId ?? null,
        question: parsed.question ?? null,
        chatId: parsed.chat_id ?? null
      };
    } catch (err) {
      logger.warn("archive_missing_i_field", {
        chatId,
        reason: "parse_fail"
      });
      return { chatroomId: null, question: null, chatId: null };
    }
  }

  /**
   * completionCode 우선순위 결정 (Phase 3 cancel-archive race fix + panel #1 range guard):
   *   1순위: hints.completionCode (backend 가 명시 전달) — source of truth
   *   2순위: redis stream 의 마지막 valid r 필드 (range 9000-9999, panel #1 으로 9004 -> 9999 확장)
   *   3순위: 9000 fallback + 경고 로그 (panel #4 권고로 9005 UNKNOWN 도입 별도 PR 까지 유지)
   *
   * KPI metrics (panel #3):
   *   archive_completion_code_resolved — 매 resolve 시 source 와 code 기록
   *   archive_payload_redis_mismatch    — hints + redis r 둘 다 있을 때 값이 다르면 기록
   *   archive_no_completion_code_fallback_to_9000 — 3순위 fallback 발동 시 기록
   *   archive_hints_invalid_code        — hints.completionCode 가 비정상 범위일 때 (드물어야 함)
   */
  private extractCompletionCode(
    chatId: string,
    entries: StreamEntryRaw[],
    hints?: ArchiveHints
  ): number {
    const redisR = this.readLastValidR(entries);

    // 1순위: backend hints
    if (hints?.completionCode !== undefined) {
      const code = hints.completionCode;
      if (Number.isInteger(code) && code >= 9000 && code <= 9999) {
        if (redisR !== null && redisR !== code) {
          logger.warn("archive_payload_redis_mismatch", {
            chatId,
            payloadCode: code,
            redisCode: redisR,
            reason: hints.reason
          });
        }
        this.logResolved(chatId, code, "payload", hints.reason);
        return code;
      }
      logger.warn("archive_hints_invalid_code", {
        chatId,
        code,
        reason: hints.reason
      });
      // invalid code -> redis r 로 fallthrough
    }

    // 2순위: redis stream r
    if (redisR !== null) {
      this.logResolved(chatId, redisR, "redis", hints?.reason);
      return redisR;
    }

    // 3순위: fallback 9000 (panel #4 — 9005 UNKNOWN 도입 PR 까지 유지)
    logger.warn("archive_no_completion_code_fallback_to_9000", {
      chatId,
      reason: hints?.reason
    });
    this.logResolved(chatId, 9000, "fallback", hints?.reason);
    return 9000;
  }

  /**
   * stream entries 를 역순 탐색해 마지막 valid r (9000-9999 범위) 반환.
   * panel #1 critical: 기존 9004 상한이 backend 의 9999 와 불일치 → 9999 로 확장.
   */
  private readLastValidR(entries: StreamEntryRaw[]): number | null {
    for (let i = entries.length - 1; i >= 0; i--) {
      const r = this.fieldsToMap(entries[i][1]).get("r");
      if (r) {
        const n = parseInt(r, 10);
        if (!Number.isNaN(n) && n >= 9000 && n <= 9999) return n;
      }
    }
    return null;
  }

  private logResolved(
    chatId: string,
    code: number,
    source: CompletionCodeSource,
    reason?: string
  ): void {
    logger.info("archive_completion_code_resolved", {
      chatId,
      code,
      source,
      reason
    });
  }

  private fieldsToMap(arr: string[]): Map<string, string> {
    const map = new Map<string, string>();
    for (let i = 0; i + 1 < arr.length; i += 2) map.set(arr[i], arr[i + 1]);
    return map;
  }

  private firstEntryTs(entries: StreamEntryRaw[]): string {
    return entries[0]?.[0] ?? new Date().toISOString();
  }

  private lastEntryTs(entries: StreamEntryRaw[]): string {
    return entries[entries.length - 1]?.[0] ?? new Date().toISOString();
  }

  private lastMsgId(entries: StreamEntryRaw[]): string | null {
    for (let i = entries.length - 1; i >= 0; i--) {
      const m = this.fieldsToMap(entries[i][1]).get("msg_id");
      if (m) return m;
    }
    return null;
  }
}
