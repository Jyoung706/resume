import { Dao, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import type { LLMConnectionLog } from "@orkis-interface/backend";
import { PoolClient } from "pg";

@Dao("LLMConnectionLogDao")
export class LLMConnectionLogDao {
  @InjectConnection("main")
  private pool!: PoolClient;

  /**
   * 연결 테스트 로그 생성
   */
  async create(data: {
    llmModelId: string;
    userId: string;
    testType: "manual" | "auto" | "system";
    testResult: "success" | "failure" | "timeout";
    responseTimeMs?: number;
    statusCode?: number;
    errorMessage?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<LLMConnectionLog> {
    try {
      const query = `
        INSERT INTO llm_connection_logs (
          llm_model_id,
          user_id,
          test_type,
          test_result,
          response_time_ms,
          status_code,
          error_message,
          ip_address,
          user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING
          id,
          llm_model_id as "llmModelId",
          user_id as "userId",
          test_type as "testType",
          test_result as "testResult",
          response_time_ms as "responseTimeMs",
          status_code as "statusCode",
          error_message as "errorMessage",
          ip_address as "ipAddress",
          user_agent as "userAgent",
          created_at as "createdAt"
      `;

      const result = await this.pool.query(query, [
        data.llmModelId,
        data.userId,
        data.testType,
        data.testResult,
        data.responseTimeMs,
        data.statusCode,
        data.errorMessage,
        data.ipAddress,
        data.userAgent
      ]);

      return result.rows[0];
    } catch (error) {
      logger.error("[LLMConnectionLogDao] create 에러:", error);
      throw error;
    }
  }

  /**
   * 모델별 로그 조회
   */
  async findByModelId(
    modelId: string,
    limit: number = 10
  ): Promise<LLMConnectionLog[]> {
    try {
      const query = `
        SELECT
          id,
          llm_model_id as "llmModelId",
          user_id as "userId",
          test_type as "testType",
          test_result as "testResult",
          response_time_ms as "responseTimeMs",
          status_code as "statusCode",
          error_message as "errorMessage",
          ip_address as "ipAddress",
          user_agent as "userAgent",
          created_at as "createdAt"
        FROM llm_connection_logs
        WHERE llm_model_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;

      const result = await this.pool.query(query, [modelId, limit]);
      return result.rows;
    } catch (error) {
      logger.error("[LLMConnectionLogDao] findByModelId 에러:", error);
      throw error;
    }
  }

  /**
   * 사용자별 로그 조회
   */
  async findByUserId(
    userId: string,
    limit: number = 50
  ): Promise<LLMConnectionLog[]> {
    try {
      const query = `
        SELECT
          id,
          llm_model_id as "llmModelId",
          user_id as "userId",
          test_type as "testType",
          test_result as "testResult",
          response_time_ms as "responseTimeMs",
          status_code as "statusCode",
          error_message as "errorMessage",
          ip_address as "ipAddress",
          user_agent as "userAgent",
          created_at as "createdAt"
        FROM llm_connection_logs
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;

      const result = await this.pool.query(query, [userId, limit]);
      return result.rows;
    } catch (error) {
      logger.error("[LLMConnectionLogDao] findByUserId 에러:", error);
      throw error;
    }
  }

  /**
   * 오래된 로그 삭제
   */
  async deleteOldLogs(daysOld: number = 90): Promise<number> {
    try {
      const query = `
        DELETE FROM llm_connection_logs
        WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'
      `;

      const result = await this.pool.query(query);
      return result.rowCount || 0;
    } catch (error) {
      logger.error("[LLMConnectionLogDao] deleteOldLogs 에러:", error);
      throw error;
    }
  }
}
