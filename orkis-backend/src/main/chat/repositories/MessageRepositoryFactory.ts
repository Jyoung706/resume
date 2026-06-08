import { Component, Autowired } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { ChatMessageRepository } from "./ChatMessageRepository";
import { FileBasedMessageRepository } from "./FileBasedMessageRepository";
import { ChatMessageBackend as ChatMessage } from "../../types/compatibility";

/**
 * 메시지 저장소의 공통 인터페이스 정의
 */
export interface IMessageRepository {
  createMessage(message: ChatMessage): Promise<ChatMessage>;
  findMessagesBySessionId(sessionId: string): Promise<ChatMessage[]>;
  findMessageById(messageId: string): Promise<ChatMessage | undefined>;
  updateMessageMetadata(
    messageId: string,
    metadata: any
  ): Promise<ChatMessage | null>;
  deleteMessagesBySessionId(sessionId: string): Promise<boolean>;
}

/**
 * 환경 변수에 따라 적절한 메시지 저장소를 선택하는 Factory
 * MESSAGE_STORAGE_TYPE 환경 변수 값:
 * - 'file': share/jobs 폴더의 파일 기반 저장소 사용 (기본값)
 * - 'db': 기존 파일 DB 저장소 사용 (deprecated)
 * - 'hybrid': 파일 우선, DB fallback
 */
@Component("MessageRepositoryFactory")
export class MessageRepositoryFactory {
  @Autowired("FileBasedMessageRepository")
  private fileBasedMessageRepository!: FileBasedMessageRepository;

  @Autowired("ChatMessageRepository")
  private chatMessageRepository!: ChatMessageRepository;

  private repository: IMessageRepository | null = null;
  private storageType: string;

  constructor() {
    // 환경 변수에서 저장소 타입 확인 (기본값: file)
    this.storageType = process.env.MESSAGE_STORAGE_TYPE || "file";  }

  /**
   * 설정된 타입에 따라 적절한 저장소 반환
   */
  public async getRepository(): Promise<IMessageRepository> {
    if (!this.repository) {
      switch (this.storageType) {
        case "file":
          this.repository = await this.getFileRepository();
          break;
        case "hybrid":
          this.repository = await this.getHybridRepository();
          break;
        case "db":
        default:
          this.repository = await this.getDbRepository();
          break;
      }
    }
    return this.repository;
  }

  /**
   * 파일 기반 저장소 반환
   */
  private async getFileRepository(): Promise<FileBasedMessageRepository> {    return this.fileBasedMessageRepository;
  }

  /**
   * 기존 DB 저장소 반환
   */
  private async getDbRepository(): Promise<ChatMessageRepository> {    return this.chatMessageRepository;
  }

  /**
   * 하이브리드 저장소 반환 (파일 우선, DB fallback)
   */
  private async getHybridRepository(): Promise<IMessageRepository> {    const fileRepo = await this.getFileRepository();
    const dbRepo = await this.getDbRepository();

    // 하이브리드 저장소 구현
    return {
      async createMessage(message: ChatMessage): Promise<ChatMessage> {
        try {
          // 기존 DB에 저장 (쓰기는 기존 시스템 유지)
          return await dbRepo.createMessage(message);
        } catch (error) {
          logger.error("[HybridRepository] DB 저장 실패, 에러:", error);
          throw error;
        }
      },

      async findMessagesBySessionId(sessionId: string): Promise<ChatMessage[]> {
        try {
          // 먼저 파일에서 조회 시도
          const fileMessages = await fileRepo.findMessagesBySessionId(
            sessionId
          );
          if (fileMessages && fileMessages.length > 0) {            return fileMessages;
          }
        } catch (error) {        }

        // 파일에 없으면 DB에서 조회
        return await dbRepo.findMessagesBySessionId(sessionId);
      },

      async findMessageById(
        messageId: string
      ): Promise<ChatMessage | undefined> {
        try {
          // 먼저 파일에서 조회 시도
          const fileMessage = await fileRepo.findMessageById(messageId);
          if (fileMessage) {
            return fileMessage;
          }
        } catch (error) {        }

        // 파일에 없으면 DB에서 조회
        return await dbRepo.findMessageById(messageId);
      },

      async updateMessageMetadata(
        messageId: string,
        metadata: any
      ): Promise<ChatMessage | null> {
        // 메타데이터 업데이트는 기존 DB만 사용
        return await dbRepo.updateMessageMetadata(messageId, metadata);
      },

      async deleteMessagesBySessionId(sessionId: string): Promise<boolean> {
        // 삭제는 기존 DB만 처리
        const dbResult = await dbRepo.deleteMessagesBySessionId(sessionId);

        // 파일 캐시도 초기화
        try {
          fileRepo.clearCache(sessionId);
        } catch (error) {        }

        return dbResult;
      }
    };
  }

  /**
   * 캐시 통계 정보 반환
   */
  public async getCacheStats(): Promise<any> {
    if (this.storageType === "file" || this.storageType === "hybrid") {
      const fileRepo = await this.getFileRepository();
      return fileRepo.getCacheStats();
    }
    return { message: "파일 기반 저장소가 활성화되지 않음" };
  }

  /**
   * 캐시 초기화
   */
  public async clearCache(sessionId?: string): Promise<void> {
    if (this.fileBasedMessageRepository) {
      this.fileBasedMessageRepository.clearCache(sessionId);    }
  }
}
