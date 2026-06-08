import { Component, Autowired } from "@orkis/core/common";
import { FileBasedMessageRepository } from "@/chat/repositories/FileBasedMessageRepository";
import { ChatMessageBackend as ChatMessage } from "@/types/compatibility";

// desktop 전용 MessageRepositoryFactory (cloud factory 동명 대체).
// - cloud factory 는 MESSAGE_STORAGE_TYPE 으로 file/db/hybrid 분기하지만
//   db 갈래(ChatMessageRepository)가 deprecated PG 자산이라 desktop 은
//   cloud factory + ChatMessageRepository 를 exclude 하고 file 단일 반환.
// - IMessageRepository 인터페이스는 cloud factory 정의와 동일 (소비자 무수정).

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

@Component("MessageRepositoryFactory")
export class MessageRepositoryFactory {
  @Autowired("FileBasedMessageRepository")
  private fileBasedMessageRepository!: FileBasedMessageRepository;

  public async getRepository(): Promise<IMessageRepository> {
    return this.fileBasedMessageRepository;
  }

  public async getCacheStats(): Promise<any> {
    return this.fileBasedMessageRepository.getCacheStats();
  }

  public async clearCache(sessionId?: string): Promise<void> {
    this.fileBasedMessageRepository.clearCache(sessionId);
  }
}
