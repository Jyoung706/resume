import { Dao, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import type {
  DbConnection,
  CreateDbConnectionRequest,
  UpdateDbConnectionRequest
} from "@orkis-interface/backend/db-connection";
import { PoolClient } from "pg";

@Dao("DbConnectionDao")
export class DbConnectionDao {
  @InjectConnection("main")
  private pool!: PoolClient;

  async findByUserId(
    userId: string
  ): Promise<Omit<DbConnection, "passwordEncrypted">[]> {
    try {
      const query = `
        SELECT
          dc.connection_id as "connectionId",
          dc.user_id as "userId",
          dc.db_type_id as "dbTypeId",
          dc.connection_name as "connectionName",
          dc.description,
          dc.host,
          dc.port,
          dc.database_name as "databaseName",
          dc.username,
          dc.file_path as "filePath",
          dc.oracle_sid as "oracleSid",
          dc.oracle_service_name as "oracleServiceName",
          dc.additional_params as "additionalParams",
          dc.min_pool_size as "minPoolSize",
          dc.max_pool_size as "maxPoolSize",
          dc.connection_timeout as "connectionTimeout",
          dc.is_active as "isActive",
          dc.is_default as "isDefault",
          dc.last_tested as "lastTested",
          dc.last_test_status as "lastTestStatus",
          dc.last_test_message as "lastTestMessage",
          dc.created_at as "createdAt",
          dc.updated_at as "updatedAt",
          dc.last_used as "lastUsed",
          dt.type_name as "typeName"
        FROM db_connections dc
        LEFT JOIN db_types dt ON dc.db_type_id = dt.db_type_id
        WHERE dc.user_id = $1
        ORDER BY dc.is_default DESC, dc.created_at DESC
      `;

      const result = await this.pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error("[DbConnectionDao] findByUserId 에러:", error);
      throw error;
    }
  }

  async findById(
    connectionId: number,
    userId: string
  ): Promise<DbConnection | null> {
    try {
      const query = `
        SELECT
          connection_id as "connectionId",
          user_id as "userId",
          db_type_id as "dbTypeId",
          connection_name as "connectionName",
          description,
          host,
          port,
          database_name as "databaseName",
          username,
          password_encrypted as "passwordEncrypted",
          file_path as "filePath",
          oracle_sid as "oracleSid",
          oracle_service_name as "oracleServiceName",
          additional_params as "additionalParams",
          min_pool_size as "minPoolSize",
          max_pool_size as "maxPoolSize",
          connection_timeout as "connectionTimeout",
          is_active as "isActive",
          is_default as "isDefault",
          last_tested as "lastTested",
          last_test_status as "lastTestStatus",
          last_test_message as "lastTestMessage",
          created_at as "createdAt",
          updated_at as "updatedAt",
          last_used as "lastUsed"
        FROM db_connections
        WHERE connection_id = $1 AND user_id = $2
      `;

      const result = await this.pool.query(query, [connectionId, userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error("[DbConnectionDao] findById 에러:", error);
      throw error;
    }
  }

  async findByUserIdAndConnectionName(
    userId: string,
    connectionName: string
  ): Promise<DbConnection | null> {
    try {
      const query = `
        SELECT
          connection_id as "connectionId",
          user_id as "userId",
          connection_name as "connectionName"
        FROM db_connections
        WHERE user_id = $1 AND connection_name = $2 AND is_active = true
      `;

      const result = await this.pool.query(query, [userId, connectionName]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error(
        "[DbConnectionDao] findByUserIdAndConnectionName 에러:",
        error
      );
      throw error;
    }
  }

  async create(
    userId: string,
    data: CreateDbConnectionRequest,
    passwordEncrypted?: Buffer
  ): Promise<number> {
    try {
      const query = `
        INSERT INTO db_connections (
          user_id, db_type_id, connection_name, description,
          host, port, database_name, username, password_encrypted,
          file_path, oracle_sid, oracle_service_name,
          additional_params, min_pool_size, max_pool_size,
          connection_timeout, is_default
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17
        )
        RETURNING connection_id
      `;

      const values = [
        userId,
        data.dbTypeId,
        data.connectionName,
        data.description || null,
        data.host || null,
        data.port || null,
        data.databaseName,
        data.username || null,
        passwordEncrypted || null,
        data.filePath || null,
        data.oracleSid || null,
        data.oracleServiceName || null,
        data.additionalParams ? JSON.stringify(data.additionalParams) : null,
        data.minPoolSize || 2,
        data.maxPoolSize || 10,
        data.connectionTimeout || 30000,
        data.isDefault || false
      ];

      const result = await this.pool.query(query, values);
      return result.rows[0].connection_id;
    } catch (error) {
      logger.error("[DbConnectionDao] create 에러:", error);
      throw error;
    }
  }

  async update(
    connectionId: number,
    userId: string,
    data: UpdateDbConnectionRequest,
    passwordEncrypted?: Buffer
  ): Promise<void> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.connectionName !== undefined) {
        updates.push(`connection_name = $${paramIndex++}`);
        values.push(data.connectionName);
      }
      if (data.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(data.description);
      }
      if (data.host !== undefined) {
        updates.push(`host = $${paramIndex++}`);
        values.push(data.host);
      }
      if (data.port !== undefined) {
        updates.push(`port = $${paramIndex++}`);
        values.push(data.port);
      }
      if (data.databaseName !== undefined) {
        updates.push(`database_name = $${paramIndex++}`);
        values.push(data.databaseName);
      }
      if (data.username !== undefined) {
        updates.push(`username = $${paramIndex++}`);
        values.push(data.username);
      }
      if (passwordEncrypted !== undefined) {
        updates.push(`password_encrypted = $${paramIndex++}`);
        values.push(passwordEncrypted);
      }
      if (data.filePath !== undefined) {
        updates.push(`file_path = $${paramIndex++}`);
        values.push(data.filePath);
      }
      if (data.isActive !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(data.isActive);
      }
      if (data.isDefault !== undefined) {
        updates.push(`is_default = $${paramIndex++}`);
        values.push(data.isDefault);
      }

      if (updates.length === 0) {
        return;
      }

      values.push(connectionId, userId);
      const query = `
        UPDATE db_connections
        SET ${updates.join(", ")}
        WHERE connection_id = $${paramIndex++} AND user_id = $${paramIndex}
      `;

      await this.pool.query(query, values);
    } catch (error) {
      logger.error("[DbConnectionDao] update 에러:", error);
      throw error;
    }
  }

  async delete(connectionId: number, userId: string): Promise<void> {
    try {
      const query = `
        DELETE FROM db_connections
        WHERE connection_id = $1 AND user_id = $2
      `;

      const result = await this.pool.query(query, [connectionId, userId]);

      if (result.rowCount === 0) {
        throw new Error("삭제할 연결 정보를 찾을 수 없습니다.");
      }    } catch (error) {
      logger.error("[DbConnectionDao] delete 에러:", error);
      throw error;
    }
  }

  async updateTestResult(
    connectionId: number,
    status: string,
    message: string,
    userId?: string
  ): Promise<void> {
    try {
      let query: string;
      let values: any[];

      if (userId) {
        query = `
          UPDATE db_connections
          SET last_tested = CURRENT_TIMESTAMP,
              last_test_status = $2,
              last_test_message = $3
          WHERE connection_id = $1 AND user_id = $4
        `;
        values = [connectionId, status, message, userId];
      } else {
        query = `
          UPDATE db_connections
          SET last_tested = CURRENT_TIMESTAMP,
              last_test_status = $2,
              last_test_message = $3
          WHERE connection_id = $1
        `;
        values = [connectionId, status, message];
      }

      const result = await this.pool.query(query, values);

      if (result.rowCount === 0) {
      } else {      }
    } catch (error) {
      logger.error("[DbConnectionDao] updateTestResult 에러:", error);
      throw error;
    }
  }
}
