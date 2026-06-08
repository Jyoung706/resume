import { Dao, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import type {
  CreateKeywordRequest,
  GetKeywordsRequest,
  Keyword,
  UpdateKeywordRequest
} from "@orkis-interface/backend/keyword";
import { PoolClient } from "pg";

// SQLite override of src/main/keyword/KeywordDao.ts
// - placeholder: $N → ?
// - ILIKE → LIKE (SQLite LIKE 는 ASCII case-insensitive default)
// - RETURNING 유지 (orkis-core 1.0.25 db.each 처리)
// - ON CONFLICT (user_id, keyword_id) DO UPDATE: SQLite 3.24+ 동일 동작
// - NOT user_keyword_favorites.is_favorite: SQLite INTEGER 의 NOT 연산 (0↔1)
// - boolean true/false 리터럴 → 1/0
// - schema 차이 대응: keywords 테이블엔 is_favorite 컬럼 없음 (user_keyword_favorites 에만).
//   getKeywords 의 isFavorite 필터/SELECT 는 LEFT JOIN ukf 패턴으로 변환.
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
        ) VALUES (?, ?, ?, ?, ?)
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
        userId,
        request.knowledgeBaseId || null
      ];

      const result = await this.db.query(query, values);
      const keyword = result.rows[0];

      if (request.isFavorite) {
        await this.toggleFavorite(userId, keyword.id);
        keyword.isFavorite = true;
      } else {
        keyword.isFavorite = false;
      }
      return keyword as Keyword;
    } catch (error) {
      logger.error("[KeywordDao] 키워드 생성 오류:", error);
      throw error;
    }
  }

  /**
   * 키워드 목록 조회 — LEFT JOIN user_keyword_favorites (SQLite schema 정합).
   *   cloud 의 keywords.is_favorite 컬럼 가정과 달리 desktop schema 는 별도 테이블.
   *   request.userId 가 없으면 ukf 매칭 NULL → isFavorite 0.
   */
  async getKeywords(request: GetKeywordsRequest): Promise<{
    keywords: Keyword[];
    total: number;
  }> {
    try {
      const conditions: string[] = [];
      const values: any[] = [];

      // LEFT JOIN 파라미터 (userId 가 없을 땐 NULL → ukf 모두 NULL)
      const userIdForJoin = request.userId ?? null;

      // 사용자 ID 필터 (keywords.user_id)
      if (request.userId) {
        conditions.push(`(k.user_id = ? OR k.user_id IS NULL)`);
        values.push(request.userId);
      }

      if (request.type) {
        conditions.push(`k.type = ?`);
        values.push(request.type);
      }

      if (request.category) {
        conditions.push(`k.category = ?`);
        values.push(request.category);
      }

      if (request.knowledgeBaseId) {
        conditions.push(`k.knowledge_base_id = ?`);
        values.push(request.knowledgeBaseId);
      }

      // 즐겨찾기 필터: cloud 의 keywords.is_favorite 대신 ukf.is_favorite 참조
      if (request.isFavorite !== undefined) {
        if (request.isFavorite) {
          conditions.push(`ukf.is_favorite = 1`);
        } else {
          conditions.push(`(ukf.is_favorite = 0 OR ukf.is_favorite IS NULL)`);
        }
      }

      // 검색어 필터 (LIKE — SQLite ASCII case-insensitive)
      if (request.searchText) {
        conditions.push(`k.text LIKE ?`);
        values.push(`%${request.searchText}%`);
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      // 전체 개수 조회 (count 전용 — JOIN 동일하게 적용해야 ukf 필터 반영)
      const countQuery = `
        SELECT COUNT(*) as total
        FROM keywords k
        LEFT JOIN user_keyword_favorites ukf
          ON k.id = ukf.keyword_id AND ukf.user_id = ?
        ${whereClause}
      `;
      const countResult = await this.db.query(countQuery, [
        userIdForJoin,
        ...values
      ]);
      const total = parseInt(countResult.rows[0].total);

      // 키워드 목록 조회
      const limit = request.limit || 50;
      const offset = request.offset || 0;

      const listQuery = `
        SELECT
          k.id,
          k.text,
          k.type,
          k.category,
          k.user_id as "userId",
          k.knowledge_base_id as "knowledgeBaseId",
          COALESCE(ukf.is_favorite, 0) as "isFavorite",
          k.usage_count as "usageCount",
          k.created_at as "createdAt",
          k.updated_at as "updatedAt",
          ukf.last_used_at as "lastUsedAt"
        FROM keywords k
        LEFT JOIN user_keyword_favorites ukf
          ON k.id = ukf.keyword_id AND ukf.user_id = ?
        ${whereClause}
        ORDER BY
          COALESCE(ukf.is_favorite, 0) DESC,
          k.usage_count DESC,
          k.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const listValues = [userIdForJoin, ...values, limit, offset];
      const listResult = await this.db.query(listQuery, listValues);
      return {
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
        WHERE id = ?
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

      if (request.text !== undefined) {
        updates.push(`text = ?`);
        values.push(request.text);
      }

      if (request.category !== undefined) {
        updates.push(`category = ?`);
        values.push(request.category);
      }

      // isFavorite 는 user_keyword_favorites 테이블에서 관리
      if (request.isFavorite !== undefined) {
        const isFavorite = await this.toggleFavorite(userId, id);
        // toggleFavorite 후 현재 상태가 request.isFavorite 와 다르면 한 번 더 토글
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
        WHERE id = ? AND user_id = ?
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

      if (request.isFavorite !== undefined) {
        keyword.isFavorite = request.isFavorite;
      } else {
        keyword.isFavorite = await this.isFavorite(userId, id);
      }
      return keyword as Keyword;
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
        WHERE id = ? AND user_id = ?
      `;

      const result = await this.db.query(query, [id, userId]);
      return result.rowCount !== null && result.rowCount > 0;
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
        WHERE id = ?
      `;

      await this.db.query(query, [id]);
    } catch (error) {
      logger.error("[KeywordDao] 키워드 사용 횟수 증가 오류:", error);
      throw error;
    }
  }

  /**
   * 즐겨찾기 토글 (user_keyword_favorites 테이블).
   *   ON CONFLICT DO UPDATE 의 NOT user_keyword_favorites.is_favorite 는
   *   SQLite INTEGER 의 NOT 연산 (0↔1) — boolean 의미 일관.
   */
  async toggleFavorite(userId: string, keywordId: string): Promise<boolean> {
    try {
      const query = `
        INSERT INTO user_keyword_favorites (user_id, keyword_id, is_favorite)
        VALUES (?, ?, 1)
        ON CONFLICT (user_id, keyword_id)
        DO UPDATE SET
          is_favorite = NOT user_keyword_favorites.is_favorite,
          updated_at = CURRENT_TIMESTAMP
        RETURNING is_favorite
      `;

      const result = await this.db.query(query, [userId, keywordId]);
      // SQLite 의 is_favorite 은 INTEGER (1/0). boolean 변환.
      return result.rows[0]?.is_favorite === 1;
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
        WHERE user_id = ? AND keyword_id = ?
      `;

      const result = await this.db.query(query, [userId, keywordId]);
      return result.rows[0]?.is_favorite === 1;
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
      const conditions: string[] = ["(k.user_id = ? OR k.user_id IS NULL)"];
      const values: any[] = [userId];

      if (request?.type) {
        conditions.push(`k.type = ?`);
        values.push(request.type);
      }

      if (request?.category) {
        conditions.push(`k.category = ?`);
        values.push(request.category);
      }

      if (request?.knowledgeBaseId) {
        conditions.push(`k.knowledge_base_id = ?`);
        values.push(request.knowledgeBaseId);
      }

      if (request?.isFavorite !== undefined) {
        if (request.isFavorite) {
          conditions.push(`ukf.is_favorite = 1`);
        } else {
          conditions.push(`(ukf.is_favorite = 0 OR ukf.is_favorite IS NULL)`);
        }
      }

      if (request?.searchText) {
        conditions.push(`k.text LIKE ?`);
        values.push(`%${request.searchText}%`);
      }

      const whereClause = `WHERE ${conditions.join(" AND ")}`;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM keywords k
        LEFT JOIN user_keyword_favorites ukf
          ON k.id = ukf.keyword_id AND ukf.user_id = ?
        ${whereClause}
      `;
      const countResult = await this.db.query(countQuery, [userId, ...values]);
      const total = parseInt(countResult.rows[0].total);

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
          COALESCE(ukf.is_favorite, 0) as "isFavorite",
          ukf.usage_count as "personalUsageCount",
          ukf.last_used_at as "lastUsedAt"
        FROM keywords k
        LEFT JOIN user_keyword_favorites ukf
          ON k.id = ukf.keyword_id AND ukf.user_id = ?
        ${whereClause}
        ORDER BY
          COALESCE(ukf.is_favorite, 0) DESC,
          COALESCE(ukf.usage_count, 0) DESC,
          k.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const listValues = [userId, ...values, limit, offset];
      const listResult = await this.db.query(listQuery, listValues);
      return {
        keywords: listResult.rows as Keyword[],
        total
      };
    } catch (error) {
      logger.error("[KeywordDao] 사용자별 키워드 목록 조회 오류:", error);
      throw error;
    }
  }
}
