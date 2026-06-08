import { Dao, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import type {
  GetRecommendedQuestionsRequest,
  RecommendedQuestion
} from "@orkis-interface/backend/recommended-question";
import { PoolClient } from "pg";

@Dao("RecommendedQuestionDao")
export class RecommendedQuestionDao {
  @InjectConnection("main")
  private db!: PoolClient;

  /**
   * 추천 질문 목록 조회 (필터링)
   */
  async findQuestionsByConditions(
    params: GetRecommendedQuestionsRequest
  ): Promise<RecommendedQuestion[]> {
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // 활성화 필터 (기본값: true)
      const isActive = params.isActive !== undefined ? params.isActive : true;
      conditions.push(`is_active = $${paramIndex++}`);
      values.push(isActive);

      // 카테고리 필터
      if (params.category) {
        conditions.push(`category = $${paramIndex++}`);
        values.push(params.category);
      }

      // 질문 타입 필터
      if (params.questionType) {
        conditions.push(`question_type = $${paramIndex++}`);
        values.push(params.questionType);
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      // LIMIT 처리
      const limitClause = params.limit ? `LIMIT $${paramIndex++}` : "";
      if (params.limit) {
        values.push(params.limit);
      }

      const query = `
        SELECT
          id,
          question_no as "questionNo",
          question,
          category,
          question_type as "questionType",
          icon_path as "iconPath",
          sort_order as "sortOrder",
          is_active as "isActive",
          view_count as "viewCount",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM recommended_questions
        ${whereClause}
        ORDER BY RANDOM()
        ${limitClause}
      `;      const result = await this.db.query(query, values);
      return result.rows as RecommendedQuestion[];
    } catch (error) {
      logger.error(
        "[RecommendedQuestionDao] findQuestionsByConditions 에러:",
        error
      );
      throw error;
    }
  }

  /**
   * 추천 질문 총 개수 조회
   */
  async countQuestions(
    params: GetRecommendedQuestionsRequest
  ): Promise<number> {
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // 활성화 필터
      const isActive = params.isActive !== undefined ? params.isActive : true;
      conditions.push(`is_active = $${paramIndex++}`);
      values.push(isActive);

      // 카테고리 필터
      if (params.category) {
        conditions.push(`category = $${paramIndex++}`);
        values.push(params.category);
      }

      // 질문 타입 필터
      if (params.questionType) {
        conditions.push(`question_type = $${paramIndex++}`);
        values.push(params.questionType);
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const query = `
        SELECT COUNT(*) as count
        FROM recommended_questions
        ${whereClause}
      `;

      const result = await this.db.query(query, values);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error("[RecommendedQuestionDao] countQuestions 에러:", error);
      throw error;
    }
  }
}
