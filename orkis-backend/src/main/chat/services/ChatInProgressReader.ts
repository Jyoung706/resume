import { Service, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import Redis from "ioredis";
import { ChatMessage } from "@orkis-interface/shared/models";

/**
 * [v2.2 Phase 4.6] 진행 중 채팅 메시지 read 전용 서비스.
 *
 * 사용 시나리오: 사용자가 SSE 스트리밍 중 새로고침 시,
 *   archive 파일이 미작성 상태인 chatId 의 user 질문 + (부분) assistant 답변을
 *   chatRedis stream + stageRedis 에서 직접 read 해 표출.
 *
 * Phase 4.7 page response 의 inProgress 배열 필드에 채워짐.
 *
 * 진행 중 chatId 식별 조건:
 *   - chatRedis 의 {chatId}:stat 에 stat[2_2] 부재 (= archive 미작성)
 *   - chatRedis 의 {chatId}:stream 키 존재 (= 채팅 활성)
 *   - stream 첫 entry 의 i 필드 JSON 의 chatroom_id 가 sessionId 와 일치
 *
 * read 패턴: Jobs ArchiveService.runOne 과 동일 (chatRedis HGETALL/XRANGE +
 *   stageRedis msg_id 별 m chunks 합본). 단, archive 파일을 작성하지 않고
 *   메모리에 ChatMessage 1쌍으로 변환해 즉시 반환.
 */

interface InProgressItem {
  chatId: string;
  user: ChatMessage;
  assistant: ChatMessage | null;
}

@Service("ChatInProgressReader")
export class ChatInProgressReader {
  @InjectConnection("chatRedis", { type: "native" })
  private chatRedis!: Redis;

  @InjectConnection("stageRedis", { type: "native" })
  private stageRedis!: Redis;

  /**
   * sessionId(=chatroomId) 의 진행 중 chatId 들을 모두 조회해 배열로 반환.
   *
   * 보통 0~1개. 사용자가 동시 다중 채팅 시 2개 이상 가능 (드물지만 schema 상 허용).
   * 에러 발생 시 빈 배열 반환 — page response 에는 영향 없음.
   */
  async findInProgress(sessionId: string): Promise<InProgressItem[]> {
    try {
      // 1) chatRedis 의 모든 *:stat 키 스캔 (KEYS 대신 SCAN 사용 — 운영 안전)
      const statKeys = await this.scanKeys(this.chatRedis, "*:stat");
      const result: InProgressItem[] = [];

      for (const statKey of statKeys) {
        const chatId = statKey.replace(/:stat$/, "");
        if (chatId === statKey) continue; // 패턴 매칭 안 됨

        // 2) stat 검사 — stat[2_2] 박혔으면 archive 완료된 chat 이므로 skip
        const stat = (await this.chatRedis.hgetall(statKey)) as Record<
          string,
          string
        >;
        if (!stat || stat["2_2"]) continue;

        // 3) stream 존재 검사 (XLEN=0 이면 skip)
        const streamKey = `${chatId}:stream`;
        const streamLen = await this.chatRedis
          .xlen(streamKey)
          .catch(() => 0);
        if (!streamLen) continue;

        // 4) XRANGE stream → 첫 entry 의 i 필드 JSON.parse
        const entries = (await this.chatRedis.xrange(
          streamKey,
          "-",
          "+"
        )) as Array<[string, string[]]>;
        if (entries.length === 0) continue;

        const firstFields = this.fieldsToMap(entries[0][1]);
        const iRaw = firstFields.get("i");
        if (!iRaw) continue;

        let parsedI: Record<string, unknown>;
        try {
          parsedI = JSON.parse(iRaw);
        } catch {
          continue;
        }

        // 5) chatroom_id 매칭 검사 — 다른 sessionId 의 진행 chat 은 무시
        const chatroomId =
          (parsedI.chatroom_id as string | undefined) ??
          (parsedI.chatroomId as string | undefined);
        if (chatroomId !== sessionId) continue;

        // 6) user 질문 + msg_id 들 추출
        const question = (parsedI.question as string | undefined) ?? "";
        const msgIds = this.collectMsgIds(entries);

        // 7) stageRedis 에서 m chunks 합본 (부분 답변)
        const partialAnswer = await this.collectAssistantMessage(
          chatId,
          msgIds
        );

        // 8) ChatMessage 1쌍 생성 (timestamp 는 현재 시각 — 진행 중 표시이므로 정확한 시점 표시 용도)
        const nowIso = new Date().toISOString();
        const userMsg: ChatMessage = {
          id: `${chatId}_user`,
          sessionId,
          content: question,
          role: "user",
          timestamp: nowIso,
          metadata: {
            chatId,
            isInProgress: true
          } as ChatMessage["metadata"]
        };
        const assistantMsg: ChatMessage | null =
          partialAnswer.length > 0
            ? {
                id: `${chatId}_assistant_in_progress`,
                sessionId,
                content: partialAnswer,
                role: "assistant",
                timestamp: nowIso,
                metadata: {
                  chatId,
                  isInProgress: true
                } as ChatMessage["metadata"]
              }
            : null;

        result.push({ chatId, user: userMsg, assistant: assistantMsg });
      }

      return result;
    } catch (error) {
      logger.error(
        `[ChatInProgressReader] findInProgress 오류: ${sessionId}`,
        error
      );
      return [];
    }
  }

  /**
   * msg_id 별 stageRedis stream 의 m 필드 chunks 합본.
   * Jobs ArchiveService.collectAssistantMessage 와 동일 패턴.
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
          )) as Array<[string, string[]]>;
          for (const [, fields] of messages) {
            for (let i = 0; i + 1 < fields.length; i += 2) {
              if (fields[i] === "m") parts.push(fields[i + 1]);
            }
          }
        } else if (keyType === "string") {
          const v = await this.stageRedis.get(msgId);
          if (v) parts.push(v);
        }
      } catch (e) {
        logger.warn(
          `[ChatInProgressReader] stageRedis read 실패 chatId=${chatId} msgId=${msgId}`
        );
      }
    }
    return parts.join("");
  }

  /**
   * stream entries 에서 msg_id 목록을 등장 순서대로 추출 (중복 제거).
   */
  private collectMsgIds(entries: Array<[string, string[]]>): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const [, fields] of entries) {
      const map = this.fieldsToMap(fields);
      const m = map.get("msg_id");
      if (m && !seen.has(m)) {
        seen.add(m);
        out.push(m);
      }
    }
    return out;
  }

  private fieldsToMap(fields: string[]): Map<string, string> {
    const map = new Map<string, string>();
    for (let i = 0; i + 1 < fields.length; i += 2) {
      map.set(fields[i], fields[i + 1]);
    }
    return map;
  }

  /**
   * Redis SCAN 으로 패턴 매칭 키 모두 수집 (KEYS 명령은 production 비추천).
   * COUNT=100 batch 로 점진적 수집.
   */
  private async scanKeys(redis: Redis, pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = "0";
    do {
      const [next, batch] = await redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100
      );
      keys.push(...batch);
      cursor = next;
    } while (cursor !== "0");
    return keys;
  }
}
