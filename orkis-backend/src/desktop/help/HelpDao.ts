import { Dao, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import type {
  GetHelpListRequest,
  HelpCategory,
  HelpItem
} from "@orkis-interface/backend/help";
import { PoolClient } from "pg";

// SQLite override of src/main/help/HelpDao.ts
// - placeholder: $N → ? (SQLite 는 위치 순서 의존)
// - boolean isActive: INTEGER (0/1) 컬럼 → values.push(isActive ? 1 : 0)
// - search 필터의 동일 $N 2회 참조 → searchTerm 2번 push
// - LOWER() LIKE, CASE WHEN, LEFT JOIN: SQLite 동일 동작
@Dao("HelpDao")
export class HelpDao {
  @InjectConnection("main")
  private db!: PoolClient;

  /**
   * 활성화된 카테고리 목록 조회 (정렬순) - 공통코드 테이블 사용
   */
  async findAllActiveCategories(): Promise<HelpCategory[]> {
    try {
      const query = `
        SELECT
          code_id as id,
          code_id as name,
          code_name as "displayName",
          display_order as "sortOrder",
          CASE WHEN use_yn = 'Y' THEN 1 ELSE 0 END as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM code_detail
        WHERE group_id = 'HELP_CATEGORY'
          AND use_yn = 'Y'
        ORDER BY display_order ASC, code_name ASC
      `;

      const result = await this.db.query(query);
      return result.rows as HelpCategory[];
    } catch (error) {
      logger.error("[HelpDao] findAllActiveCategories 에러:", error);
      throw error;
    }
  }

  /**
   * ID로 카테고리 조회 - 공통코드 테이블 사용
   */
  async findCategoryById(id: string): Promise<HelpCategory | null> {
    try {
      const query = `
        SELECT
          code_id as id,
          code_id as name,
          code_name as "displayName",
          display_order as "sortOrder",
          CASE WHEN use_yn = 'Y' THEN 1 ELSE 0 END as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM code_detail
        WHERE group_id = 'HELP_CATEGORY'
          AND code_id = ?
      `;

      const result = await this.db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error("[HelpDao] findCategoryById 에러:", error);
      throw error;
    }
  }

  /**
   * 도움말 항목 조회 (필터링 + 검색)
   */
  async findItemsByConditions(params: GetHelpListRequest): Promise<HelpItem[]> {
    try {
      const conditions: string[] = [];
      const values: any[] = [];

      // 활성화 필터 (기본값: true)
      const isActive = params.isActive !== undefined ? params.isActive : true;
      conditions.push(`hi.is_active = ?`);
      values.push(isActive ? 1 : 0);

      // 카테고리 필터 (category_code로 변경)
      if (params.categoryId) {
        conditions.push(`hi.category_code = ?`);
        values.push(params.categoryId);
      }

      // 검색어 필터 (질문 또는 답변에 포함) — 동일 searchTerm 2회 참조
      if (params.search && params.search.trim()) {
        const searchTerm = `%${params.search.trim().toLowerCase()}%`;
        conditions.push(`(
          LOWER(hi.question) LIKE ? OR
          LOWER(hi.answer) LIKE ?
        )`);
        values.push(searchTerm, searchTerm);
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const query = `
        SELECT
          hi.id,
          hi.category_code as "categoryId",
          cd.code_name as "categoryName",
          hi.question,
          hi.answer,
          hi.sort_order as "sortOrder",
          hi.is_active as "isActive",
          hi.view_count as "viewCount",
          hi.created_at as "createdAt",
          hi.updated_at as "updatedAt"
        FROM help_items hi
        LEFT JOIN code_detail cd ON hi.category_code = cd.code_id
          AND cd.group_id = 'HELP_CATEGORY'
        ${whereClause}
        ORDER BY hi.sort_order ASC, hi.created_at DESC
      `;
      const result = await this.db.query(query, values);
      return result.rows as HelpItem[];
    } catch (error) {
      logger.error("[HelpDao] findItemsByConditions 에러:", error);
      throw error;
    }
  }

  /**
   * 조회수 증가
   */
  async incrementViewCount(itemId: string): Promise<void> {
    try {
      const query = `
        UPDATE help_items
        SET view_count = view_count + 1
        WHERE id = ?
      `;

      await this.db.query(query, [itemId]);
    } catch (error) {
      logger.error("[HelpDao] incrementViewCount 에러:", error);
      throw error;
    }
  }
}
