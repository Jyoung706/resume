/**
 * SQL 실행 Service
 * db_id로 데이터베이스 연결을 설정하고 쿼리 실행
 */

import { Autowired, Service, Transactional } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { DbConnectionDao } from "../db-connection/DbConnectionDao";
import { DbTypeDao } from "../db-connection/DbTypeDao";
import { decryptStoredPassword } from "../db-connection/credentialDecryptor";
import {
  QueryExecutionResult,
  SqlExecutionRepository
} from "./SqlExecutionRepository";
import {
  DatabaseConfig,
  DatabaseType,
  DynamicConnectionSupport,
  MariaDBClientConfig,
  PostgreSQLClientConfig,
  SQLiteDatabaseConfig
} from "@orkis/core/database";

@Service("SqlExecutionService")
export class SqlExecutionService extends DynamicConnectionSupport {
  @Autowired("SqlExecutionRepository")
  private sqlExecutionRepository!: SqlExecutionRepository;

  @Autowired("DbConnectionDao")
  private dbConnectionDao!: DbConnectionDao;

  @Autowired("DbTypeDao")
  private dbTypeDao!: DbTypeDao;

  /**
   * db_id(connectionId)로 데이터베이스 설정을 가져와서 SQL 쿼리 실행
   * @param sqlQuery 실행할 SQL 쿼리
   * @param dbId 데이터베이스 연결 ID (db_connections 테이블의 id)
   * @param userId 사용자 ID
   * @returns QueryExecutionResult
   */
  @Transactional()
  async executeSqlQuery(
    sqlQuery: string,
    dbId: string | undefined,
    userId: string
  ): Promise<QueryExecutionResult> {
    const startTime = Date.now();

    try {

      // dbId가 제공되지 않은 경우
      if (!dbId) {        return {
          success: false,
          error: "데이터베이스가 선택되지 않았습니다",
          executionTime: Date.now() - startTime
        };
      }

      // DB 연결 정보 조회
      const connectionId = parseInt(dbId);
      if (isNaN(connectionId)) {
        logger.error(`[SqlExecutionService] 잘못된 connectionId: ${dbId}`);
        return {
          success: false,
          error: `잘못된 DB 연결 ID: ${dbId}`,
          executionTime: Date.now() - startTime
        };
      }

      const connection = await this.dbConnectionDao.findById(
        connectionId,
        userId
      );

      if (!connection) {
        logger.error(`[SqlExecutionService] DB 연결을 찾을 수 없음: ${dbId}`);
        return {
          success: false,
          error: `DB 연결을 찾을 수 없습니다: ${dbId}`,
          executionTime: Date.now() - startTime
        };
      }

      // DB 타입 정보 조회
      const dbType = await this.dbTypeDao.findById(connection.dbTypeId);
      if (!dbType) {
        logger.error(
          `[SqlExecutionService] DB 타입을 찾을 수 없음: ${connection.dbTypeId}`
        );
        return {
          success: false,
          error: `DB 타입 정보를 찾을 수 없습니다`,
          executionTime: Date.now() - startTime
        };
      }      // DatabaseConfig 생성
      const dbConfigs: DatabaseConfig = this.buildDatabaseConfig(
        connection,
        dbType.typeName
      );      // prepareDynamicDBConnection 호출하여 DB 연결 설정
      await this.prepareDynamicDBConnection(dbConfigs);

      // SQL 쿼리 실행
      const result = await this.sqlExecutionRepository.executeQuery(sqlQuery);

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "알 수 없는 오류";

      logger.error(`[SqlExecutionService] SQL 쿼리 실행 실패:`, {
        error: errorMessage,
        sqlQuery: sqlQuery.substring(0, 100),
        dbId,
        userId,
        executionTime
      });

      return {
        success: false,
        error: errorMessage,
        executionTime
      };
    }
  }

  /**
   * DB 연결 정보를 DatabaseConfig로 변환
   *
   * - SQLite: 파일 경로 기반 (변경 없음)
   * - PostgreSQL: 평문 비밀번호 복호화 사용 (이전엔 Buffer.toString() 으로 깨진 문자열을
   *   password 에 넣었던 버그를 정상화)
   * - MariaDB/MySQL: core 의 MariaDBAdapter 사용 (Stage 2/3 와 동일 패턴)
   */
  private buildDatabaseConfig(
    connection: any,
    dbTypeName: string
  ): DatabaseConfig {
    const databaseName = `${connection.connectionId}-${
      connection.connectionName
    }-${Date.now()}`;
    const type = dbTypeName.toLowerCase();

    if (type === "sqlite") {
      const config: SQLiteDatabaseConfig = {
        databaseType: "sqlite",
        databaseName,
        filePath: connection.filePath || ""
      };
      return config;
    }

    // 네트워크 DB 공용 — 메모리 안에서만 평문 비밀번호 사용 (로그/응답 노출 금지).
    // Phase 3 PR#10-1: credentialDecryptor SSOT 사용 (PostgresStreamAdapter 와 공유).
    const password = decryptStoredPassword(connection.passwordEncrypted);

    if (type === "postgresql") {
      const config: PostgreSQLClientConfig = {
        databaseType: "postgresql",
        databaseName,
        host: connection.host,
        port: connection.port,
        database: connection.databaseName,
        user: connection.username,
        password,
        connectionTimeoutMillis: 5000
      };
      return config;
    }

    if (type === "mariadb" || type === "mysql") {
      const config = {
        databaseName,
        databaseType: DatabaseType.MARIADB,
        host: connection.host,
        port: connection.port,
        user: connection.username,
        password,
        database: connection.databaseName,
        pool: false,
        connectTimeout: 5000
      } as unknown as MariaDBClientConfig;
      return config;
    }

    throw new Error(`지원하지 않는 데이터베이스 타입: ${dbTypeName}`);
  }

  // private decryptStoredPassword 는 Phase 3 PR#10-1 에서 db-connection/credentialDecryptor.ts
  // 로 추출. SqlExecutionService 는 더 이상 직접 보유하지 않고 import 사용.
}
