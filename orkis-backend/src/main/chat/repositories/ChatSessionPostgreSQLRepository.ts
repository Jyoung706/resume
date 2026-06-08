import { Dao, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { Pool } from "pg";

import { v4 as uuidv4 } from "uuid";
import { ChatSessionBackend as ChatSession } from "../../types/compatibility";
import { BaseRepository } from "./BaseRepository";

/**
 * ChatSession PostgreSQL Repository
 * PostgreSQL 데이터베이스를 사용하는 ChatSession 저장소
 *
 * 호출 및 사용여부: 사용됨
 * 호출 위치: ChatSessionRepositoryFactory에서 USE_POSTGRESQL_SESSION 환경변수가 true일 때 생성
 * 사용 위치: ChatSessionService에서 sessionRepository 필드로 사용 (PostgreSQL 모드일 때)
 */
@Dao("ChatSessionPostgreSQLRepository")
export class ChatSessionPostgreSQLRepository extends BaseRepository {
  @InjectConnection("main")
  private db!: Pool;

  // 호출 및 사용여부: 사용됨
  // 호출 위치: ChatSessionService.createSession(), ChatSessionService.ensureSessionExists()
  async createSession(session: ChatSession): Promise<ChatSession> {
    try {
      // 중복 세션 생성 방지 (5분 이내 동일 제목)
      const recentCheckQuery = `
        SELECT * FROM chat_sessions
        WHERE user_id = $1
        AND title = $2
        AND created_at > NOW() - INTERVAL '5 minutes'
        LIMIT 1
      `;

      const recentResult = await this.db.query(recentCheckQuery, [
        session.userId,
        session.title
      ]);

      if (recentResult.rows && recentResult.rows.length > 0) {
        // 최근 생성된 동일 세션 반환
        return this.mapRowToSession(recentResult.rows[0]);
      }

      // 새 세션 생성
      const insertQuery = `
        INSERT INTO chat_sessions (
          id, title, user_id,
          message_count, last_message_at, title_modified, is_favorite
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7
        ) RETURNING *
      `;

      const sessionId = session.id || uuidv4();
      const values = [
        sessionId,
        session.title,
        session.userId,
        session.messageCount || 0,
        session.lastMessageAt || null,
        session.titleModified || false,
        session.isFavorite || false
      ];

      const result = await this.db.query(insertQuery, values);

      if (result.rows && result.rows.length > 0) {
        const createdSession = this.mapRowToSession(result.rows[0]);        return createdSession;
      }

      throw new Error("세션 생성 실패");
    } catch (error) {
      logger.error(
        "[ChatSessionPostgreSQLRepository] Error creating session:",
        error
      );
      throw error;
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: ChatSessionService.getUserSessions()
  async findSessionsByUserId(userId: string): Promise<ChatSession[]> {
    try {
      const query = `
        SELECT * FROM chat_sessions
        WHERE user_id = $1
        ORDER BY
          CASE WHEN is_favorite = true THEN 0 ELSE 1 END,
          COALESCE(updated_at, created_at) DESC
      `;

      const result = await this.db.query(query, [userId]);

      if (result.rows) {
        return result.rows.map((row: any) => this.mapRowToSession(row));
      }

      return [];
    } catch (error) {
      logger.error(
        "[ChatSessionPostgreSQLRepository] Error finding sessions by user ID:",
        error
      );
      throw error;
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: ChatSessionService.sessionExists(), ChatSessionService.ensureSessionExists(), ChatSessionService.updateSessionTitle(), ChatSessionService.deleteSession(), ChatMessageService.getSessionMessages(), ChatMessageService.sendMessage()
  async findSessionById(sessionId: string): Promise<ChatSession | undefined> {
    try {
      const query = `
        SELECT * FROM chat_sessions
        WHERE id = $1
        LIMIT 1
      `;

      const result = await this.db.query(query, [sessionId]);

      if (result.rows && result.rows.length > 0) {
        return this.mapRowToSession(result.rows[0]);
      }

      return undefined;
    } catch (error) {
      logger.error(
        "[ChatSessionPostgreSQLRepository] Error finding session by ID:",
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
      // 세션 존재 확인
      const checkQuery = `SELECT * FROM chat_sessions WHERE id = $1`;
      const checkResult = await this.db.query(checkQuery, [sessionId]);

      if (!checkResult.rows || checkResult.rows.length === 0) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // 세션 업데이트
      const updateQuery = `
        UPDATE chat_sessions
        SET title = $2
            ${titleModified !== undefined ? ", title_modified = $3" : ""}
        WHERE id = $1
        RETURNING *
      `;

      const values: any[] = [sessionId, title];

      if (titleModified !== undefined) {
        values.push(titleModified);
      }

      const result = await this.db.query(updateQuery, values);

      if (result.rows && result.rows.length > 0) {
        const updatedSession = this.mapRowToSession(result.rows[0]);        return updatedSession;
      }

      throw new Error("세션 업데이트 실패");
    } catch (error) {
      logger.error(
        "[ChatSessionPostgreSQLRepository] Error updating session title:",
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
      // 세션 존재 확인
      const checkQuery = `SELECT * FROM chat_sessions WHERE id = $1`;
      const checkResult = await this.db.query(checkQuery, [sessionId]);

      if (!checkResult.rows || checkResult.rows.length === 0) {
        return null;
      }

      // 업데이트할 필드 동적 생성
      const updateFields: string[] = [];
      const values: any[] = [sessionId];
      let paramIndex = 2;

      if (updates.title !== undefined) {
        updateFields.push(`title = $${paramIndex++}`);
        values.push(updates.title);
      }

      if (updates.titleModified !== undefined) {
        updateFields.push(`title_modified = $${paramIndex++}`);
        values.push(updates.titleModified);
      }

      if (updates.isFavorite !== undefined) {
        updateFields.push(`is_favorite = $${paramIndex++}`);
        values.push(updates.isFavorite);
      }

      if (updates.messageCount !== undefined) {
        updateFields.push(`message_count = $${paramIndex++}`);
        values.push(updates.messageCount);
      }

      if (updates.lastMessageAt !== undefined) {
        updateFields.push(`last_message_at = $${paramIndex++}`);
        values.push(updates.lastMessageAt);
      }

      // 항상 updated_at 갱신
      updateFields.push(`updated_at = NOW()`);

      if (updateFields.length === 1) {
        // updated_at만 있는 경우 (실질적 업데이트 없음)
        return checkResult.rows[0];
      }

      const updateQuery = `
        UPDATE chat_sessions
        SET ${updateFields.join(", ")}
        WHERE id = $1
        RETURNING *
      `;

      const result = await this.db.query(updateQuery, values);

      if (result.rows && result.rows.length > 0) {
        const updatedSession = this.mapRowToSession(result.rows[0]);        return updatedSession;
      }

      return null;
    } catch (error) {
      logger.error(
        "[ChatSessionPostgreSQLRepository] Error updating session:",
        error
      );
      throw error;
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: ChatSessionService.deleteSession()
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      // 세션 삭제
      const deleteQuery = `
        DELETE FROM chat_sessions
        WHERE id = $1
      `;

      const result = await this.db.query(deleteQuery, [sessionId]);

      if (result.rowCount && result.rowCount > 0) {        return true;
      }

      return false;
    } catch (error) {
      logger.error(
        "[ChatSessionPostgreSQLRepository] Error deleting session:",
        error
      );
      throw error;
    }
  }

  /**
   * DB Row를 ChatSession 객체로 매핑
   */
  private mapRowToSession(row: any): ChatSession {
    // PostgreSQL boolean 값 확실하게 처리
    const titleModified =
      row.title_modified === true ||
      row.title_modified === "t" ||
      row.title_modified === 1;

    const isFavorite =
      row.is_favorite === true ||
      row.is_favorite === "t" ||
      row.is_favorite === 1;    return {
      id: row.id,
      title: row.title,
      userId: row.user_id,
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : row.created_at,
      updatedAt:
        row.updated_at instanceof Date
          ? row.updated_at.toISOString()
          : row.updated_at,
      messageCount: row.message_count || 0,
      lastMessageAt:
        row.last_message_at instanceof Date
          ? row.last_message_at.toISOString()
          : row.last_message_at,
      titleModified: titleModified,
      isFavorite: isFavorite
    };
  }
}
