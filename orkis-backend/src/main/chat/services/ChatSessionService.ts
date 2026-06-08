import { Autowired, Service } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { CreateSessionRequest } from "@orkis-interface/backend/chat";
import { ChatSession } from "@orkis-interface/shared/models";
import { v4 as uuidv4 } from "uuid";
import { ChatSessionBackend } from "../../types/compatibility";
import {
  ChatError,
  ChatErrorMessages,
  ChatErrorType
} from "../../error/ChatError";
import { ChatSessionRepositoryFactory } from "@/chat/repositories/ChatSessionRepositoryFactory";
import { FileBasedMessageRepository } from "../repositories/FileBasedMessageRepository";

@Service("ChatSessionService")
export class ChatSessionService {
  @Autowired("ChatSessionRepositoryFactory")
  private repositoryFactory!: ChatSessionRepositoryFactory;

  @Autowired("FileBasedMessageRepository")
  private messageRepository!: FileBasedMessageRepository;

  // Factory를 통해 환경 변수에 따른 적절한 Repository 구현체 사용
  private getSessionRepository() {
    return this.repositoryFactory.getInstance();
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/chat/controllers/ChatSessionController.ts - createSession() 메서드 (라인 90)
  // 채팅창 생성
  async createSession(
    userId: string,
    request: CreateSessionRequest
  ): Promise<{ session: ChatSession }> {
    const now = new Date().toISOString();
    const sessionBackend: ChatSessionBackend = {
      id: uuidv4(),
      userId,
      title: request.title || `새로운 채팅 ${new Date().toLocaleDateString()}`,
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
      titleModified: false // 새 세션은 항상 false로 시작
    };

    const createdSessionBackend =
      await this.getSessionRepository().createSession(sessionBackend);

    // Frontend용 ChatSession으로 변환
    const session: ChatSession = {
      id: createdSessionBackend.id,
      userId: createdSessionBackend.userId,
      title: createdSessionBackend.title,
      createdAt: createdSessionBackend.createdAt,
      updatedAt: createdSessionBackend.updatedAt,
      messageCount: createdSessionBackend.messageCount || 0,
      lastMessageAt: createdSessionBackend.lastMessageAt || undefined,
      titleModified: createdSessionBackend.titleModified || false,
      isFavorite: false
    };

    return { session };
  }

  // 호출 및 사용여부: 호출 안됨
  // 호출 위치: 호출 위치 없음
  // 비고: 세션 존재 확인 메서드이나 현재 사용되지 않음
  /**
   * 세션 존재 여부 확인
   */
  async sessionExists(sessionId: string): Promise<boolean> {
    const session = await this.getSessionRepository().findSessionById(
      sessionId
    );
    return !!session;
  }

  // 호출 및 사용여부: 호출 안됨
  // 호출 위치: 호출 위치 없음
  // 비고: 세션 자동 생성 메서드이나 현재 사용되지 않음
  /**
   * 세션을 확인하고 없으면 생성
   */
  async ensureSessionExists(sessionId: string, userId: string): Promise<void> {
    const existingSession = await this.getSessionRepository().findSessionById(
      sessionId
    );

    if (!existingSession) {
      const newSession: ChatSessionBackend = {
        id: sessionId,
        userId: userId,
        title: `새로운 채팅 ${new Date().toLocaleDateString()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 0,
        titleModified: false
      };
      await this.getSessionRepository().createSession(newSession);    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/chat/controllers/ChatSessionController.ts - getUserSessions() 메서드 (라인 46)
  async getUserSessions(userId: string): Promise<{ sessions: ChatSession[] }> {
    try {      const sessionsBackend =
        await this.getSessionRepository().findSessionsByUserId(userId);

      // Backend에서 Frontend로 변환
      const sessions: ChatSession[] = sessionsBackend.map((session) => ({
        id: session.id,
        userId: session.userId,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messageCount: session.messageCount || 0,
        lastMessageAt: session.lastMessageAt || undefined,
        titleModified: session.titleModified || false,
        isFavorite: session.isFavorite || false
      }));

      return { sessions };
    } catch (error) {
      throw error;
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/chat/controllers/ChatSessionController.ts - updateSessionTitle() 메서드 (라인 141)
  async updateSessionTitle(
    sessionId: string,
    userId: string,
    title: string,
    titleModified?: boolean
  ): Promise<ChatSession> {
    const session = await this.getSessionRepository().findSessionById(
      sessionId
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

    if (session.userId !== userId) {
      const errorInfo = ChatErrorMessages[ChatErrorType.UNAUTHORIZED];
      throw new ChatError(
        errorInfo.userMessage,
        ChatErrorType.UNAUTHORIZED,
        403,
        {
          statusCode: 403,
          type: "Error",
          message: errorInfo.userMessage
        }
      );
    }

    const updatedSession = await this.getSessionRepository().updateSessionTitle(
      sessionId,
      title,
      titleModified
    );

    // Frontend용 ChatSession으로 변환 (titleModified 포함)
    return {
      id: updatedSession.id,
      userId: updatedSession.userId,
      title: updatedSession.title,
      createdAt: updatedSession.createdAt,
      updatedAt: updatedSession.updatedAt,
      messageCount: updatedSession.messageCount || 0,
      titleModified: updatedSession.titleModified
    } as ChatSession;
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/chat/controllers/ChatSessionController.ts - deleteSession() 메서드 (라인 185)
  async deleteSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.getSessionRepository().findSessionById(
      sessionId
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

    if (session.userId !== userId) {
      const errorInfo = ChatErrorMessages[ChatErrorType.UNAUTHORIZED];
      throw new ChatError(
        errorInfo.userMessage,
        ChatErrorType.UNAUTHORIZED,
        403,
        {
          statusCode: 403,
          type: "Error",
          message: errorInfo.userMessage
        }
      );
    }

    const deleted = await this.getSessionRepository().deleteSession(sessionId);
    if (!deleted) {
      throw new ChatError(
        "세션 삭제에 실패했습니다.",
        ChatErrorType.DATABASE_ERROR,
        500,
        {
          statusCode: 500,
          type: "Error",
          message: "세션 삭제에 실패했습니다."
        }
      );
    }

    // 세션과 관련된 모든 메시지도 삭제
    try {
      await this.messageRepository.deleteMessagesBySessionId(sessionId);
    } catch (error) {
      logger.error("세션 메시지 삭제 중 오류 발생:", error);
      // 메시지 삭제는 실패해도 세션 삭제는 성공으로 처리
    }
  }

  // 즐겨찾기 토글
  async toggleFavorite(
    sessionId: string,
    userId: string,
    isFavorite: boolean
  ): Promise<ChatSession> {
    const session = await this.getSessionRepository().findSessionById(
      sessionId
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

    if (session.userId !== userId) {
      const errorInfo = ChatErrorMessages[ChatErrorType.UNAUTHORIZED];
      throw new ChatError(
        errorInfo.userMessage,
        ChatErrorType.UNAUTHORIZED,
        403,
        {
          statusCode: 403,
          type: "Error",
          message: errorInfo.userMessage
        }
      );
    }

    const updatedSession = await this.getSessionRepository().updateSession(
      sessionId,
      { isFavorite }
    );

    if (!updatedSession) {
      throw new ChatError(
        "즐겨찾기 설정에 실패했습니다.",
        ChatErrorType.DATABASE_ERROR,
        500,
        {
          statusCode: 500,
          type: "Error",
          message: "즐겨찾기 설정에 실패했습니다."
        }
      );
    }

    return {
      id: updatedSession.id,
      userId: updatedSession.userId,
      title: updatedSession.title,
      createdAt: updatedSession.createdAt,
      updatedAt: updatedSession.updatedAt,
      messageCount: updatedSession.messageCount || 0,
      lastMessageAt: updatedSession.lastMessageAt,
      titleModified: updatedSession.titleModified,
      isFavorite: updatedSession.isFavorite
    } as ChatSession;
  }
}
