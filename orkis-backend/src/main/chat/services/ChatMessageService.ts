import logger from "@orkis/core/utils";
import { SendMessageRequest } from "@orkis-interface/backend/chat";
import { ChatMessage, ChatSession } from "@orkis-interface/shared/models";
import {
  RagResponseInfo,
  ChatMessageBackend,
  ChatSessionBackend
} from "../../types/compatibility";
import { Autowired, Service } from "@orkis/core/common";
import { v4 as uuidv4 } from "uuid";
import {
  ChatError,
  ChatErrorMessages,
  ChatErrorType
} from "../../error/ChatError";
import {
  MessageRepositoryFactory,
  IMessageRepository
} from "@/chat/repositories/MessageRepositoryFactory";
import { FileBasedMessageRepository } from "../repositories/FileBasedMessageRepository";
import { ChatSessionRepositoryFactory } from "@/chat/repositories/ChatSessionRepositoryFactory";
import { ChatInProgressReader } from "@/chat/services/ChatInProgressReader";
import {
  mergeMessageMetadata,
  hasMetadata
} from "../utils/messageMetadataUtils";

interface SessionMessagesRequest {
  sessionId: string;
  page?: number;
  limit?: number;
}

@Service("ChatMessageService")
export class ChatMessageService {
  @Autowired("ChatSessionRepositoryFactory")
  private sessionRepositoryFactory!: ChatSessionRepositoryFactory;

  @Autowired("MessageRepositoryFactory")
  private messageRepositoryFactory!: MessageRepositoryFactory;

  // [v2.2 Phase 4.7] 페이지네이션 endpoint 가 file-based 전용 cursor 메서드 사용
  @Autowired("FileBasedMessageRepository")
  private fileMessageRepository!: FileBasedMessageRepository;

  // [v2.2 Phase 4.6] 진행 중 채팅 read (chatRedis stream + stageRedis m chunks)
  @Autowired("ChatInProgressReader")
  private chatInProgressReader!: ChatInProgressReader;

  // Factory를 통해 선택된 저장소 캐시
  private selectedRepository: IMessageRepository | null = null;

  // Session Repository getter
  private getSessionRepository() {
    return this.sessionRepositoryFactory.getInstance();
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: 같은 클래스 내부 - getSessionMessages(), sendMessage() 메서드에서 호출
  /**
   * 메시지 저장소 가져오기 (Factory 패턴 사용)
   */
  private async getMessageRepository(): Promise<IMessageRepository> {
    // 이미 선택된 저장소가 있으면 재사용
    if (this.selectedRepository) {
      return this.selectedRepository;
    }

    // Factory를 통해 저장소 선택 (기본값: FileBasedMessageRepository)
    this.selectedRepository =
      await this.messageRepositoryFactory.getRepository();    return this.selectedRepository;
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/chat/controllers/ChatStreamController.ts - getSessionMessages() 메서드 (라인 346)
  async getSessionMessages(
    request: SessionMessagesRequest
  ): Promise<{ messages: ChatMessage[] }> {
    const session = await this.getSessionRepository().findSessionById(
      request.sessionId
    );
    if (!session) {
      // 세션이 없으면 빈 메시지 목록 반환      return { messages: [] };
    }

    const repository = await this.getMessageRepository();
    const messagesBackend = await repository.findMessagesBySessionId(
      request.sessionId
    );

    // Backend에서 Frontend로 변환 (통일된 메타데이터 유틸리티 사용)
    const messages: ChatMessage[] = messagesBackend.map((msg) => {
      // 디버그 로깅 추가
      if (msg.id && msg.id.includes("0199e16d-d0e7-7dac-9322-c5229b146367")) {
      }

      // 통일된 메타데이터 병합 로직 사용
      const combinedMetadata = mergeMessageMetadata(msg);

      // sqlSteps, result 필드도 함께 전달 (로드된 메시지용)
      const convertedMessage: any = {
        id: msg.id,
        sessionId: msg.sessionId,
        content: msg.content,
        role: msg.role,
        timestamp: msg.createdAt || new Date().toISOString(),
        metadata: hasMetadata(combinedMetadata) ? combinedMetadata : undefined
      };

      // sqlSteps가 있으면 추가 (로드된 SQL 메시지)
      if ((msg as any).sqlSteps) {
        convertedMessage.sqlSteps = (msg as any).sqlSteps;
      }

      // result가 있으면 추가 (SQL 실행 결과)
      if ((msg as any).result) {
        convertedMessage.result = (msg as any).result;      }

      // isStopped, stoppedAt 필드 추가 (사용자 취소 메시지)
      if ((msg as any).isStopped) {
        convertedMessage.isStopped = (msg as any).isStopped;
        convertedMessage.stoppedAt = (msg as any).stoppedAt;      }

      // isError 필드 추가 (에러 메시지: 9002/9003/9004)
      if ((msg as any).isError) {
        convertedMessage.isError = (msg as any).isError;
        convertedMessage.stoppedAt = (msg as any).stoppedAt;      }

      return convertedMessage;
    });

    // 변환 후에도 정렬 적용 (안전성 보장)
    // [핵심] 같은 chatId를 가진 메시지는 항상 user → assistant 순서
    return { messages: this.sortApiMessages(messages) };
  }

  /**
   * [v2.2 Phase 4.7] chatId 단위 cursor 페이지네이션 (지난 대화 더 보기).
   *
   * 호출 위치: ChatStreamController.getSessionMessagesPage() (POST /chat/sessions/messages/page)
   */
  async getSessionMessagesPage(request: {
    sessionId: string;
    limit: number;
    cursor?: string;
  }): Promise<{
    messages: ChatMessage[];
    pageInfo: {
      limit: number;
      returnedRecords: number;
      returnedMessages: number;
      hasOlder: boolean;
      nextCursor: string | null;
    };
    inProgress: Array<{
      chatId: string;
      user: ChatMessage;
      assistant: ChatMessage | null;
    }>;
  }> {
    const { sessionId, limit, cursor } = request;

    // session 존재 검증 (없어도 fall-through — 기존 패턴 동일)
    await this.getSessionRepository().findSessionById(sessionId);

    const result = await this.fileMessageRepository.findMessagesByCursor(
      sessionId,
      { limit, cursor }
    );

    // Backend ChatMessage → API ChatMessage 변환 + 정렬
    const transformed = result.messages.map((msg) =>
      this.transformMessage(msg)
    );
    const sorted = this.sortApiMessages(transformed);

    // [v2.2 Phase 4.6] 진행 중 chatId 의 user 질문 + (부분) assistant 답변 read.
    // archive 미작성 chatId 만 반환되며, archive 작성 완료 시 page messages 에
    // 포함되어 inProgress 에서 제외됨. Frontend 의 dedup (HIGH-N1) 으로 race 보호.
    const inProgress = await this.chatInProgressReader.findInProgress(
      sessionId
    );

    return {
      messages: sorted,
      pageInfo: result.pageInfo,
      inProgress
    };
  }

  /**
   * Backend ChatMessageBackend → API ChatMessage 변환 helper (getSessionMessages 와 공유)
   */
  private transformMessage(msg: ChatMessageBackend): ChatMessage {
    const combinedMetadata = mergeMessageMetadata(msg);
    const convertedMessage: any = {
      id: msg.id,
      sessionId: msg.sessionId,
      content: msg.content,
      role: msg.role,
      timestamp: msg.createdAt || new Date().toISOString(),
      metadata: hasMetadata(combinedMetadata) ? combinedMetadata : undefined
    };
    if ((msg as any).sqlSteps) convertedMessage.sqlSteps = (msg as any).sqlSteps;
    if ((msg as any).result) convertedMessage.result = (msg as any).result;
    if ((msg as any).isStopped) {
      convertedMessage.isStopped = (msg as any).isStopped;
      convertedMessage.stoppedAt = (msg as any).stoppedAt;
    }
    if ((msg as any).isError) {
      convertedMessage.isError = (msg as any).isError;
      convertedMessage.stoppedAt = (msg as any).stoppedAt;
    }
    return convertedMessage;
  }

  /**
   * API ChatMessage 정렬 (timestamp asc, chatId, role, id) — Phase 4.7 D18 보조 키.
   */
  private sortApiMessages(messages: ChatMessage[]): ChatMessage[] {
    return messages.sort((a, b) => {
      const chatIdA = (a.metadata as any)?.chatId || "";
      const chatIdB = (b.metadata as any)?.chatId || "";

      // 1. 같은 chatId면 user → assistant 순서 (대화 쌍 보장)
      if (chatIdA && chatIdB && chatIdA === chatIdB) {
        if (a.role !== b.role) {
          return a.role === "user" ? -1 : 1;
        }
      }

      // 2. timestamp 기준 정렬
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      if (timeA !== timeB) {
        return timeA - timeB;
      }

      // 3. 같은 timestamp면 user → assistant 순서
      if (a.role !== b.role) {
        return a.role === "user" ? -1 : 1;
      }

      // 4. 같은 role이면 ID 기준
      return (a.id || "").localeCompare(b.id || "");
    });
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/chat/controllers/ChatMessageController.ts - sendMessage() 메서드 (라인 66)
  async sendMessage(
    userId: string,
    request: SendMessageRequest,
    abortSignal?: AbortSignal
  ): Promise<{ message: ChatMessage }> {
    // 세션 존재 확인
    const session = await this.getSessionRepository().findSessionById(
      request.sessionId
    );
    if (!session) {
      const errorInfo = ChatErrorMessages[ChatErrorType.SESSION_NOT_FOUND];
      throw new ChatError(
        errorInfo.userMessage,
        ChatErrorType.SESSION_NOT_FOUND,
        404,
        {
          statusCode: 404,
          type: "Error",
          message: errorInfo.userMessage
        }
      );
    }

    // 사용자 메시지 저장
    const userMessageBackend: ChatMessageBackend = {
      id: uuidv4(),
      sessionId: request.sessionId,
      content: request.message,
      role: "user",
      createdAt: new Date().toISOString(),
      metadata: {}
    };

    const repository = await this.getMessageRepository();
    // 파일 쓰기 비활성화 (성능 개선)
    // const savedUserMessage = await repository.createMessage(
    //   userMessageBackend
    // );
    const savedUserMessage = userMessageBackend; // 파일 저장 없이 메모리에서만 사용

    // 첫 번째 메시지인지 확인
    const isFirstMessage = await this.isFirstMessageInSession(
      request.sessionId
    );

    // AI 응답 생성
    const { formattedResponse, ragInfo } = await this.generateAIResponse(
      request.sessionId,
      request.message,
      isFirstMessage,
      abortSignal
    );

    // AI 응답 메시지 저장
    const aiMessageBackend: ChatMessageBackend = {
      id: uuidv4(),
      sessionId: request.sessionId,
      content: formattedResponse,
      role: "assistant",
      createdAt: new Date().toISOString(),
      ragResponse: ragInfo,
      metadata: {}
    };

    // 파일 쓰기 비활성화 (성능 개선)
    // const savedAIMessage = await repository.createMessage(
    //   aiMessageBackend
    // );
    const savedAIMessage = aiMessageBackend; // 파일 저장 없이 메모리에서만 사용

    // Frontend용 ChatMessage로 변환
    const message: ChatMessage = {
      id: savedAIMessage.id,
      sessionId: savedAIMessage.sessionId,
      content: savedAIMessage.content,
      role: savedAIMessage.role,
      timestamp: savedAIMessage.createdAt || new Date().toISOString(),
      metadata: {
        ...savedAIMessage.metadata,
        ragResponse: savedAIMessage.ragResponse
      }
    };

    return { message };
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: 같은 클래스 내부 - sendMessage() 메서드에서 호출
  // 첫 번째 메시지인지 확인 (DB message_count 컬럼 활용)
  private async isFirstMessageInSession(sessionId: string): Promise<boolean> {
    try {
      const session = await this.getSessionRepository().findSessionById(
        sessionId
      );

      if (!session) {        return true; // 세션이 없으면 첫 메시지로 간주
      }

      const isFirst = session.messageCount === 0;      return isFirst;
    } catch (error) {
      logger.error("[ChatMessageService] 첫 번째 메시지 확인 오류:", error);
      return false;
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: 같은 클래스 내부 - sendMessage() 메서드에서 호출
  private async generateAIResponse(
    sessionId: string,
    message: string,
    isFirstMessage: boolean,
    abortSignal?: AbortSignal
  ): Promise<{ formattedResponse: string; ragInfo?: RagResponseInfo }> {
    const useRagServer = process.env.USE_RAG_SERVER !== "false";

    if (!useRagServer) {
      return {
        formattedResponse:
          "현재 AI 서비스가 비활성화되어 있습니다. 관리자에게 문의하세요."
      };
    }

    try {
      // 실제 RAG 서버 호출 로직은 기존 ChatService에서 가져와야 함
      // 여기서는 간단한 구현만 제공
      return {
        formattedResponse: "AI 응답을 준비 중입니다...",
        ragInfo: {
          chat_id: uuidv4(),
          usage: {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0
          }
        }
      };
    } catch (error) {
      logger.error("AI 응답 생성 오류:", error);
      return {
        formattedResponse: "죄송합니다. 현재 AI 서비스에 문제가 발생했습니다."
      };
    }
  }
}
