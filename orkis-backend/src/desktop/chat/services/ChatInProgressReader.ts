import { Service, Autowired } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { ChatMessage } from "@orkis-interface/shared/models";
import { ChatStreamContext } from "../ChatStreamContext";

// desktop 전용 진행 중 채팅 read 서비스 (cloud ChatInProgressReader 동명 대체).
//
// cloud: chatRedis {chatId}:stat/:stream + stageRedis msg_id chunks 를 스캔해
//        새로고침 시 진행 중 user 질문 + 부분 assistant 답변을 복원.
// desktop: backend 가 AI SSE 를 직접 구독하며 진행 상태가 ChatStreamContext
//        (인메모리)에만 존재 → Context 조회로 동일 계약(InProgressItem[]) 제공.
//
// ChatMessageService.getSessionMessagesPage 의 inProgress 필드 소비자는 무수정.

interface InProgressItem {
  chatId: string;
  user: ChatMessage;
  assistant: ChatMessage | null;
}

@Service("ChatInProgressReader")
export class ChatInProgressReader {
  @Autowired("ChatStreamContext")
  private chatStreamContext!: ChatStreamContext;

  /**
   * sessionId 의 진행 중 chatId 들을 모두 조회해 배열로 반환.
   * 에러 발생 시 빈 배열 반환 — page response 에는 영향 없음 (cloud 동형).
   */
  async findInProgress(sessionId: string): Promise<InProgressItem[]> {
    try {
      const entries = this.chatStreamContext.findBySessionId(sessionId);
      const result: InProgressItem[] = [];

      for (const entry of entries) {
        // 부분 답변: msg_id 별 분리 저장분을 등장 순서대로 합본
        // (cloud collectAssistantMessage 의 msg_id 순회 합본과 동형)
        const parts: string[] = [];
        for (const msgId of entry.msgOrder) {
          const msg = entry.msgs.get(msgId);
          if (msg) parts.push(msg.tokens.join(""));
        }
        const partialAnswer =
          parts.length > 0 ? parts.join("") : entry.tokens.join("");

        const nowIso = new Date().toISOString();
        const userMsg: ChatMessage = {
          id: `${entry.chatId}_user`,
          sessionId,
          content: entry.content,
          role: "user",
          timestamp: nowIso,
          metadata: {
            chatId: entry.chatId,
            isInProgress: true
          } as ChatMessage["metadata"]
        };
        const assistantMsg: ChatMessage | null =
          partialAnswer.length > 0
            ? {
                id: `${entry.chatId}_assistant_in_progress`,
                sessionId,
                content: partialAnswer,
                role: "assistant",
                timestamp: nowIso,
                metadata: {
                  chatId: entry.chatId,
                  isInProgress: true
                } as ChatMessage["metadata"]
              }
            : null;

        result.push({ chatId: entry.chatId, user: userMsg, assistant: assistantMsg });
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
}
