import { Dao, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import type {
  DbConnection,
  CreateDbConnectionRequest,
  UpdateDbConnectionRequest
} from "@orkis-interface/backend/db-connection";
import { PoolClient } from "pg";

// SQLite override of src/main/db-connection/DbConnectionDao.ts
// - placeholder: $N → ? (위치 순서 의존)
// - boolean(is_active/is_default) → 1/0 (SQLite INTEGER), is_active = true → is_active = 1
// - create: RETURNING 회피 → INSERT 후 SELECT (connection_name unique 로 안전, orkis-core RETURNING 버그 우회)
// - additional_params 는 JSON TEXT 저장(JSON.stringify), 조회는 raw 반환(frontend 미파싱, cloud 와 계약 동일)
// - password_encrypted Buffer 는 sqlite3 BLOB 바인딩 지원
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
        WHERE dc.user_id = ?
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
        WHERE connection_id = ? AND user_id = ?
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
        WHERE user_id = ? AND connection_name = ? AND is_active = 1
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
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?
        )
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
        data.isDefault ? 1 : 0
      ];

      await this.pool.query(query, values);

      // RETURNING 회피: connection_name 은 (user_id) 내 unique → 직전 INSERT row 안전 조회
      const selectResult = await this.pool.query(
        `SELECT connection_id FROM db_connections
         WHERE user_id = ? AND connection_name = ?
         ORDER BY connection_id DESC LIMIT 1`,
        [userId, data.connectionName]
      );
      return selectResult.rows[0].connection_id;
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

      if (data.connectionName !== undefined) {
        updates.push(`connection_name = ?`);
        values.push(data.connectionName);
      }
      if (data.description !== undefined) {
        updates.push(`description = ?`);
        values.push(data.description);
      }
      if (data.host !== undefined) {
        updates.push(`host = ?`);
        values.push(data.host);
      }
      if (data.port !== undefined) {
        updates.push(`port = ?`);
        values.push(data.port);
      }
      if (data.databaseName !== undefined) {
        updates.push(`database_name = ?`);
        values.push(data.databaseName);
      }
      if (data.username !== undefined) {
        updates.push(`username = ?`);
        values.push(data.username);
      }
      if (passwordEncrypted !== undefined) {
        updates.push(`password_encrypted = ?`);
        values.push(passwordEncrypted);
      }
      if (data.filePath !== undefined) {
        updates.push(`file_path = ?`);
        values.push(data.filePath);
      }
      if (data.isActive !== undefined) {
        updates.push(`is_active = ?`);
        values.push(data.isActive ? 1 : 0);
      }
      if (data.isDefault !== undefined) {
        updates.push(`is_default = ?`);
        values.push(data.isDefault ? 1 : 0);
      }

      if (updates.length === 0) {
        return;
      }

      values.push(connectionId, userId);
      const query = `
        UPDATE db_connections
        SET ${updates.join(", ")}
        WHERE connection_id = ? AND user_id = ?
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
        WHERE connection_id = ? AND user_id = ?
      `;

      const result = await this.pool.query(query, [connectionId, userId]);

      if (result.rowCount === 0) {
        throw new Error("삭제할 연결 정보를 찾을 수 없습니다.");
      }
    } catch (error) {
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
              last_test_status = ?,
              last_test_message = ?
          WHERE connection_id = ? AND user_id = ?
        `;
        values = [status, message, connectionId, userId];
      } else {
        query = `
          UPDATE db_connections
          SET last_tested = CURRENT_TIMESTAMP,
              last_test_status = ?,
              last_test_message = ?
          WHERE connection_id = ?
        `;
        values = [status, message, connectionId];
      }

      await this.pool.query(query, values);
    } catch (error) {
      logger.error("[DbConnectionDao] updateTestResult 에러:", error);
      throw error;
    }
  }
}
