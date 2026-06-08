import { Dao, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import type {
  LLMModel,
  LLMProvider,
  LLMModelType,
  LLMConnectionStatus,
  LLMModelParameters
} from "@orkis-interface/backend";
import { PoolClient } from "pg";

// SQLite override of src/main/llm/repositories/LLMModelDao.ts
// - placeholder: $N → ?  (전체 query, dynamic update 포함)
// - RETURNING 은 SQLite 3.35+ 지원, cloud 패턴 유지
@Dao("LLMModelDao")
export class LLMModelDao {
  @InjectConnection("main")
  private pool!: PoolClient;

  async findByUserId(userId: string): Promise<LLMModel[]> {
    try {
      const query = `
        SELECT
          id,
          user_id as "userId",
          model_name as "modelName",
          display_name as "displayName",
          provider,
          model_type as "modelType",
          api_endpoint as "apiEndpoint",
          api_key_encrypted as "apiKeyEncrypted",
          api_version as "apiVersion",
          parameters,
          is_active as "isActive",
          is_default as "isDefault",
          connection_status as "connectionStatus",
          last_tested_at as "lastTestedAt",
          last_error as "lastError",
          total_requests as "totalRequests",
          total_tokens as "totalTokens",
          last_used_at as "lastUsedAt",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM llm_user_models
        WHERE user_id = ?
        ORDER BY is_default DESC, created_at DESC
      `;

      const result = await this.pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error("[LLMModelDao] findByUserId 에러:", error);
      throw error;
    }
  }

  async findById(modelId: string): Promise<LLMModel | null> {
    try {
      const query = `
        SELECT
          id,
          user_id as "userId",
          model_name as "modelName",
          display_name as "displayName",
          provider,
          model_type as "modelType",
          api_endpoint as "apiEndpoint",
          api_key_encrypted as "apiKeyEncrypted",
          api_version as "apiVersion",
          parameters,
          is_active as "isActive",
          is_default as "isDefault",
          connection_status as "connectionStatus",
          last_tested_at as "lastTestedAt",
          last_error as "lastError",
          total_requests as "totalRequests",
          total_tokens as "totalTokens",
          last_used_at as "lastUsedAt",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM llm_user_models
        WHERE id = ?
      `;

      const result = await this.pool.query(query, [modelId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error("[LLMModelDao] findById 에러:", error);
      throw error;
    }
  }

  async findDefaultByUserId(userId: string): Promise<LLMModel | null> {
    try {
      const query = `
        SELECT
          id,
          user_id as "userId",
          model_name as "modelName",
          display_name as "displayName",
          provider,
          model_type as "modelType",
          api_endpoint as "apiEndpoint",
          api_key_encrypted as "apiKeyEncrypted",
          api_version as "apiVersion",
          parameters,
          is_active as "isActive",
          is_default as "isDefault",
          connection_status as "connectionStatus",
          last_tested_at as "lastTestedAt",
          last_error as "lastError",
          total_requests as "totalRequests",
          total_tokens as "totalTokens",
          last_used_at as "lastUsedAt",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM llm_user_models
        WHERE user_id = ? AND is_default = TRUE
        LIMIT 1
      `;

      const result = await this.pool.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error("[LLMModelDao] findDefaultByUserId 에러:", error);
      throw error;
    }
  }

  async existsByUserIdAndModelName(
    userId: string,
    modelName: string
  ): Promise<boolean> {
    // SQLite: `exists` 는 예약어라 column alias 불가. SELECT 1 + length 로 대체.
    try {
      const query = `
        SELECT 1
        FROM llm_user_models
        WHERE user_id = ? AND model_name = ?
        LIMIT 1
      `;

      const result = await this.pool.query(query, [userId, modelName]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error("[LLMModelDao] existsByUserIdAndModelName 에러:", error);
      throw error;
    }
  }

  async create(data: {
    userId: string;
    modelName: string;
    displayName: string;
    provider: LLMProvider;
    modelType: LLMModelType;
    apiEndpoint: string;
    apiKeyEncrypted: string;
    apiVersion?: string;
    parameters: LLMModelParameters;
    isDefault: boolean;
    connectionStatus?: LLMConnectionStatus;
  }): Promise<LLMModel> {
    try {
      const query = `
        INSERT INTO llm_user_models (
          user_id,
          model_name,
          display_name,
          provider,
          model_type,
          api_endpoint,
          api_key_encrypted,
          api_version,
          parameters,
          is_default,
          connection_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING
          id,
          user_id as "userId",
          model_name as "modelName",
          display_name as "displayName",
          provider,
          model_type as "modelType",
          api_endpoint as "apiEndpoint",
          api_key_encrypted as "apiKeyEncrypted",
          api_version as "apiVersion",
          parameters,
          is_active as "isActive",
          is_default as "isDefault",
          connection_status as "connectionStatus",
          last_tested_at as "lastTestedAt",
          last_error as "lastError",
          total_requests as "totalRequests",
          total_tokens as "totalTokens",
          last_used_at as "lastUsedAt",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const result = await this.pool.query(query, [
        data.userId,
        data.modelName,
        data.displayName,
        data.provider,
        data.modelType,
        data.apiEndpoint,
        data.apiKeyEncrypted,
        data.apiVersion,
        JSON.stringify(data.parameters),
        data.isDefault,
        data.connectionStatus || "unknown"
      ]);

      return result.rows[0];
    } catch (error) {
      logger.error("[LLMModelDao] create 에러:", error);
      throw error;
    }
  }

  async update(
    modelId: string,
    data: Partial<{
      provider: string;
      modelName: string;
      displayName: string;
      apiEndpoint: string;
      apiKeyEncrypted: string;
      apiVersion: string;
      parameters: LLMModelParameters;
      isActive: boolean;
      isDefault: boolean;
    }>
  ): Promise<LLMModel> {
    try {
      const updates: string[] = [];
      const values: any[] = [];

      if (data.provider !== undefined) {
        updates.push(`provider = ?`);
        values.push(data.provider);
      }
      if (data.modelName !== undefined) {
        updates.push(`model_name = ?`);
        values.push(data.modelName);
      }
      if (data.displayName !== undefined) {
        updates.push(`display_name = ?`);
        values.push(data.displayName);
      }
      if (data.apiEndpoint !== undefined) {
        updates.push(`api_endpoint = ?`);
        values.push(data.apiEndpoint);
      }
      if (data.apiKeyEncrypted !== undefined) {
        updates.push(`api_key_encrypted = ?`);
        values.push(data.apiKeyEncrypted);
      }
      if (data.apiVersion !== undefined) {
        updates.push(`api_version = ?`);
        values.push(data.apiVersion);
      }
      if (data.parameters !== undefined) {
        updates.push(`parameters = ?`);
        values.push(JSON.stringify(data.parameters));
      }
      if (data.isActive !== undefined) {
        updates.push(`is_active = ?`);
        values.push(data.isActive);
      }
      if (data.isDefault !== undefined) {
        updates.push(`is_default = ?`);
        values.push(data.isDefault);
      }

      values.push(modelId);

      const query = `
        UPDATE llm_user_models
        SET ${updates.join(", ")}
        WHERE id = ?
        RETURNING
          id,
          user_id as "userId",
          model_name as "modelName",
          display_name as "displayName",
          provider,
          model_type as "modelType",
          api_endpoint as "apiEndpoint",
          api_key_encrypted as "apiKeyEncrypted",
          api_version as "apiVersion",
          parameters,
          is_active as "isActive",
          is_default as "isDefault",
          connection_status as "connectionStatus",
          last_tested_at as "lastTestedAt",
          last_error as "lastError",
          total_requests as "totalRequests",
          total_tokens as "totalTokens",
          last_used_at as "lastUsedAt",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error("[LLMModelDao] update 에러:", error);
      throw error;
    }
  }

  async delete(modelId: string): Promise<void> {
    try {
      const query = "DELETE FROM llm_user_models WHERE id = ?";
      await this.pool.query(query, [modelId]);
    } catch (error) {
      logger.error("[LLMModelDao] delete 에러:", error);
      throw error;
    }
  }

  async unsetDefault(userId: string): Promise<void> {
    try {
      const query = `
        UPDATE llm_user_models
        SET is_default = FALSE
        WHERE user_id = ? AND is_default = TRUE
      `;
      await this.pool.query(query, [userId]);
    } catch (error) {
      logger.error("[LLMModelDao] unsetDefault 에러:", error);
      throw error;
    }
  }

  async updateUsageStats(
    modelId: string,
    requestCount: number,
    tokenCount: number
  ): Promise<void> {
    try {
      const query = `
        UPDATE llm_user_models
        SET
          total_requests = total_requests + ?,
          total_tokens = total_tokens + ?,
          last_used_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      await this.pool.query(query, [requestCount, tokenCount, modelId]);
    } catch (error) {
      logger.error("[LLMModelDao] updateUsageStats 에러:", error);
      throw error;
    }
  }

  async updateConnectionStatus(
    modelId: string,
    status: LLMConnectionStatus,
    lastError?: string
  ): Promise<void> {
    try {
      const query = `
        UPDATE llm_user_models
        SET
          connection_status = ?,
          last_tested_at = CURRENT_TIMESTAMP,
          last_error = ?
        WHERE id = ?
      `;
      await this.pool.query(query, [status, lastError || null, modelId]);
    } catch (error) {
      logger.error("[LLMModelDao] updateConnectionStatus 에러:", error);
      throw error;
    }
  }
}
