import { Dao } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import * as fs from "fs";
import * as path from "path";
import { ChatMessageBackend as ChatMessage } from "../../types/compatibility";
import { BaseRepository } from "./BaseRepository";

@Dao("ChatMessageRepository")
export class ChatMessageRepository extends BaseRepository {
  // 파일 DB 경로 정의
  private readonly DB_DIR = path.join(__dirname, "../../../db_file");
  private readonly MESSAGES_FILE = path.join(this.DB_DIR, "CHAT_MESSAGES.json");

  constructor() {
    super();
    // this.initFileDB();
  }

  private initFileDB(): void {
    try {
      if (!fs.existsSync(this.DB_DIR)) {
        fs.mkdirSync(this.DB_DIR, { recursive: true });
      }
      if (!fs.existsSync(this.MESSAGES_FILE)) {
        fs.writeFileSync(this.MESSAGES_FILE, "[]", "utf8");
      }
    } catch (error) {
      logger.error(
        "[ChatMessageRepository] Error initializing file DB:",
        error
      );
    }
  }

  private readJsonFile(filePath: string): any {
    try {
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data || "[]");
    } catch (error) {
      logger.error(
        `[ChatMessageRepository] Error reading file ${filePath}:`,
        error
      );
      return [];
    }
  }

  private writeJsonFile(filePath: string, data: any): void {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    } catch (error) {
      logger.error(
        `[ChatMessageRepository] Error writing file ${filePath}:`,
        error
      );
      throw error;
    }
  }

  async createMessage(message: ChatMessage): Promise<ChatMessage> {
    try {
      const messages = this.readJsonFile(this.MESSAGES_FILE);
      messages.push(message);
      this.writeJsonFile(this.MESSAGES_FILE, messages);

      //  Redis 쓰기 제거: 파일 DB만 사용
      return message;
    } catch (error) {
      logger.error("[ChatMessageRepository] Error creating message:", error);
      throw error;
    }
  }

  async findMessagesBySessionId(sessionId: string): Promise<ChatMessage[]> {
    try {
      //  Redis 캐시 제거: 파일 DB에서 직접 검색
      const messages = this.readJsonFile(this.MESSAGES_FILE);
      const sessionMessages = messages
        .filter((message: any) => message.sessionId === sessionId)
        .sort(
          (a: any, b: any) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

      return sessionMessages;
    } catch (error) {
      logger.error(
        "[ChatMessageRepository] Error finding messages by session ID:",
        error
      );
      throw error;
    }
  }

  async findMessageById(messageId: string): Promise<ChatMessage | undefined> {
    try {
      //  Redis 캐시 제거: 파일 DB에서 직접 검색
      const messages = this.readJsonFile(this.MESSAGES_FILE);
      const message = messages.find((message: any) => message.id === messageId);

      return message;
    } catch (error) {
      logger.error(
        "[ChatMessageRepository] Error finding message by ID:",
        error
      );
      throw error;
    }
  }

  async updateMessageMetadata(
    messageId: string,
    metadata: any
  ): Promise<ChatMessage | null> {
    try {
      const messages = this.readJsonFile(this.MESSAGES_FILE);
      const messageIndex = messages.findIndex(
        (message: any) => message.id === messageId
      );

      if (messageIndex === -1) {
        return null;
      }

      messages[messageIndex].metadata = {
        ...messages[messageIndex].metadata,
        ...metadata
      };
      this.writeJsonFile(this.MESSAGES_FILE, messages);

      //  Redis 쓰기 제거: 파일 DB만 사용
      return messages[messageIndex];
    } catch (error) {
      logger.error(
        "[ChatMessageRepository] Error updating message metadata:",
        error
      );
      throw error;
    }
  }

  async deleteMessagesBySessionId(sessionId: string): Promise<boolean> {
    try {
      const messages = this.readJsonFile(this.MESSAGES_FILE);
      const initialLength = messages.length;

      const filteredMessages = messages.filter(
        (message: any) => message.sessionId !== sessionId
      );

      if (filteredMessages.length !== initialLength) {
        this.writeJsonFile(this.MESSAGES_FILE, filteredMessages);

        //  Redis 쓰기 제거: 파일 DB만 사용
        return true;
      }

      return false;
    } catch (error) {
      logger.error(
        "[ChatMessageRepository] Error deleting messages by session ID:",
        error
      );
      throw error;
    }
  }
}
