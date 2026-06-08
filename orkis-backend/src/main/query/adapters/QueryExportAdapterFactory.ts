/**
 * Phase 1 PR#5b - export adapter 의 connectionId/dbId → IDbStreamAdapter resolver.
 *
 * 기존 QueryExportService.resolveDbPath 의 로직을 이전.
 * SQLite 외 type 은 Phase 3+ 에서 추가될 때까지 throw.
 *
 * 참조: docs/2026-06-01/bulk-download-streaming-plan.md (§9, D22)
 */
import { Autowired, Service } from "@orkis/core/common";
import path from "path";
import fs from "fs";
import { DbConnectionDao } from "../../db-connection/DbConnectionDao";
import { DbTypeDao } from "../../db-connection/DbTypeDao";
import { decryptStoredPassword } from "../../db-connection/credentialDecryptor";
import { IDbStreamAdapter } from "./IDbStreamAdapter";
import { SqliteStreamAdapter } from "./SqliteStreamAdapter";
import { PostgresStreamAdapter } from "./PostgresStreamAdapter";
import { MariadbStreamAdapter } from "./MariadbStreamAdapter";

export interface ResolveAdapterInput {
  dbId?: string;
  connectionId?: number;
  userId: string;
}

@Service("QueryExportAdapterFactory")
export class QueryExportAdapterFactory {
  @Autowired("DbConnectionDao")
  private dbConnectionDao!: DbConnectionDao;

  @Autowired("DbTypeDao")
  private dbTypeDao!: DbTypeDao;

  /**
   * connectionId 우선, 없으면 dbId.
   *   - SQLite: SqliteStreamAdapter (filePath 기반)
   *   - PostgreSQL: PostgresStreamAdapter (Phase 3 PR#10-2)
   *   - 기타 type 은 throw (Phase 3 PR#11 / Phase 4 에서 확장)
   *   - dbId 경로는 SQLite 전용 (share/sqlite/<dbId>/...)
   */
  async resolve(opts: ResolveAdapterInput): Promise<IDbStreamAdapter> {
    const { connectionId, dbId, userId } = opts;

    if (connectionId) {
      const connection = await this.dbConnectionDao.findById(
        connectionId,
        userId
      );
      if (!connection) {
        throw new Error(
          `DB 연결 정보를 찾을 수 없습니다. (connectionId: ${connectionId})`
        );
      }
      const dbType = await this.dbTypeDao.findById(connection.dbTypeId);
      if (!dbType) {
        throw new Error("DB 타입 정보를 찾을 수 없습니다.");
      }

      if (dbType.typeName === "SQLite") {
        if (!connection.filePath) {
          throw new Error("DB 파일 경로가 비어 있습니다.");
        }
        return new SqliteStreamAdapter(connection.filePath);
      }

      if (dbType.typeName === "PostgreSQL") {
        // Phase 3 PR#10-2: PostgresStreamAdapter
        // DbConnection 의 host/port/username/databaseName 은 type 상 optional 이지만
        // PostgreSQL 연결은 모두 필수 - 미입력 시 명시 throw.
        if (
          !connection.host ||
          connection.port == null ||
          !connection.username ||
          !connection.databaseName
        ) {
          throw new Error(
            "PostgreSQL 연결 정보가 불완전합니다. (host / port / username / databaseName 확인)"
          );
        }
        const password = decryptStoredPassword(connection.passwordEncrypted);
        return new PostgresStreamAdapter({
          host: connection.host,
          port: connection.port,
          database: connection.databaseName,
          user: connection.username,
          password,
          connectionTimeoutMillis: connection.connectionTimeout ?? 5000
        });
      }

      if (dbType.typeName === "MySQL" || dbType.typeName === "MariaDB") {
        // Phase 3 PR#11-3: MariadbStreamAdapter (mariadb driver 사용)
        // mariadb driver 는 MariaDB 와 MySQL 모두 wire protocol 호환 - 본 adapter 가
        // 두 type 모두 처리. core 의 @orkis/core 가 mariadb 를 transitive dependency
        // 로 갖고 있어 backend 에 별도 dependency 추가 불필요.
        if (
          !connection.host ||
          connection.port == null ||
          !connection.username ||
          !connection.databaseName
        ) {
          throw new Error(
            `${dbType.typeName} 연결 정보가 불완전합니다. (host / port / username / databaseName 확인)`
          );
        }
        const password = decryptStoredPassword(connection.passwordEncrypted);
        return new MariadbStreamAdapter(
          {
            host: connection.host,
            port: connection.port,
            database: connection.databaseName,
            user: connection.username,
            password,
            connectionTimeoutMillis: connection.connectionTimeout ?? 5000
          },
          dbType.typeName as "MariaDB" | "MySQL"
        );
      }

      throw new Error(
        `현재 ${dbType.typeName} 은 export 를 지원하지 않습니다.`
      );
    }

    if (dbId) {
      // dbId 분기는 SQLite 전용 (share/sqlite/<dbId>/...)
      const filePath = await this.resolveSqliteFilePathByDbId(dbId);
      return new SqliteStreamAdapter(filePath);
    }

    throw new Error("connectionId 또는 dbId 가 필요합니다.");
  }

  private async resolveSqliteFilePathByDbId(dbId: string): Promise<string> {
    const baseDir = path.join(process.cwd(), "share", "sqlite");
    const dbFolder = path.join(baseDir, dbId);
    if (!fs.existsSync(dbFolder)) {
      throw new Error(`DB 폴더를 찾을 수 없습니다: ${dbFolder}`);
    }
    const candidates = [
      path.join(dbFolder, `${path.basename(dbId)}.sqlite`),
      path.join(dbFolder, `${path.basename(dbId)}.sqlite3`),
      path.join(dbFolder, `${path.basename(dbId)}.db`)
    ];
    for (const file of candidates) {
      if (fs.existsSync(file)) return file;
    }
    throw new Error(`DB 파일을 찾을 수 없습니다: ${dbFolder}`);
  }
}
