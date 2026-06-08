import { Dao } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import * as fs from "fs";
import * as path from "path";
import { ChatSessionBackend as ChatSession } from "../../types/compatibility";
import { BaseRepository } from "./BaseRepository";

@Dao("ChatSessionRepository")
export class ChatSessionRepository extends BaseRepository {
  // 파일 DB 경로 정의
  private readonly DB_DIR = path.join(__dirname, "../../../db_file");
  private readonly SESSIONS_FILE = path.join(this.DB_DIR, "CHAT_SESSIONS.json");

  // 호출 및 사용여부: 사용됨
  // 호출 위치: ChatSessionRepositoryFactory에서 getInstance()를 통해 생성
  // 사용 위치: ChatSessionService에서 sessionRepository 필드로 사용
  constructor() {
    super();
    // this.initFileDB();
  }

  private initFileDB(): void {
    try {
      if (!fs.existsSync(this.DB_DIR)) {
        fs.mkdirSync(this.DB_DIR, { recursive: true });
      }
      if (!fs.existsSync(this.SESSIONS_FILE)) {
        fs.writeFileSync(this.SESSIONS_FILE, "[]", "utf8");
      }
    } catch (error) {
      logger.error(
        "[ChatSessionRepository] Error initializing file DB:",
        error
      );
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: ChatSessionService.createSession(), ChatSessionService.ensureSessionExists()
  async createSession(session: ChatSession): Promise<ChatSession> {
    try {
      const sessions = this.readJsonFile(this.SESSIONS_FILE);

      // 중복 세션 생성 방지
      const recentSession = sessions
        .filter(
          (s: any) => s.userId === session.userId && s.title === session.title
        )
        .find((s: any) => {
          const timeDiff =
            new Date().getTime() - new Date(s.createdAt).getTime();
          return timeDiff < 5 * 60 * 1000; // 5분 이내
        });

      if (recentSession) {
        return recentSession;
      }

      sessions.push(session);
      this.writeJsonFile(this.SESSIONS_FILE, sessions);

      //  Redis 쓰기 제거: 파일 DB만 사용
      return session;
    } catch (error) {
      logger.error("[ChatSessionRepository] Error creating session:", error);
      throw error;
    }
  }

  private readJsonFile(filePath: string): any {
    try {
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data || "[]");
    } catch (error) {
      logger.error(
        `[ChatSessionRepository] Error reading file ${filePath}:`,
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
        `[ChatSessionRepository] Error writing file ${filePath}:`,
        error
      );
      throw error;
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: ChatSessionService.getUserSessions()
  async findSessionsByUserId(userId: string): Promise<ChatSession[]> {
    try {
      const sessions = this.readJsonFile(this.SESSIONS_FILE);
      const userSessions = sessions
        .filter((session: any) => session.userId === userId)
        .sort(
          (a: any, b: any) =>
            new Date(b.updatedAt || b.createdAt).getTime() -
            new Date(a.updatedAt || a.createdAt).getTime()
        );

      return userSessions;
    } catch (error) {
      logger.error(
        "[ChatSessionRepository] Error finding sessions by user ID:",
        error
      );
      throw error;
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: ChatSessionService.sessionExists(), ChatSessionService.ensureSessionExists(), ChatSessionService.updateSessionTitle(), ChatSessionService.deleteSession(), ChatMessageService.getSessionMessages(), ChatMessageService.sendMessage()
  async findSessionById(sessionId: string): Promise<ChatSession | undefined> {
    try {
      //  Redis 캐시 제거: 파일 DB에서 직접 검색
      const sessions = this.readJsonFile(this.SESSIONS_FILE);
      const session = sessions.find((session: any) => session.id === sessionId);

      return session;
    } catch (error) {
      logger.error(
        "[ChatSessionRepository] Error finding session by ID:",
        error
      );
      throw error;
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: ChatSessionService.updateSessionTitle()
  async updateSessionTitle(
    sessionId: string,
    title: string,
    titleModified?: boolean
  ): Promise<ChatSession> {
    try {
      const sessions = this.readJsonFile(this.SESSIONS_FILE);
      const sessionIndex = sessions.findIndex(
        (session: any) => session.id === sessionId
      );

      if (sessionIndex === -1) {
        throw new Error(`Session ${sessionId} not found`);
      }

      sessions[sessionIndex].title = title;
      sessions[sessionIndex].updatedAt = new Date().toISOString();

      // titleModified 필드 업데이트 (undefined가 아닐 때만)
      if (titleModified !== undefined) {
        sessions[sessionIndex].titleModified = titleModified;
      }

      this.writeJsonFile(this.SESSIONS_FILE, sessions);

      //  Redis 쓰기 제거: 파일 DB만 사용
      return sessions[sessionIndex];
    } catch (error) {
      logger.error(
        "[ChatSessionRepository] Error updating session title:",
        error
      );
      throw error;
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: ChatSessionService.toggleFavorite()
  async updateSession(
    sessionId: string,
    updates: Partial<ChatSession>
  ): Promise<ChatSession | null> {
    try {
      const sessions = this.readJsonFile(this.SESSIONS_FILE);
      const sessionIndex = sessions.findIndex(
        (session: any) => session.id === sessionId
      );

      if (sessionIndex === -1) {
        return null;
      }

      sessions[sessionIndex] = {
        ...sessions[sessionIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      this.writeJsonFile(this.SESSIONS_FILE, sessions);

      return sessions[sessionIndex];
    } catch (error) {
      logger.error("[ChatSessionRepository] Error updating session:", error);
      throw error;
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: ChatSessionService.deleteSession()
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const sessions = this.readJsonFile(this.SESSIONS_FILE);
      const initialLength = sessions.length;

      const filteredSessions = sessions.filter(
        (session: any) => session.id !== sessionId
      );

      if (filteredSessions.length === initialLength) {
        return false; // 세션을 찾지 못함
      }

      this.writeJsonFile(this.SESSIONS_FILE, filteredSessions);

      //  Redis 쓰기 제거: 파일 DB만 사용
      return true;
    } catch (error) {
      logger.error("[ChatSessionRepository] Error deleting session:", error);
      throw error;
    }
  }
}
