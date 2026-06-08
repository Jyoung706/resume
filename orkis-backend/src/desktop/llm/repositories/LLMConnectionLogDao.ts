import { Dao, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import type { LLMConnectionLog } from "@orkis-interface/backend";
import { PoolClient } from "pg";

// SQLite override of src/main/llm/repositories/LLMConnectionLogDao.ts
// - placeholder: $N → ?
// - INTERVAL '${N} days' → datetime('now', '-${N} days')
// - RETURNING 유지 (SQLite 3.35+ 지원). tmp/desktop 의 INSERT+SELECT 패턴은 race condition 위험으로 미채택
@Dao("LLMConnectionLogDao")
export class LLMConnectionLogDao {
  @InjectConnection("main")
  private pool!: PoolClient;

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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        WHERE llm_model_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `;

      const result = await this.pool.query(query, [modelId, limit]);
      return result.rows;
    } catch (error) {
      logger.error("[LLMConnectionLogDao] findByModelId 에러:", error);
      throw error;
    }
  }

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
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `;

      const result = await this.pool.query(query, [userId, limit]);
      return result.rows;
    } catch (error) {
      logger.error("[LLMConnectionLogDao] findByUserId 에러:", error);
      throw error;
    }
  }

  async deleteOldLogs(daysOld: number = 90): Promise<number> {
    try {
      // SQLite: PG INTERVAL 대신 datetime('now', '-N days')
      const query = `
        DELETE FROM llm_connection_logs
        WHERE created_at < datetime('now', '-${daysOld} days')
      `;

      const result = await this.pool.query(query);
      return result.rowCount || 0;
    } catch (error) {
      logger.error("[LLMConnectionLogDao] deleteOldLogs 에러:", error);
      throw error;
    }
  }
}
