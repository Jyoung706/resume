import { Dao, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import type {
  CreateKeywordRequest,
  GetKeywordsRequest,
  Keyword,
  UpdateKeywordRequest
} from "@orkis-interface/backend/keyword";
import { PoolClient } from "pg";

@Dao("KeywordDao")
export class KeywordDao {
  @InjectConnection("main")
  private db!: PoolClient;

  /**
   * 키워드 생성
   */
  async createKeyword(
    userId: string,
    request: CreateKeywordRequest
  ): Promise<Keyword> {
    try {
      const query = `
        INSERT INTO keywords (
          text,
          type,
          category,
          user_id,
          knowledge_base_id
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          text,
          type,
          category,
          user_id as "userId",
          knowledge_base_id as "knowledgeBaseId",
          usage_count as "usageCount",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const values = [
        request.text,
        request.type || "custom",
        request.category || null,
        userId, // 로그인한 사용자 ID
        request.knowledgeBaseId || null
      ];

      const result = await this.db.query(query, values);
      const keyword = result.rows[0];

      // isFavorite 요청이 있으면 user_keyword_favorites에 추가
      if (request.isFavorite) {
        await this.toggleFavorite(userId, keyword.id);
        keyword.isFavorite = true;
      } else {
        keyword.isFavorite = false;
      }      return keyword as Keyword;
    } catch (error) {
      logger.error("[KeywordDao] 키워드 생성 오류:", error);
      throw error;
    }
  }

  /**
   * 키워드 목록 조회
   */
  async getKeywords(request: GetKeywordsRequest): Promise<{
    keywords: Keyword[];
    total: number;
  }> {
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // 사용자 ID 필터
      if (request.userId) {
        conditions.push(`(user_id = $${paramIndex} OR user_id IS NULL)`);
        values.push(request.userId);
        paramIndex++;
      }

      // 타입 필터
      if (request.type) {
        conditions.push(`type = $${paramIndex}`);
        values.push(request.type);
        paramIndex++;
      }

      // 카테고리 필터
      if (request.category) {
        conditions.push(`category = $${paramIndex}`);
        values.push(request.category);
        paramIndex++;
      }

      // 지식베이스 ID 필터
      if (request.knowledgeBaseId) {
        conditions.push(`knowledge_base_id = $${paramIndex}`);
        values.push(request.knowledgeBaseId);
        paramIndex++;
      }

      // 즐겨찾기 필터
      if (request.isFavorite !== undefined) {
        conditions.push(`is_favorite = $${paramIndex}`);
        values.push(request.isFavorite);
        paramIndex++;
      }

      // 검색어 필터
      if (request.searchText) {
        conditions.push(`text ILIKE $${paramIndex}`);
        values.push(`%${request.searchText}%`);
        paramIndex++;
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      // 전체 개수 조회
      const countQuery = `
        SELECT COUNT(*) as total
        FROM keywords
        ${whereClause}
      `;
      const countResult = await this.db.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // 키워드 목록 조회
      const limit = request.limit || 50;
      const offset = request.offset || 0;

      const listQuery = `
        SELECT
          id,
          text,
          type,
          category,
          user_id as "userId",
          knowledge_base_id as "knowledgeBaseId",
          is_favorite as "isFavorite",
          usage_count as "usageCount",
          created_at as "createdAt",
          updated_at as "updatedAt",
          last_used_at as "lastUsedAt"
        FROM keywords
        ${whereClause}
        ORDER BY
          is_favorite DESC,
          usage_count DESC,
          created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const listValues = [...values, limit, offset];
      const listResult = await this.db.query(listQuery, listValues);      return {
        keywords: listResult.rows as Keyword[],
        total
      };
    } catch (error) {
      logger.error("[KeywordDao] 키워드 목록 조회 오류:", error);
      throw error;
    }
  }

  /**
   * 키워드 ID로 조회
   */
  async getKeywordById(id: string): Promise<Keyword | null> {
    try {
      const query = `
        SELECT
          id,
          text,
          type,
          category,
          user_id as "userId",
          knowledge_base_id as "knowledgeBaseId",
          usage_count as "usageCount",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM keywords
        WHERE id = $1
      `;

      const result = await this.db.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as Keyword;
    } catch (error) {
      logger.error("[KeywordDao] 키워드 조회 오류:", error);
      throw error;
    }
  }

  /**
   * 키워드 수정
   */
  async updateKeyword(
    id: string,
    userId: string,
    request: UpdateKeywordRequest
  ): Promise<Keyword | null> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (request.text !== undefined) {
        updates.push(`text = $${paramIndex++}`);
        values.push(request.text);
      }

      if (request.category !== undefined) {
        updates.push(`category = $${paramIndex++}`);
        values.push(request.category);
      }

      // isFavorite는 user_keyword_favorites 테이블에서 관리
      if (request.isFavorite !== undefined) {
        const isFavorite = await this.toggleFavorite(userId, id);
        // toggleFavorite 후 현재 상태가 request.isFavorite와 다르면 한 번 더 토글
        if (isFavorite !== request.isFavorite) {
          await this.toggleFavorite(userId, id);
        }
      }

      if (updates.length === 0) {
        return await this.getKeywordById(id);
      }

      values.push(id, userId);

      const query = `
        UPDATE keywords
        SET ${updates.join(", ")}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING
          id,
          text,
          type,
          category,
          user_id as "userId",
          knowledge_base_id as "knowledgeBaseId",
          usage_count as "usageCount",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const result = await this.db.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      const keyword = result.rows[0];

      // isFavorite 상태 추가
      if (request.isFavorite !== undefined) {
        keyword.isFavorite = request.isFavorite;
      } else {
        keyword.isFavorite = await this.isFavorite(userId, id);
      }      return keyword as Keyword;
    } catch (error) {
      logger.error("[KeywordDao] 키워드 수정 오류:", error);
      throw error;
    }
  }

  /**
   * 키워드 삭제
   */
  async deleteKeyword(id: string, userId: string): Promise<boolean> {
    try {
      const query = `
        DELETE FROM keywords
        WHERE id = $1 AND user_id = $2
      `;

      const result = await this.db.query(query, [id, userId]);
      const success = result.rowCount !== null && result.rowCount > 0;

      if (success) {      }

      return success;
    } catch (error) {
      logger.error("[KeywordDao] 키워드 삭제 오류:", error);
      throw error;
    }
  }

  /**
   * 키워드 사용 횟수 증가
   */
  async incrementUsageCount(id: string): Promise<void> {
    try {
      const query = `
        UPDATE keywords
        SET usage_count = usage_count + 1
        WHERE id = $1
      `;

      await this.db.query(query, [id]);    } catch (error) {
      logger.error("[KeywordDao] 키워드 사용 횟수 증가 오류:", error);
      throw error;
    }
  }

  /**
   * 즐겨찾기 토글 (user_keyword_favorites 테이블 사용)
   */
  async toggleFavorite(userId: string, keywordId: string): Promise<boolean> {
    try {
      const query = `
        INSERT INTO user_keyword_favorites (user_id, keyword_id, is_favorite)
        VALUES ($1, $2, true)
        ON CONFLICT (user_id, keyword_id)
        DO UPDATE SET
          is_favorite = NOT user_keyword_favorites.is_favorite,
          updated_at = CURRENT_TIMESTAMP
        RETURNING is_favorite
      `;

      const result = await this.db.query(query, [userId, keywordId]);
      const isFavorite = result.rows[0]?.is_favorite || false;      return isFavorite;
    } catch (error) {
      logger.error("[KeywordDao] 즐겨찾기 토글 오류:", error);
      throw error;
    }
  }

  /**
   * 즐겨찾기 상태 조회
   */
  async isFavorite(userId: string, keywordId: string): Promise<boolean> {
    try {
      const query = `
        SELECT is_favorite
        FROM user_keyword_favorites
        WHERE user_id = $1 AND keyword_id = $2
      `;

      const result = await this.db.query(query, [userId, keywordId]);
      return result.rows[0]?.is_favorite || false;
    } catch (error) {
      logger.error("[KeywordDao] 즐겨찾기 상태 조회 오류:", error);
      throw error;
    }
  }

  /**
   * 사용자별 키워드 목록 조회 (즐겨찾기 포함)
   */
  async getKeywordsWithFavorites(
    userId: string,
    request?: Partial<GetKeywordsRequest>
  ): Promise<{
    keywords: Keyword[];
    total: number;
  }> {
    try {
      const conditions: string[] = ["(k.user_id = $1 OR k.user_id IS NULL)"];
      const values: any[] = [userId];
      let paramIndex = 2;

      // 타입 필터
      if (request?.type) {
        conditions.push(`k.type = $${paramIndex}`);
        values.push(request.type);
        paramIndex++;
      }

      // 카테고리 필터
      if (request?.category) {
        conditions.push(`k.category = $${paramIndex}`);
        values.push(request.category);
        paramIndex++;
      }

      // 지식베이스 ID 필터
      if (request?.knowledgeBaseId) {
        conditions.push(`k.knowledge_base_id = $${paramIndex}`);
        values.push(request.knowledgeBaseId);
        paramIndex++;
      }

      // 즐겨찾기 필터
      if (request?.isFavorite !== undefined) {
        if (request.isFavorite) {
          conditions.push(`ukf.is_favorite = true`);
        } else {
          conditions.push(
            `(ukf.is_favorite = false OR ukf.is_favorite IS NULL)`
          );
        }
      }

      // 검색어 필터
      if (request?.searchText) {
        conditions.push(`k.text ILIKE $${paramIndex}`);
        values.push(`%${request.searchText}%`);
        paramIndex++;
      }

      const whereClause = `WHERE ${conditions.join(" AND ")}`;

      // 전체 개수 조회
      const countQuery = `
        SELECT COUNT(*) as total
        FROM keywords k
        LEFT JOIN user_keyword_favorites ukf
          ON k.id = ukf.keyword_id AND ukf.user_id = $1
        ${whereClause}
      `;
      const countResult = await this.db.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // 키워드 목록 조회
      const limit = request?.limit || 50;
      const offset = request?.offset || 0;

      const listQuery = `
        SELECT
          k.id,
          k.text,
          k.type,
          k.category,
          k.user_id as "userId",
          k.knowledge_base_id as "knowledgeBaseId",
          k.usage_count as "usageCount",
          k.created_at as "createdAt",
          k.updated_at as "updatedAt",
          COALESCE(ukf.is_favorite, false) as "isFavorite",
          ukf.usage_count as "personalUsageCount",
          ukf.last_used_at as "lastUsedAt"
        FROM keywords k
        LEFT JOIN user_keyword_favorites ukf
          ON k.id = ukf.keyword_id AND ukf.user_id = $1
        ${whereClause}
        ORDER BY
          COALESCE(ukf.is_favorite, false) DESC,
          COALESCE(ukf.usage_count, 0) DESC,
          k.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const listValues = [...values, limit, offset];
      const listResult = await this.db.query(listQuery, listValues);      return {
        keywords: listResult.rows as Keyword[],
        total
      };
    } catch (error) {
      logger.error("[KeywordDao] 사용자별 키워드 목록 조회 오류:", error);
      throw error;
    }
  }
}
