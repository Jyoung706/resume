import { Dao, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import type {
  GetFaqListRequest,
  FaqCategory,
  FaqItem
} from "@orkis-interface/backend/faq";
import { PoolClient } from "pg";

@Dao("FaqDao")
export class FaqDao {
  @InjectConnection("main")
  private db!: PoolClient;

  /**
   * FAQ 카테고리 목록 조회 (공통코드 TICKET_CATEGORY)
   */
  async findAllCategories(): Promise<FaqCategory[]> {
    try {
      const query = `
        SELECT
          code_id as code,
          code_name as name,
          display_order as "sortOrder"
        FROM code_detail
        WHERE group_id = 'TICKET_CATEGORY'
          AND use_yn = 'Y'
        ORDER BY display_order ASC, code_name ASC
      `;

      const result = await this.db.query(query);
      return result.rows as FaqCategory[];
    } catch (error) {
      logger.error("[FaqDao] findAllCategories 에러:", error);
      throw error;
    }
  }

  /**
   * FAQ 항목 조회 (필터링 + 검색)
   */
  async findItemsByConditions(params: GetFaqListRequest): Promise<FaqItem[]> {
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // 활성화 필터 (기본값: true)
      const isActive = params.isActive !== undefined ? params.isActive : true;
      conditions.push(`fi.is_active = $${paramIndex++}`);
      values.push(isActive);

      // 카테고리 필터
      if (params.categoryCode) {
        conditions.push(`fi.category_code = $${paramIndex++}`);
        values.push(params.categoryCode);
      }

      // 검색어 필터 (질문 또는 답변에 포함)
      if (params.search && params.search.trim()) {
        const searchTerm = `%${params.search.trim().toLowerCase()}%`;
        conditions.push(`(
          LOWER(fi.question) LIKE $${paramIndex} OR
          LOWER(fi.answer) LIKE $${paramIndex}
        )`);
        values.push(searchTerm);
        paramIndex++;
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const query = `
        SELECT
          fi.id,
          fi.category_code as "categoryCode",
          cd.code_name as "categoryName",
          fi.question,
          fi.answer,
          fi.is_pinned as "isPinned",
          fi.sort_order as "sortOrder",
          fi.is_active as "isActive",
          fi.view_count as "viewCount",
          fi.created_at as "createdAt",
          fi.updated_at as "updatedAt"
        FROM faq_items fi
        LEFT JOIN code_detail cd ON fi.category_code = cd.code_id
          AND cd.group_id = 'TICKET_CATEGORY'
        ${whereClause}
        ORDER BY fi.is_pinned DESC, fi.sort_order ASC, fi.created_at DESC
      `;

      const result = await this.db.query(query, values);
      return result.rows as FaqItem[];
    } catch (error) {
      logger.error("[FaqDao] findItemsByConditions 에러:", error);
      throw error;
    }
  }

  /**
   * 조회수 증가
   */
  async incrementViewCount(itemId: string): Promise<void> {
    try {
      const query = `
        UPDATE faq_items
        SET view_count = view_count + 1
        WHERE id = $1
      `;

      await this.db.query(query, [itemId]);
    } catch (error) {
      logger.error("[FaqDao] incrementViewCount 에러:", error);
      throw error;
    }
  }
}
