import { Dao, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import type { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";
import { ChatSessionBackend as ChatSession } from "@/types/compatibility";

// desktop 전용 SQLite ChatSession 저장소.
// - cloud 의 ChatSessionPostgreSQLRepository(PG) / ChatSessionRepository(파일) 와 별개
// - desktop 은 factory/PG/file/BaseRepository 갈래를 통째 exclude 하고 이 SQLite 구현만 사용
// - BaseRepository(stageRedis @InjectConnection) 를 상속하지 않음 → desktop 부팅 FATAL 회피
// - dialect: $N→?, boolean(title_modified/is_favorite)→1/0, is_favorite=1, datetime('now')
@Dao("ChatSessionSqliteRepository")
export class ChatSessionSqliteRepository {
  @InjectConnection("main")
  private db!: Pool;

  async createSession(session: ChatSession): Promise<ChatSession> {
    try {
      // 중복 세션 생성 방지 (5분 이내 동일 제목)
      const recentCheckQuery = `
        SELECT * FROM chat_sessions
        WHERE user_id = ?
        AND title = ?
        AND created_at > datetime('now', '-5 minutes')
        LIMIT 1
      `;

      const recentResult = await this.db.query(recentCheckQuery, [
        session.userId,
        session.title
      ]);

      if (recentResult.rows && recentResult.rows.length > 0) {
        return this.mapRowToSession(recentResult.rows[0]);
      }

      // 새 세션 생성
      const insertQuery = `
        INSERT INTO chat_sessions (
          id, title, user_id,
          message_count, last_message_at, title_modified, is_favorite
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?
        )
      `;

      const sessionId = session.id || uuidv4();
      const values = [
        sessionId,
        session.title,
        session.userId,
        session.messageCount || 0,
        session.lastMessageAt || null,
        session.titleModified ? 1 : 0,
        session.isFavorite ? 1 : 0
      ];

      await this.db.query(insertQuery, values);

      const selectResult = await this.db.query(
        `SELECT * FROM chat_sessions WHERE id = ?`,
        [sessionId]
      );

      if (selectResult.rows && selectResult.rows.length > 0) {
        return this.mapRowToSession(selectResult.rows[0]);
      }

      throw new Error("세션 생성 실패");
    } catch (error) {
      logger.error(
        "[ChatSessionSqliteRepository] Error creating session:",
        error
      );
      throw error;
    }
  }

  async findSessionsByUserId(userId: string): Promise<ChatSession[]> {
    try {
      const query = `
        SELECT * FROM chat_sessions
        WHERE user_id = ?
        ORDER BY
          CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END,
          COALESCE(updated_at, created_at) DESC
      `;

      const result = await this.db.query(query, [userId]);

      if (result.rows) {
        return result.rows.map((row: any) => this.mapRowToSession(row));
      }

      return [];
    } catch (error) {
      logger.error(
        "[ChatSessionSqliteRepository] Error finding sessions by user ID:",
        error
      );
      throw error;
    }
  }

  async findSessionById(sessionId: string): Promise<ChatSession | undefined> {
    try {
      const query = `
        SELECT * FROM chat_sessions
        WHERE id = ?
        LIMIT 1
      `;

      const result = await this.db.query(query, [sessionId]);

      if (result.rows && result.rows.length > 0) {
        return this.mapRowToSession(result.rows[0]);
      }

      return undefined;
    } catch (error) {
      logger.error(
        "[ChatSessionSqliteRepository] Error finding session by ID:",
        error
      );
      throw error;
    }
  }

  async updateSessionTitle(
    sessionId: string,
    title: string,
    titleModified?: boolean
  ): Promise<ChatSession> {
    try {
      // 세션 존재 확인
      const checkQuery = `SELECT * FROM chat_sessions WHERE id = ?`;
      const checkResult = await this.db.query(checkQuery, [sessionId]);

      if (!checkResult.rows || checkResult.rows.length === 0) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // 세션 업데이트
      const updateQuery = `
        UPDATE chat_sessions
        SET title = ?
            ${titleModified !== undefined ? ", title_modified = ?" : ""}
        WHERE id = ?
      `;

      const values: any[] = [title];
      if (titleModified !== undefined) {
        values.push(titleModified ? 1 : 0);
      }
      values.push(sessionId);

      await this.db.query(updateQuery, values);

      const selectResult = await this.db.query(
        `SELECT * FROM chat_sessions WHERE id = ?`,
        [sessionId]
      );

      if (selectResult.rows && selectResult.rows.length > 0) {
        return this.mapRowToSession(selectResult.rows[0]);
      }

      throw new Error("세션 업데이트 실패");
    } catch (error) {
      logger.error(
        "[ChatSessionSqliteRepository] Error updating session title:",
        error
      );
      throw error;
    }
  }

  async updateSession(
    sessionId: string,
    updates: Partial<ChatSession>
  ): Promise<ChatSession | null> {
    try {
      // 세션 존재 확인
      const checkQuery = `SELECT * FROM chat_sessions WHERE id = ?`;
      const checkResult = await this.db.query(checkQuery, [sessionId]);

      if (!checkResult.rows || checkResult.rows.length === 0) {
        return null;
      }

      // 업데이트할 필드 동적 생성
      const updateFields: string[] = [];
      const values: any[] = [];

      if (updates.title !== undefined) {
        updateFields.push(`title = ?`);
        values.push(updates.title);
      }

      if (updates.titleModified !== undefined) {
        updateFields.push(`title_modified = ?`);
        values.push(updates.titleModified ? 1 : 0);
      }

      if (updates.isFavorite !== undefined) {
        updateFields.push(`is_favorite = ?`);
        values.push(updates.isFavorite ? 1 : 0);
      }

      if (updates.messageCount !== undefined) {
        updateFields.push(`message_count = ?`);
        values.push(updates.messageCount);
      }

      if (updates.lastMessageAt !== undefined) {
        updateFields.push(`last_message_at = ?`);
        values.push(updates.lastMessageAt);
      }

      // 항상 updated_at 갱신
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      if (updateFields.length === 1) {
        // updated_at만 있는 경우 (실질적 업데이트 없음)
        return this.mapRowToSession(checkResult.rows[0]);
      }

      values.push(sessionId);

      const updateQuery = `
        UPDATE chat_sessions
        SET ${updateFields.join(", ")}
        WHERE id = ?
      `;

      await this.db.query(updateQuery, values);

      const selectResult = await this.db.query(
        `SELECT * FROM chat_sessions WHERE id = ?`,
        [sessionId]
      );

      if (selectResult.rows && selectResult.rows.length > 0) {
        return this.mapRowToSession(selectResult.rows[0]);
      }

      return null;
    } catch (error) {
      logger.error(
        "[ChatSessionSqliteRepository] Error updating session:",
        error
      );
      throw error;
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const deleteQuery = `
        DELETE FROM chat_sessions
        WHERE id = ?
      `;

      const result = await this.db.query(deleteQuery, [sessionId]);

      if (result.rowCount && result.rowCount > 0) {
        return true;
      }

      return false;
    } catch (error) {
      logger.error(
        "[ChatSessionSqliteRepository] Error deleting session:",
        error
      );
      throw error;
    }
  }

  /**
   * DB Row를 ChatSession 객체로 매핑
   * SQLite 는 boolean 을 INTEGER(0/1) 로 저장 → 1 비교로 변환
   */
  private mapRowToSession(row: any): ChatSession {
    const titleModified =
      row.title_modified === true ||
      row.title_modified === "t" ||
      row.title_modified === 1;

    const isFavorite =
      row.is_favorite === true ||
      row.is_favorite === "t" ||
      row.is_favorite === 1;

    return {
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
