import { Dao, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";

import type {
  CommonCode,
  CreateTicketRequest,
  GetTicketsParams,
  SupportStats,
  SupportTicket
} from "@orkis-interface/backend/support";
import { PoolClient } from "pg";

interface SupportTicketRow {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  title: string;
  category_code: string;
  category_name?: string;
  description: string;
  status_code: string;
  status_name?: string;
  priority_code: string;
  priority_name?: string;
  created_at: Date;
  updated_at: Date;
  has_answer: boolean;
  answer?: string;
  answered_by?: string;
  answered_by_name?: string;
  answered_at?: Date;
  attachments?: any;
  tags?: string[];
  view_count: number;
}

@Dao("SupportDao")
export class SupportDao {
  @InjectConnection("main")
  private db!: PoolClient;

  // DB 행을 SupportTicket 객체로 변환
  private mapRowToTicket(row: SupportTicketRow): SupportTicket {
    return {
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      title: row.title,
      categoryCode: row.category_code,
      categoryName: row.category_name,
      description: row.description,
      statusCode: row.status_code,
      statusName: row.status_name,
      priorityCode: row.priority_code,
      priorityName: row.priority_name,
      createdAt: row.created_at?.toISOString() || new Date().toISOString(),
      updatedAt: row.updated_at?.toISOString() || new Date().toISOString(),
      hasAnswer: row.has_answer,
      answer: row.answer,
      answeredBy: row.answered_by,
      answeredByName: row.answered_by_name,
      answeredAt: row.answered_at?.toISOString(),
      attachments: row.attachments || [],
      tags: row.tags || [],
      viewCount: row.view_count || 0
    };
  }

  // 문의 생성
  async createTicket(
    request: CreateTicketRequest,
    userId: string,
    userName: string,
    userEmail: string
  ): Promise<SupportTicket> {
    try {
      // Database connection injected via @InjectConnection
      const query = `
        INSERT INTO support_tickets (
          user_id, user_name, user_email,
          title, category_code, description, priority_code, status_code
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        userId,
        userName,
        userEmail,
        request.title,
        request.categoryCode,
        request.description,
        request.priorityCode || "NORMAL",
        "PENDING"
      ];

      const result = await this.db.query(query, values);      return this.mapRowToTicket(result.rows[0]);
    } catch (error) {
      logger.error("[SupportDao] 문의 생성 에러:", error);
      throw error;
    }
  }

  // 문의 목록 조회 (페이지네이션, 코드명 JOIN)
  async getTickets(
    userId: string,
    params: GetTicketsParams
  ): Promise<{ tickets: SupportTicket[]; total: number }> {
    try {
      // Database connection injected via @InjectConnection
      const {
        statusCode = "all",
        categoryCode,
        page = 1,
        limit = 10,
        sortBy = "created_at",
        sortOrder = "desc"
      } = params;

      const offset = (page - 1) * limit;
      const conditions: string[] = ["st.user_id = $1"];
      const values: any[] = [userId];
      let paramIndex = 2;

      // 상태 필터
      if (statusCode !== "all") {
        conditions.push(`st.status_code = $${paramIndex}`);
        values.push(statusCode);
        paramIndex++;
      }

      // 카테고리 필터
      if (categoryCode) {
        conditions.push(`st.category_code = $${paramIndex}`);
        values.push(categoryCode);
        paramIndex++;
      }

      const whereClause = conditions.join(" AND ");

      // 총 개수 조회
      const countQuery = `
        SELECT COUNT(*) as total
        FROM support_tickets st
        WHERE ${whereClause}
      `;
      const countResult = await this.db.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // 데이터 조회 (공통코드 JOIN)
      const dataQuery = `
        SELECT
          st.*,
          cd_status.code_name as status_name,
          cd_priority.code_name as priority_name,
          cd_category.code_name as category_name
        FROM support_tickets st
        LEFT JOIN code_detail cd_status
          ON st.status_code = cd_status.code_id
          AND cd_status.group_id = 'TICKET_STATUS'
        LEFT JOIN code_detail cd_priority
          ON st.priority_code = cd_priority.code_id
          AND cd_priority.group_id = 'TICKET_PRIORITY'
        LEFT JOIN code_detail cd_category
          ON st.category_code = cd_category.code_id
          AND cd_category.group_id = 'TICKET_CATEGORY'
        WHERE ${whereClause}
        ORDER BY st.${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      const dataValues = [...values, limit, offset];
      const dataResult = await this.db.query(dataQuery, dataValues);

      const tickets = dataResult.rows.map((row: SupportTicketRow) =>
        this.mapRowToTicket(row)
      );

      return { tickets, total };
    } catch (error) {
      logger.error("[SupportDao] 문의 목록 조회 에러:", error);
      throw error;
    }
  }

  // 문의 상세 조회
  async getTicketById(id: string): Promise<SupportTicket | null> {
    try {
      // Database connection injected via @InjectConnection
      const query = `
        SELECT
          st.*,
          cd_status.code_name as status_name,
          cd_priority.code_name as priority_name,
          cd_category.code_name as category_name
        FROM support_tickets st
        LEFT JOIN code_detail cd_status
          ON st.status_code = cd_status.code_id
          AND cd_status.group_id = 'TICKET_STATUS'
        LEFT JOIN code_detail cd_priority
          ON st.priority_code = cd_priority.code_id
          AND cd_priority.group_id = 'TICKET_PRIORITY'
        LEFT JOIN code_detail cd_category
          ON st.category_code = cd_category.code_id
          AND cd_category.group_id = 'TICKET_CATEGORY'
        WHERE st.id = $1
      `;
      const result = await this.db.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      // 조회수 증가
      await this.db.query(
        `UPDATE support_tickets SET view_count = view_count + 1 WHERE id = $1`,
        [id]
      );

      return this.mapRowToTicket(result.rows[0]);
    } catch (error) {
      logger.error("[SupportDao] 문의 상세 조회 에러:", error);
      throw error;
    }
  }

  // 답변 등록 (관리자)
  async answerTicket(
    id: string,
    answer: string,
    answeredBy: string,
    answeredByName: string
  ): Promise<SupportTicket> {
    try {
      // Database connection injected via @InjectConnection

      const query = `
        UPDATE support_tickets
        SET
          answer = $1,
          answered_by = $2,
          answered_by_name = $3,
          answered_at = CURRENT_TIMESTAMP,
          has_answer = TRUE,
          status_code = 'COMPLETED'
        WHERE id = $4
        RETURNING *
      `;

      const result = await this.db.query(query, [
        answer,
        answeredBy,
        answeredByName,
        id
      ]);

      if (result.rows.length === 0) {
        throw new Error("문의를 찾을 수 없습니다");
      }      return this.mapRowToTicket(result.rows[0]);
    } catch (error) {
      logger.error("[SupportDao] 답변 등록 에러:", error);
      throw error;
    }
  }

  // 공통코드 조회 (카테고리, 상태, 우선순위)
  async getCommonCodes(groupId: string): Promise<CommonCode[]> {
    try {
      // Database connection injected via @InjectConnection
      const query = `
        SELECT
          group_id as "groupId",
          code_id as "codeId",
          code_name as "codeName",
          code_name_en as "codeNameEn",
          display_order as "displayOrder",
          attr1,
          use_yn as "useYn"
        FROM code_detail
        WHERE group_id = $1 AND use_yn = 'Y'
        ORDER BY display_order ASC
      `;
      const result = await this.db.query(query, [groupId]);

      return result.rows;
    } catch (error) {
      logger.error("[SupportDao] 공통코드 조회 에러:", error);
      throw error;
    }
  }

  // 통계 조회
  async getStats(userId?: string): Promise<SupportStats> {
    try {
      // Database connection injected via @InjectConnection

      const userCondition = userId ? `WHERE user_id = $1` : "";
      const values = userId ? [userId] : [];

      const query = `
        SELECT
          COUNT(*) FILTER (WHERE status_code = 'PENDING') as pending_count,
          COUNT(*) FILTER (WHERE status_code = 'IN_PROGRESS') as in_progress_count,
          COUNT(*) FILTER (WHERE status_code = 'COMPLETED') as completed_count,
          COUNT(*) FILTER (WHERE status_code = 'CANCELLED') as cancelled_count,
          COUNT(*) as total_count,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as week_count,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as month_count
        FROM support_tickets
        ${userCondition}
      `;

      const result = await this.db.query(query, values);

      if (result.rows.length === 0) {
        return {
          pendingCount: 0,
          inProgressCount: 0,
          completedCount: 0,
          cancelledCount: 0,
          totalCount: 0,
          weekCount: 0,
          monthCount: 0
        };
      }

      const row = result.rows[0];
      return {
        pendingCount: parseInt(row.pending_count) || 0,
        inProgressCount: parseInt(row.in_progress_count) || 0,
        completedCount: parseInt(row.completed_count) || 0,
        cancelledCount: parseInt(row.cancelled_count) || 0,
        totalCount: parseInt(row.total_count) || 0,
        weekCount: parseInt(row.week_count) || 0,
        monthCount: parseInt(row.month_count) || 0
      };
    } catch (error) {
      logger.error("[SupportDao] 통계 조회 에러:", error);
      throw error;
    }
  }

  // 문의 삭제
  async deleteTicket(id: string): Promise<boolean> {
    try {
      // Database connection injected via @InjectConnection
      const query = `
        DELETE FROM support_tickets
        WHERE id = $1
      `;
      const result = await this.db.query(query, [id]);      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error("[SupportDao] 문의 삭제 에러:", error);
      throw error;
    }
  }
}
