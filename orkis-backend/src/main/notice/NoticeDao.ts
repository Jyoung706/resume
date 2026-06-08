import type {
  CreateNoticeDto,
  Notice,
  NoticeListParams,
  NoticeWithReadStatus,
  UpdateNoticeDto
} from "@orkis-interface/backend/notice";
import { Dao, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { PoolClient } from "pg";
import { v4 as uuidv4 } from "uuid";

@Dao("NoticeDao")
export class NoticeDao {
  @InjectConnection("main")
  private db!: PoolClient;

  /**
   * 공지사항 목록 조회 (사용자별 읽음 상태 포함)
   */
  async getNotices(
    userId: string,
    params: NoticeListParams = {}
  ): Promise<{ notices: NoticeWithReadStatus[]; total: number }> {
    try {
      const { page = 1, limit = 50, type, is_active = true } = params;

      const offset = (page - 1) * limit;
      // const client = await DatabaseSource.getClient("main");

      // WHERE 조건 구성
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (is_active !== undefined) {
        conditions.push(`n.is_active = $${paramIndex++}`);
        values.push(is_active);
      }

      if (type) {
        conditions.push(`n.type = $${paramIndex++}`);
        values.push(type);
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      // 전체 개수 조회
      const countQuery = `
        SELECT COUNT(*) as total
        FROM notices n
        ${whereClause}
      `;
      // Database connection injected via @InjectConnection
      const countResult = await this.db.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // 공지사항 목록 조회 (읽음 상태 포함)
      const listQuery = `
        SELECT
          n.*,
          CASE WHEN unr.read_id IS NOT NULL THEN TRUE ELSE FALSE END as is_read
        FROM notices n
        LEFT JOIN user_notification_reads unr
          ON n.notice_id = unr.notice_id
          AND unr.user_id = $${paramIndex++}
        ${whereClause}
        ORDER BY n.display_order DESC, n.created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      const listValues = [...values, userId, limit, offset];
      const result = await this.db.query(listQuery, listValues);

      const notices: NoticeWithReadStatus[] = result.rows.map((row: any) => ({
        notice_id: row.notice_id,
        title: row.title,
        content: row.content,
        type: row.type,
        author_id: row.author_id,
        author_name: row.author_name,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
        display_order: row.display_order,
        is_read: row.is_read
      }));

      return { notices, total };
    } catch (error) {
      logger.error("[NoticeDao] getNotices 오류", error);
      throw error;
    }
  }

  /**
   * 공지사항 단건 조회
   */
  async getNoticeById(noticeId: string): Promise<Notice | null> {
    try {
      // Database connection injected via @InjectConnection

      const query = `
        SELECT * FROM notices
        WHERE notice_id = $1
      `;

      const result = await this.db.query(query, [noticeId]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as Notice;
    } catch (error) {
      logger.error("[NoticeDao] getNoticeById 오류", error);
      throw error;
    }
  }

  /**
   * 공지사항 생성
   */
  async createNotice(dto: CreateNoticeDto): Promise<Notice> {
    try {
      // Database connection injected via @InjectConnection

      const noticeId = uuidv4();
      const type = dto.type || "notice";
      const displayOrder = dto.display_order || 0;

      const query = `
        INSERT INTO notices (
          notice_id, title, content, type,
          author_id, author_name, display_order
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7
        )
        RETURNING *
      `;

      const values = [
        noticeId,
        dto.title,
        dto.content,
        type,
        dto.author_id,
        dto.author_name,
        displayOrder
      ];

      const result = await this.db.query(query, values);
      return result.rows[0] as Notice;
    } catch (error) {
      logger.error("[NoticeDao] createNotice 오류", error);
      throw error;
    }
  }

  /**
   * 공지사항 수정
   */
  async updateNotice(
    noticeId: string,
    dto: UpdateNoticeDto
  ): Promise<Notice | null> {
    try {
      // Database connection injected via @InjectConnection

      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (dto.title !== undefined) {
        updates.push(`title = $${paramIndex++}`);
        values.push(dto.title);
      }

      if (dto.content !== undefined) {
        updates.push(`content = $${paramIndex++}`);
        values.push(dto.content);
      }

      if (dto.type !== undefined) {
        updates.push(`type = $${paramIndex++}`);
        values.push(dto.type);
      }

      if (dto.is_active !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(dto.is_active);
      }

      if (dto.display_order !== undefined) {
        updates.push(`display_order = $${paramIndex++}`);
        values.push(dto.display_order);
      }

      if (updates.length === 0) {
        const notice = await this.getNoticeById(noticeId);
        return notice;
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(noticeId);

      const query = `
        UPDATE notices
        SET ${updates.join(", ")}
        WHERE notice_id = $${paramIndex}
        RETURNING *
      `;

      const result = await this.db.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as Notice;
    } catch (error) {
      logger.error("[NoticeDao] updateNotice 오류", error);
      throw error;
    }
  }

  /**
   * 공지사항 삭제 (소프트 삭제)
   */
  async deleteNotice(noticeId: string): Promise<boolean> {
    try {
      // Database connection injected via @InjectConnection

      const query = `
        UPDATE notices
        SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
        WHERE notice_id = $1
      `;

      const result = await this.db.query(query, [noticeId]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      logger.error("[NoticeDao] deleteNotice 오류", error);
      throw error;
    }
  }

  /**
   * 공지사항 완전 삭제 (물리적 삭제)
   */
  async hardDeleteNotice(noticeId: string): Promise<boolean> {
    try {
      // Database connection injected via @InjectConnection

      const query = `
        DELETE FROM notices
        WHERE notice_id = $1
      `;

      const result = await this.db.query(query, [noticeId]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      logger.error("[NoticeDao] hardDeleteNotice 오류", error);
      throw error;
    }
  }

  /**
   * 공지사항 읽음 처리
   */
  async markNoticeAsRead(userId: string, noticeId: string): Promise<boolean> {
    try {
      // Database connection injected via @InjectConnection

      const readId = uuidv4();

      const query = `
        INSERT INTO user_notification_reads (read_id, user_id, notice_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, notice_id) DO NOTHING
      `;

      await this.db.query(query, [readId, userId, noticeId]);
      return true;
    } catch (error) {
      logger.error("[NoticeDao] markNoticeAsRead 오류", error);
      throw error;
    }
  }

  /**
   * 사용자의 읽지 않은 공지사항 개수 조회
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      // Database connection injected via @InjectConnection

      const query = `
        SELECT COUNT(*) as unread_count
        FROM notices n
        LEFT JOIN user_notification_reads unr
          ON n.notice_id = unr.notice_id
          AND unr.user_id = $1
        WHERE n.is_active = TRUE
          AND unr.read_id IS NULL
      `;

      // const query = `SELECT COUNT(*) as unread_count
      // FROM notices n
      // WHERE n.is_active = TRUE
      //   AND NOT EXISTS (
      //     SELECT 1 FROM user_notification_reads unr
      //     WHERE unr.notice_id = n.notice_id
      //       AND unr.user_id = $1
      //   )`;

      const result = await this.db.query(query, [userId]);
      return parseInt(result.rows[0].unread_count);
    } catch (error) {
      logger.error("[NoticeDao] getUnreadCount 오류", error);
      throw error;
    }
  }

  /**
   * 모든 공지사항 읽음 처리
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      // Database connection injected via @InjectConnection

      const query = `
        INSERT INTO user_notification_reads (read_id, user_id, notice_id)
        SELECT $1 || '-' || n.notice_id, $2, n.notice_id
        FROM notices n
        LEFT JOIN user_notification_reads unr
          ON n.notice_id = unr.notice_id
          AND unr.user_id = $2
        WHERE n.is_active = TRUE
          AND unr.read_id IS NULL
        ON CONFLICT (user_id, notice_id) DO NOTHING
      `;

      await this.db.query(query, [uuidv4(), userId]);
      return true;
    } catch (error) {
      logger.error("[NoticeDao] markAllAsRead 오류", error);
      throw error;
    }
  }
}
