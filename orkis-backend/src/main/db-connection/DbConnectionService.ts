import { Autowired, InjectConnection, Service } from "@orkis/core/common";
import {
  DatabaseFactory,
  DatabaseType,
  type MariaDBClientConfig
} from "@orkis/core/database";
import logger from "@orkis/core/utils";
import crypto from "crypto";
import fs from "fs";
import type {
  AddColumnRequest,
  AddColumnResponse,
  CheckUploadPathExistsRequest,
  CheckUploadPathExistsResponse,
  CreateDbConnectionRequest,
  CreateTableRequest,
  CreateTableResponse,
  DbConnectionListResponse,
  DbSchemaColumn,
  DbSchemaTable,
  DbType,
  DeleteColumnResponse,
  DeleteTableResponse,
  GetDbSchemaResponse,
  GetTableDetailResponse,
  InsertTableDataRequest,
  InsertTableDataResponse,
  TestDbConnectionRequest,
  TestDbConnectionResponse,
  UpdateColumnRequest,
  UpdateColumnResponse,
  UpdateDbConnectionRequest,
  UpdateTableRequest,
  UpdateTableResponse
} from "@orkis-interface/backend/db-connection";
import path from "path";
import { PoolClient } from "pg";
import { ValidationError } from "../error/ValidationError";
import { LLMModelService } from "../llm/services/LLMModelService";
import { DbConnectionDao } from "@/db-connection/DbConnectionDao";
import { DbTypeDao } from "@/db-connection/DbTypeDao";
// type-only import — 런타임 순환 의존성 없음 (RagPreprocessingService 는 DbConnectionService 를 import 하지 않음)
import type { RagPreprocessingService } from "./RagPreprocessingService";

@Service({ name: "DbConnectionService" })
export class DbConnectionService {
  @Autowired("DbTypeDao")
  private dbTypeDao!: DbTypeDao;

  @Autowired("DbConnectionDao")
  private dbConnectionDao!: DbConnectionDao;

  @Autowired("RagPreprocessingService")
  private ragPreprocessingService!: RagPreprocessingService;

  @Autowired("LLMModelService")
  private llmModelService!: LLMModelService;

  @InjectConnection("main")
  private pool!: PoolClient;

  private readonly ENCRYPTION_KEY =
    process.env.DB_PASSWORD_ENCRYPTION_KEY ||
    "default-key-change-me-in-production";

  async getDbTypes(): Promise<DbType[]> {
    return await this.dbTypeDao.findAll();
  }

  async getSystemDbInfo(): Promise<any> {
    try {
      const versionQuery = await this.pool.query("SELECT version()");

      return {
        connectionName: "ORKIS Main Database",
        dbType: "PostgreSQL",
        host: process.env.POSTGRES_HOST || "localhost",
        port: parseInt(process.env.POSTGRES_PORT || "5432"),
        databaseName: process.env.POSTGRES_DB_NAME || "orkisdb",
        username: process.env.POSTGRES_USER || "postgres",
        status: "connected",
        serverVersion: versionQuery.rows[0]?.version || "Unknown"
      };
    } catch (error) {
      logger.error("[DbConnectionService] getSystemDbInfo 에러:", error);
      throw error;
    }
  }

  async getDbConnections(userId: string): Promise<DbConnectionListResponse> {
    const connections = await this.dbConnectionDao.findByUserId(userId);
    return {
      connections,
      total: connections.length
    };
  }

  async getDbConnectionDetail(
    connectionId: number,
    userId: string
  ): Promise<any> {
    // 인가: DbConnectionDao.findById 는 "WHERE connection_id = $1 AND user_id = $2"
    // 로 본인 소유 connection 만 반환한다. 타 사용자 connection 은 null.
    const connection = await this.dbConnectionDao.findById(
      connectionId,
      userId
    );
    if (!connection) {
      throw new ValidationError("데이터베이스 연결을 찾을 수 없습니다.");
    }

    // 이중 안전장치: 혹시 DAO 가 user_id 매칭을 누락해 다른 사용자의 row 가
    // 반환되더라도 여기서 차단 (평문 password 응답이라 추가 가드 필요)
    if (connection.userId && connection.userId !== userId) {
      logger.error(
        `[DbConnectionService] 인가 위반 시도 connectionId=${connectionId} owner=${connection.userId} requester=${userId}`
      );
      throw new ValidationError("데이터베이스 연결을 찾을 수 없습니다.");
    }

    // 본인이 등록한 비밀번호의 확인·수정을 위해 평문 password 를 추가하고,
    // 원본 암호화 Buffer 는 응답에서 제거한다 (운영 정책: 동일 user_id 인증 세션 한정)
    let password: string | undefined;
    if (connection.passwordEncrypted) {
      try {
        const buf = Buffer.isBuffer(connection.passwordEncrypted)
          ? connection.passwordEncrypted
          : Buffer.from(connection.passwordEncrypted);
        password = this.decryptPassword(buf);
      } catch (err: any) {
        // 평문 노출 위험 회피 — 비밀번호 값은 절대 로그에 출력하지 않음. 메타데이터만.
        logger.warn(
          `[DbConnectionService] decryptPassword 실패 connectionId=${connectionId} errorName=${err?.name}`
        );
      }
    }

    const { passwordEncrypted: _passwordEncrypted, ...rest } = connection;
    void _passwordEncrypted;
    return { ...rest, password };
  }

  async createDbConnection(
    userId: string,
    data: CreateDbConnectionRequest
  ): Promise<{ connectionId: number; ragReadiness: { canPreprocess: boolean; reason: "OK" | "NO_MODEL" } }> {
    // 1. DB 타입 검증
    const dbType = await this.dbTypeDao.findById(data.dbTypeId);
    if (!dbType) {
      throw new ValidationError("유효하지 않은 DB 타입입니다.");
    }

    // 2. 연결 이름 중복 체크
    const existingConnection =
      await this.dbConnectionDao.findByUserIdAndConnectionName(
        userId,
        data.connectionName
      );
    if (existingConnection) {
      throw new ValidationError(
        `"${data.connectionName}" 연결 이름이 이미 존재합니다. 다른 이름을 사용해주세요.`
      );
    }

    // 3. 필수 필드 검증
    if (!data.connectionName || data.connectionName.trim() === "") {
      throw new ValidationError("연결 이름은 필수 입력 항목입니다.");
    }
    if (!data.databaseName || data.databaseName.trim() === "") {
      throw new ValidationError("데이터베이스 이름은 필수 입력 항목입니다.");
    }

    // 4. DB 타입별 필수 필드 검증
    if (dbType.typeName !== "SQLite") {
      if (!data.host || data.host.trim() === "") {
        throw new ValidationError("호스트 주소는 필수 입력 항목입니다.");
      }
      if (!data.port || data.port <= 0) {
        throw new ValidationError("유효한 포트 번호를 입력해주세요.");
      }
      if (!data.username || data.username.trim() === "") {
        throw new ValidationError("사용자 이름은 필수 입력 항목입니다.");
      }
    }

    // 5. 비밀번호 암호화
    let passwordEncrypted: Buffer | undefined;
    if (data.password) {
      passwordEncrypted = this.encryptPassword(data.password);
    }

    // 6. SQLite 파일 경로 생성
    let filePath: string | undefined = data.filePath;
    if (dbType.typeName === "SQLite" && data.databaseName && !filePath) {
      filePath = await this.createSQLiteFile(userId, data.databaseName);
    }

    // 7. DB 연결 생성
    const connectionId = await this.dbConnectionDao.create(
      userId,
      { ...data, filePath },
      passwordEncrypted
    );

    // 8. 신규 등록 시 접속 테스트 성공으로 간주하여 연결 상태 업데이트
    // (사용자가 등록 전에 이미 테스트를 완료했다고 가정)
    try {
      await this.dbConnectionDao.updateTestResult(
        connectionId,
        "success",
        "데이터베이스 연결이 등록되었습니다.",
        userId
      );
    } catch (error) {
      logger.error(
        `[DbConnectionService] 연결 테스트 상태 업데이트 실패 (connectionId: ${connectionId}):`,
        error
      );
      // 상태 업데이트 실패는 치명적이지 않으므로 계속 진행
    }

    let ragReadiness: { canPreprocess: boolean; reason: "OK" | "NO_MODEL" } = {
      canPreprocess: false,
      reason: "NO_MODEL"
    };
    try {
      const defaultModel = await this.llmModelService.findDefaultByUser(userId);
      ragReadiness = {
        canPreprocess: !!defaultModel,
        reason: (defaultModel ? "OK" : "NO_MODEL") as "OK" | "NO_MODEL"
      };
    } catch (error) {
      logger.error(
        `[DbConnectionService] LLM 기본 모델 조회 실패 (ragReadiness 기본값 사용):`,
        error
      );
    }

    return { connectionId, ragReadiness };
  }

  async updateDbConnection(
    connectionId: number,
    userId: string,
    data: UpdateDbConnectionRequest
  ): Promise<void> {
    let passwordEncrypted: Buffer | undefined;
    if (data.password) {
      passwordEncrypted = this.encryptPassword(data.password);
    }

    await this.dbConnectionDao.update(
      connectionId,
      userId,
      data,
      passwordEncrypted
    );
  }

  async deleteDbConnection(
    connectionId: number,
    userId: string
  ): Promise<void> {
    // 1. 삭제 전에 연결 정보 조회 (SQLite 파일 삭제를 위해)
    const connection = await this.dbConnectionDao.findById(
      connectionId,
      userId
    );
    if (!connection) {
      throw new ValidationError("데이터베이스 연결을 찾을 수 없습니다.");
    }

    // 2. 진행 중 RAG 폴링 cancel — CASCADE 삭제 전에 실행해야
    //    getProcessingHistoryByUser 로 historyId 식별 가능.
    //    cancel 실패는 내부에서 로그만 남고 throw 하지 않음 → DB 삭제 진행.
    await this.ragPreprocessingService.cancelPollingByConnectionId(
      connectionId,
      userId
    );

    // 3. DB 타입 확인
    const dbType = await this.dbTypeDao.findById(connection.dbTypeId);

    // 4. DB 연결 삭제 (DELETE) — rag_preprocessing_history 는 FK CASCADE 로 자동 삭제
    await this.dbConnectionDao.delete(connectionId, userId);

    // 5. SQLite인 경우 파일도 삭제
    if (dbType?.typeName === "SQLite" && connection.filePath) {
      try {
        // 파일 삭제
        if (fs.existsSync(connection.filePath)) {
          fs.unlinkSync(connection.filePath);
        }

        // 폴더가 비어있으면 폴더도 삭제
        const dirPath = path.dirname(connection.filePath);
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          if (files.length === 0) {
            fs.rmdirSync(dirPath);
          }
        }
      } catch (error: any) {
        // 파일 삭제 실패는 에러로그만 남기고 계속 진행
        logger.error(`[SQLite] 파일 삭제 실패: ${connection.filePath}`, error);
      }
    }
  }

  async testDbConnection(
    userId: string,
    data: TestDbConnectionRequest
  ): Promise<TestDbConnectionResponse> {
    const startTime = Date.now();

    try {
      // connectionId만 있고 dbTypeId가 없으면 DB에서 연결 정보 조회
      let testConfig = data;
      if (data.connectionId && !data.dbTypeId) {
        const connection = await this.dbConnectionDao.findById(data.connectionId, userId);
        if (!connection) {
          throw new Error("데이터베이스 연결을 찾을 수 없습니다.");
        }

        let password: string | undefined;
        if (connection.passwordEncrypted) {
          try {
            const buf = Buffer.isBuffer(connection.passwordEncrypted)
              ? connection.passwordEncrypted
              : Buffer.from(connection.passwordEncrypted);
            password = this.decryptPassword(buf);
          } catch {
            // 복호화 실패 시 비밀번호 없이 테스트 시도
          }
        }

        testConfig = {
          connectionId: data.connectionId,
          dbTypeId: connection.dbTypeId,
          host: connection.host,
          port: connection.port,
          databaseName: connection.databaseName,
          username: connection.username,
          password,
          filePath: connection.filePath,
          oracleSid: connection.oracleSid,
          oracleServiceName: connection.oracleServiceName,
          additionalParams: connection.additionalParams,
        };
      }

      const dbType = await this.dbTypeDao.findById(testConfig.dbTypeId!);
      if (!dbType) throw new Error("DB 타입을 찾을 수 없습니다.");

      // 접속 테스트 실행
      const result = await this.testConnection(dbType, testConfig, startTime, userId);

      // connectionId가 있으면 테스트 결과를 DB에 업데이트
      if (data.connectionId) {
        try {
          await this.dbConnectionDao.updateTestResult(
            data.connectionId,
            result.success ? "success" : "failed",
            result.message,
            userId
          );
        } catch (updateError) {
        }
      }

      return result;
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      const result: TestDbConnectionResponse = {
        success: false,
        status: "failed",
        message: error.message || "연결 테스트 실패",
        responseTimeMs: responseTime,
        errorDetails: error.stack
      };

      // connectionId가 있으면 실패 결과도 DB에 업데이트
      if (data.connectionId) {
        try {
          await this.dbConnectionDao.updateTestResult(
            data.connectionId,
            "failed",
            result.message,
            userId
          );
        } catch (updateError) {
        }
      }

      return result;
    }
  }

  private async testConnection(
    dbType: DbType,
    config: any,
    startTime: number,
    userId: string
  ): Promise<TestDbConnectionResponse> {
    if (dbType.typeName === "PostgreSQL") {
      const { Pool } = require("pg");
      const testPool = new Pool({
        host: config.host,
        port: config.port,
        database: config.databaseName,
        user: config.username,
        password: config.password
      });

      try {
        const result = await testPool.query("SELECT version()");
        const responseTime = Date.now() - startTime;
        await testPool.end();

        return {
          success: true,
          status: "success",
          message: "PostgreSQL 연결 성공",
          responseTimeMs: responseTime,
          serverVersion: result.rows[0]?.version
        };
      } catch (error: any) {
        await testPool.end();
        throw error;
      }
    } else if (dbType.typeName === "SQLite") {
      // SQLite 파일 경로 결정
      let filePath: string;

      if (config.filePath) {
        // 절대 경로가 제공된 경우 (DB에서 가져온 경우)
        filePath = config.filePath;
      } else if (config.databaseName) {
        // 데이터베이스 이름으로 경로 구성 (화면에서 입력한 경우)
        // 구조: {userId}/{databaseName}/{databaseName}.db 또는 {databaseName}.sqlite
        const baseDir = path.join(process.cwd(), "share", "sqlite", userId);
        const dbFolder = path.join(baseDir, config.databaseName);
        // 폴더 존재 확인
        if (!fs.existsSync(dbFolder)) {
          throw new Error(`SQLite 폴더를 찾을 수 없습니다: ${dbFolder}`);
        }

        if (!fs.statSync(dbFolder).isDirectory()) {
          throw new Error(
            `"${config.databaseName}"은(는) 파일입니다. 폴더가 아닙니다.`
          );
        }

        // 폴더 안에서 .db 또는 .sqlite 파일 찾기
        const possibleFiles = [
          path.join(dbFolder, `${config.databaseName}.db`),
          path.join(dbFolder, `${config.databaseName}.sqlite`),
          path.join(dbFolder, `${config.databaseName}.sqlite3`)
        ];

        filePath = "";
        for (const possibleFile of possibleFiles) {
          if (
            fs.existsSync(possibleFile) &&
            fs.statSync(possibleFile).isFile()
          ) {
            filePath = possibleFile;
            break;
          }
        }

        if (!filePath) {
          throw new Error(
            `SQLite 파일을 찾을 수 없습니다. ${dbFolder} 폴더 안에 ` +
              `${config.databaseName}.db, ${config.databaseName}.sqlite, ` +
              `${config.databaseName}.sqlite3 파일이 필요합니다.`
          );
        }
      } else {
        throw new Error(
          "SQLite 파일 경로 또는 데이터베이스 이름이 필요합니다."
        );
      }

      // 최종 파일 존재 확인
      if (!fs.existsSync(filePath)) {
        throw new Error(`SQLite 파일을 찾을 수 없습니다: ${filePath}`);
      }

      // 실제 데이터베이스 연결 테스트
      const sqlite3 = require("sqlite3").verbose();

      return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(
          filePath,
          sqlite3.OPEN_READONLY,
          (err: any) => {
            if (err) {
              logger.error(`[SQLite] 데이터베이스 열기 실패: ${filePath}`, err);
              reject(new Error(`SQLite 파일을 열 수 없습니다: ${err.message}`));
              return;
            }

            // 간단한 쿼리로 연결 테스트
            db.get(
              "SELECT sqlite_version() as version",
              [],
              (err: any, row: any) => {
                const responseTime = Date.now() - startTime;

                db.close((closeErr: any) => {
                  if (closeErr) {
                    logger.error(`[SQLite] 데이터베이스 닫기 실패:`, closeErr);
                  }
                });

                if (err) {
                  logger.error(`[SQLite] 쿼리 실행 실패:`, err);
                  reject(new Error(`SQLite 쿼리 실행 실패: ${err.message}`));
                  return;
                }
                resolve({
                  success: true,
                  status: "success",
                  message: "SQLite 연결 성공",
                  responseTimeMs: responseTime,
                  serverVersion: `SQLite ${row.version}`
                });
              }
            );
          }
        );
      });
    }

    if (dbType.typeName === "MariaDB" || dbType.typeName === "MySQL") {
      const adapterConfig = {
        databaseName: `test-${config.connectionId ?? "new"}`,
        databaseType: DatabaseType.MARIADB,
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.databaseName,
        pool: false,
        connectTimeout: 5000
      } as unknown as MariaDBClientConfig;
      const adapter = DatabaseFactory.createAdapter(adapterConfig);

      let client: any = null;
      try {
        await adapter.create();
        client = await adapter.connect();
        const { rows } = await adapter.query(
          "SELECT VERSION() AS version",
          [],
          client
        );
        const responseTime = Date.now() - startTime;
        const version: string = rows?.[0]?.version ?? "unknown";

        return {
          success: true,
          status: "success",
          message: `${dbType.typeName} 연결 성공`,
          responseTimeMs: responseTime,
          serverVersion: `${dbType.typeName} ${version}`
        };
      } catch (error: any) {
        throw new Error(this.translateMariaDBError(error, dbType.typeName));
      } finally {
        if (client) {
          try {
            await adapter.disconnect(client);
          } catch {
            // 정리 실패는 무시
          }
        }
        try {
          await adapter.destroy?.();
        } catch {
          // 정리 실패는 무시
        }
      }
    }

    throw new Error("지원하지 않는 DB 타입입니다.");
  }

  private translateMariaDBError(error: any, typeName: string): string {
    const code: string = error?.code ?? "";
    const errno: number = error?.errno ?? 0;
    const sqlState: string = error?.sqlState ?? "";
    const raw: string = error?.message ?? "Unknown error";

    if (code === "ENOTFOUND") {
      return `${typeName} 호스트를 찾을 수 없습니다. 호스트 주소를 확인하세요.`;
    }
    if (code === "ECONNREFUSED") {
      return `${typeName} 서버가 연결을 거부했습니다. 포트가 열려있는지, 서버가 가동 중인지 확인하세요.`;
    }
    if (code === "ETIMEDOUT" || /timeout/i.test(raw)) {
      return `${typeName} 서버 응답 시간이 초과되었습니다. 네트워크 상태와 방화벽을 확인하세요.`;
    }

    if (errno === 1045 || /access denied/i.test(raw)) {
      return `${typeName} 인증 실패: 사용자명 또는 비밀번호가 올바르지 않습니다.`;
    }
    if (errno === 1049 || /unknown database/i.test(raw)) {
      return `${typeName} 데이터베이스를 찾을 수 없습니다. DB 이름을 확인하세요.`;
    }
    if (errno === 1044) {
      return `${typeName} 데이터베이스 접근 권한이 없습니다.`;
    }
    if (errno === 1142) {
      return `${typeName} 권한이 없어 작업을 수행할 수 없습니다. (필요 권한: CREATE/ALTER/DROP 등)`;
    }
    if (errno === 2002 || errno === 2003) {
      return `${typeName} 서버에 연결할 수 없습니다. 호스트/포트를 확인하세요.`;
    }

    if (sqlState === "28000") {
      return `${typeName} 인증 실패: 자격증명을 확인하세요.`;
    }

    return `${typeName} 연결 실패: ${raw}`;
  }

  private encryptPassword(password: string): Buffer {
    const algorithm = "aes-256-gcm";
    const key = crypto.scryptSync(this.ENCRYPTION_KEY, "salt", 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(password, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, Buffer.from(encrypted, "hex")]);
  }

  private decryptPassword(encrypted: Buffer): string {
    const algorithm = "aes-256-gcm";
    const key = crypto.scryptSync(this.ENCRYPTION_KEY, "salt", 32);
    const iv = encrypted.subarray(0, 16);
    const authTag = encrypted.subarray(16, 32);
    const data = encrypted.subarray(32);

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(data.toString("hex"), "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  private async createSQLiteFile(
    userId: string,
    dbName: string
  ): Promise<string> {
    // 구조: {userId}/{dbName}/{dbName}.db|.sqlite|.sqlite3
    const baseDir = path.join(process.cwd(), "share", "sqlite", userId);
    const dbFolder = path.join(baseDir, dbName);

    // 폴더 생성
    if (!fs.existsSync(dbFolder)) {
      fs.mkdirSync(dbFolder, { recursive: true });
    }

    // 기존 파일이 있는지 확인 (우선순위: .sqlite > .sqlite3 > .db)
    const possibleFiles = [
      path.join(dbFolder, `${dbName}.sqlite`),
      path.join(dbFolder, `${dbName}.sqlite3`),
      path.join(dbFolder, `${dbName}.db`)
    ];

    for (const existingFile of possibleFiles) {
      if (fs.existsSync(existingFile) && fs.statSync(existingFile).isFile()) {
        return existingFile;
      }
    }

    // 기존 파일이 없으면 새로 생성 (.sqlite 확장자 사용)
    const newFilePath = path.join(dbFolder, `${dbName}.sqlite`);
    const sqlite3 = require("sqlite3").verbose();
    const db = new sqlite3.Database(newFilePath);
    db.close();
    return newFilePath;
  }

  async checkSQLiteDbExists(userId: string, databaseName: string) {
    try {
      // 구조: {userId}/{databaseName}/{databaseName}.db 또는 .sqlite
      const baseDir = path.join(process.cwd(), "share", "sqlite", userId);
      const dbFolder = path.join(baseDir, databaseName);

      // 폴더 존재 확인
      if (!fs.existsSync(dbFolder)) {
        return {
          exists: false,
          message: "SQLite DB 폴더가 존재하지 않습니다."
        };
      }

      if (!fs.statSync(dbFolder).isDirectory()) {
        return {
          exists: false,
          message: `"${databaseName}"은(는) 파일입니다. 폴더가 아닙니다.`
        };
      }

      // 폴더 안에서 SQLite 파일 찾기
      const possibleFiles = [
        path.join(dbFolder, `${databaseName}.db`),
        path.join(dbFolder, `${databaseName}.sqlite`),
        path.join(dbFolder, `${databaseName}.sqlite3`)
      ];

      for (const filePath of possibleFiles) {
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const stats = fs.statSync(filePath);
          return {
            exists: true,
            filePath,
            fileSize: stats.size,
            message: "SQLite DB 파일이 이미 존재합니다."
          };
        }
      }

      return {
        exists: false,
        message: `SQLite DB 파일을 찾을 수 없습니다. ${dbFolder} 폴더 안에 ${databaseName}.db, ${databaseName}.sqlite, ${databaseName}.sqlite3 파일이 필요합니다.`
      };
    } catch (error: any) {
      logger.error(`[SQLite] DB 존재 확인 실패:`, error);
      throw new Error(`SQLite DB 존재 확인 실패: ${error.message}`);
    }
  }

  async createSQLiteDb(
    userId: string,
    databaseName: string,
    connectionName?: string,
    description?: string
  ) {
    try {
      const filePath = await this.createSQLiteFile(userId, databaseName);

      // connectionName이 있으면 연결 등록까지 수행
      let connectionId: number | undefined;
      if (connectionName) {
        const dbType = await this.dbTypeDao.findByTypeName("SQLite");
        if (!dbType) {
          throw new Error("SQLite DB 타입을 찾을 수 없습니다.");
        }
        connectionId = await this.dbConnectionDao.create(
          userId,
          {
            dbTypeId: dbType.dbTypeId,
            connectionName,
            description,
            databaseName,
            filePath,
            minPoolSize: 1,
            maxPoolSize: 1,
            isDefault: false
          },
          undefined
        );

        // 신규 등록 시 접속 테스트 성공으로 간주
        try {
          await this.dbConnectionDao.updateTestResult(
            connectionId,
            "success",
            "SQLite DB가 생성 및 등록되었습니다.",
            userId
          );
        } catch (error) {
          logger.error(
            `[DbConnectionService] SQLite 연결 테스트 상태 업데이트 실패 (connectionId: ${connectionId}):`,
            error
          );
        }
      }

      return {
        success: true,
        message: connectionId
          ? "SQLite DB가 생성 및 등록되었습니다."
          : "SQLite DB 파일이 생성되었습니다.",
        filePath,
        userId,
        databaseName,
        connectionId
      };
    } catch (error: any) {
      logger.error(`[SQLite] DB 파일 생성 실패:`, error);
      throw new Error(`SQLite DB 생성 실패: ${error.message}`);
    }
  }

  async registerSQLiteDb(
    userId: string,
    filePath: string,
    connectionName: string,
    description?: string
  ) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error("지정된 경로에 SQLite 파일이 존재하지 않습니다.");
      }

      const dbType = await this.dbTypeDao.findByTypeName("SQLite");
      if (!dbType) {
        throw new Error("SQLite DB 타입을 찾을 수 없습니다.");
      }

      const databaseName = path.basename(filePath);

      const connectionId = await this.dbConnectionDao.create(
        userId,
        {
          dbTypeId: dbType.dbTypeId,
          connectionName,
          description,
          databaseName,
          filePath,
          minPoolSize: 1,
          maxPoolSize: 1,
          isDefault: false
        },
        undefined
      );

      return {
        success: true,
        message: "SQLite DB 파일이 등록되었습니다.",
        connectionId
      };
    } catch (error: any) {
      logger.error(`[SQLite] DB 파일 등록 실패:`, error);
      throw new Error(`SQLite DB 등록 실패: ${error.message}`);
    }
  }

  async checkUploadPathExists(
    userId: string,
    data: CheckUploadPathExistsRequest
  ): Promise<CheckUploadPathExistsResponse> {
    try {
      const { databaseName, filename } = data;

      // 파일 확장자 확인
      const ext = path.extname(filename);
      const newFilename = `${databaseName}${ext}`;

      // 예상 경로 생성
      const baseDir = path.join(
        process.cwd(),
        "share",
        "sqlite",
        userId,
        databaseName
      );
      const filePath = path.join(baseDir, newFilename);
      if (fs.existsSync(filePath)) {
        return {
          exists: true,
          filePath,
          message: `'${databaseName}' 데이터베이스 이름이 이미 존재합니다.\n\n다른 데이터베이스 이름을 사용해주세요.`
        };
      }

      return {
        exists: false,
        message: "업로드 가능합니다."
      };
    } catch (error: any) {
      logger.error(`[SQLite] 경로 확인 실패:`, error);
      throw new Error(`경로 확인 실패: ${error.message}`);
    }
  }

  async uploadSQLiteDb(
    userId: string,
    tempFilePath: string, // Buffer 대신 임시 파일 경로 받음
    originalFilename: string,
    connectionName: string,
    databaseName: string,
    description?: string
  ) {
    try {
      // 로그인아이디/데이터베이스이름/ 폴더 구조
      const baseDir = path.join(
        process.cwd(),
        "share",
        "sqlite",
        userId,
        databaseName
      );

      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }

      // 원본 파일의 확장자 확인
      const sanitizedFilename = path.basename(originalFilename);
      const ext = path.extname(sanitizedFilename);

      if (ext !== ".db" && ext !== ".sqlite" && ext !== ".sqlite3") {
        throw new Error(
          "SQLite 파일 형식이 아닙니다. (.db, .sqlite, .sqlite3 확장자만 허용)"
        );
      }

      // 파일명을 데이터베이스 이름 + 원본 확장자로 변경
      const newFilename = `${databaseName}${ext}`;
      const filePath = path.join(baseDir, newFilename);

      if (fs.existsSync(filePath)) {
        throw new Error(
          `'${databaseName}' 데이터베이스 이름이 이미 존재합니다.\n\n다른 데이터베이스 이름을 사용해주세요.`
        );
      }

      // 임시 파일을 목적지로 복사
      fs.copyFileSync(tempFilePath, filePath);

      // 임시 파일 삭제
      fs.unlinkSync(tempFilePath);

      const fileSize = fs.statSync(filePath).size;

      return {
        success: true,
        message:
          "SQLite DB 파일이 업로드되었습니다. 접속 테스트 후 저장 버튼을 클릭하세요.",
        filePath,
        fileSize: fileSize
      };
    } catch (error: any) {
      logger.error(`[SQLite] DB 파일 업로드 실패:`, error);
      throw error;
    }
  }

  async createSampleSQLiteDb(
    userId: string,
    connectionName?: string,
    description?: string
  ) {
    try {
      // 1. 샘플 DB 소스 폴더 경로 - 개발/운영 환경 모두 지원
      // 개발: {cwd}/src/sample_db
      // 운영(Docker): {cwd}/lib/src/sample_db
      let sampleDbSourcePath = path.join(process.cwd(), "src", "sample_db");

      if (!fs.existsSync(sampleDbSourcePath)) {
        // src가 없으면 lib/src 경로 시도 (Docker 환경)
        sampleDbSourcePath = path.join(
          process.cwd(),
          "lib",
          "src",
          "sample_db"
        );

        if (!fs.existsSync(sampleDbSourcePath)) {
          throw new Error(
            `샘플 DB 폴더를 찾을 수 없습니다. 확인된 경로: ` +
              `${path.join(process.cwd(), "src", "sample_db")}, ` +
              `${path.join(process.cwd(), "lib", "src", "sample_db")}`
          );
        }
      }
      // 2. 날짜시간 문자열 생성
      const now = new Date();
      const dateStr = now.toISOString().replace(/[-:]/g, "").split(".")[0];

      // 3. 폴더명: sample_날짜시간
      const folderName = `sample_${dateStr}`;

      // 4. SQLite 파일명: sample_날짜시간.sqlite
      const sqliteFileName = `${folderName}.sqlite`;

      // 5. 데이터베이스 이름: sample_날짜시간 (폴더명과 동일)
      const databaseName = folderName;

      // 6. 목적지 경로: share/sqlite/userId/4466508087sample_날짜시간/
      const baseDir = path.join(
        process.cwd(),
        "share",
        "sqlite",
        userId,
        folderName
      );

      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }

      // 7. sample_db 폴더의 모든 파일과 폴더 복사
      const entries = fs.readdirSync(sampleDbSourcePath, {
        withFileTypes: true
      });
      let sqliteFilePath: string | null = null;

      for (const entry of entries) {
        const sourcePath = path.join(sampleDbSourcePath, entry.name);
        let destPath: string;

        if (entry.isDirectory()) {
          // 폴더는 그대로 복사
          destPath = path.join(baseDir, entry.name);
          this.copyDirectoryRecursive(sourcePath, destPath);
        } else if (entry.isFile()) {
          // 파일 확장자로 체크
          const ext = path.extname(entry.name);
          if (ext === ".sqlite" || ext === ".sqlite3" || ext === ".db") {
            // SQLite 파일 → sample_datetime.sqlite로 이름 변경
            destPath = path.join(baseDir, sqliteFileName);
            sqliteFilePath = destPath;
            fs.copyFileSync(sourcePath, destPath);
          } else if (ext === ".duckdb") {
            // DuckDB 파일 → sample_datetime.duckdb로 이름 변경
            const duckdbFileName = `${folderName}.duckdb`;
            destPath = path.join(baseDir, duckdbFileName);
            fs.copyFileSync(sourcePath, destPath);
          } else {
            // 다른 파일은 그대로 복사
            destPath = path.join(baseDir, entry.name);
            fs.copyFileSync(sourcePath, destPath);
          }
        }
      }

      if (!sqliteFilePath) {
        throw new Error(
          "SQLite 데이터베이스 파일(.sqlite, .sqlite3, .db)을 찾을 수 없습니다."
        );
      }

      const destFilePath = sqliteFilePath;
      // 8. DB 타입 조회
      const dbType = await this.dbTypeDao.findByTypeName("SQLite");
      if (!dbType) {
        throw new Error("SQLite DB 타입을 찾을 수 없습니다.");
      }

      // 9. 연결 이름 중복 체크 및 고유 이름 생성
      let finalConnectionName = connectionName!;

      // 중복 체크
      const existingConnection =
        await this.dbConnectionDao.findByUserIdAndConnectionName(
          userId,
          finalConnectionName
        );

      if (existingConnection) {
        // 이미 존재하면 타임스탬프 추가
        finalConnectionName = `${connectionName}_${Date.now()}`;
      }

      // 10. DB 연결 정보 저장
      const connectionId = await this.dbConnectionDao.create(
        userId,
        {
          dbTypeId: dbType.dbTypeId,
          connectionName: finalConnectionName,
          description: description || "샘플 SQLite 데이터베이스",
          databaseName,
          filePath: destFilePath,
          minPoolSize: 1,
          maxPoolSize: 1,
          isDefault: false
        },
        undefined
      );

      // 샘플 DB 생성 후 접속 테스트 성공으로 상태 업데이트
      try {
        await this.dbConnectionDao.updateTestResult(
          connectionId,
          "success",
          "샘플 데이터베이스 연결이 등록되었습니다.",
          userId
        );
      } catch (error) {
        logger.error(
          `[SQLite] 샘플 DB 연결 테스트 상태 업데이트 실패 (connectionId: ${connectionId}):`,
          error
        );
        // 상태 업데이트 실패는 치명적이지 않으므로 계속 진행
      }

      // 샘플 DB 생성만 수행 (RAG 이력 생성은 사용자가 "실행/대체" 선택 시 별도 API로 처리)
      // dbId는 프론트엔드에서 RAG 등록 시 필요하므로 응답에 포함
      const dbId = `${userId}/${folderName}`;

      return {
        success: true,
        message: "샘플 SQLite DB가 생성되었습니다.",
        filePath: destFilePath,
        databaseName,
        connectionId,
        connectionName: finalConnectionName,
        dbId  // RAG 등록 시 사용
      };
    } catch (error: any) {
      logger.error(`[SQLite] 샘플 DB 생성 실패:`, error);
      throw new Error(`샘플 DB 생성 실패: ${error.message}`);
    }
  }

  private copyDirectoryRecursive(source: string, dest: string) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(source, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyDirectoryRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  async getDbSchema(
    connectionId: number,
    userId: string
  ): Promise<GetDbSchemaResponse> {
    try {
      const connection = await this.dbConnectionDao.findById(
        connectionId,
        userId
      );
      if (!connection) {
        throw new Error("DB 연결 정보를 찾을 수 없습니다.");
      }

      const dbType = await this.dbTypeDao.findById(connection.dbTypeId);
      if (!dbType) {
        throw new Error("DB 타입 정보를 찾을 수 없습니다.");
      }

      let tables: DbSchemaTable[] = [];

      if (dbType.typeName === "SQLite") {
        tables = await this.getSQLiteSchema(connection.filePath!);
      } else if (dbType.typeName === "PostgreSQL") {
        tables = await this.getPostgreSQLSchema(connection);
      } else if (dbType.typeName === "MySQL" || dbType.typeName === "MariaDB") {
        tables = await this.getMySQLSchema(connection);
      } else {
        throw new Error(`지원하지 않는 DB 타입입니다: ${dbType.typeName}`);
      }

      return {
        success: true,
        connectionId,
        connectionName: connection.connectionName,
        dbTypeName: dbType.typeName,
        databaseName: connection.databaseName,
        tables,
        totalTables: tables.length
      };
    } catch (error: any) {
      logger.error(`[DbConnectionService] getDbSchema 에러:`, error);
      throw error;
    }
  }

  async getTableDetail(
    connectionId: number,
    userId: string,
    tableName: string,
    includeData: boolean = false,
    dataLimit: number = 10
  ): Promise<GetTableDetailResponse> {
    try {
      const connection = await this.dbConnectionDao.findById(
        connectionId,
        userId
      );
      if (!connection) {
        throw new Error("DB 연결 정보를 찾을 수 없습니다.");
      }

      const dbType = await this.dbTypeDao.findById(connection.dbTypeId);
      if (!dbType) {
        throw new Error("DB 타입 정보를 찾을 수 없습니다.");
      }

      let columns: DbSchemaColumn[] = [];
      let tableInfo: DbSchemaTable = { tableName };
      let sampleData: Array<Record<string, any>> | undefined;
      let totalRows: number | undefined;

      if (dbType.typeName === "SQLite") {
        const result = await this.getSQLiteTableDetail(
          connection.filePath!,
          tableName,
          includeData,
          dataLimit
        );
        columns = result.columns;
        tableInfo = result.tableInfo;
        sampleData = result.sampleData;
        totalRows = result.totalRows;
      } else if (dbType.typeName === "PostgreSQL") {
        const result = await this.getPostgreSQLTableDetail(
          connection,
          tableName,
          includeData,
          dataLimit
        );
        columns = result.columns;
        tableInfo = result.tableInfo;
        sampleData = result.sampleData;
        totalRows = result.totalRows;
      } else if (dbType.typeName === "MySQL" || dbType.typeName === "MariaDB") {
        const result = await this.getMySQLTableDetail(
          connection,
          tableName,
          includeData,
          dataLimit
        );
        columns = result.columns;
        tableInfo = result.tableInfo;
        sampleData = result.sampleData;
        totalRows = result.totalRows;
      } else {
        throw new Error(`지원하지 않는 DB 타입입니다: ${dbType.typeName}`);
      }

      return {
        success: true,
        tableName,
        tableInfo,
        columns,
        sampleData,
        totalRows
      };
    } catch (error: any) {
      logger.error(`[DbConnectionService] getTableDetail 에러:`, error);
      throw error;
    }
  }

  private async getSQLiteSchema(filePath: string): Promise<DbSchemaTable[]> {
    const sqlite3 = require("sqlite3").verbose();
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(filePath, (err: Error) => {
        if (err) {
          reject(err);
          return;
        }
      });

      db.all(
        "SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name",
        [],
        (err: Error, rows: any[]) => {
          db.close();
          if (err) {
            reject(err);
            return;
          }

          const tables: DbSchemaTable[] = rows.map((row) => ({
            tableName: row.name,
            tableType: row.type.toUpperCase()
          }));

          resolve(tables);
        }
      );
    });
  }

  private async getSQLiteTableDetail(
    filePath: string,
    tableName: string,
    includeData: boolean,
    dataLimit: number
  ): Promise<{
    tableInfo: DbSchemaTable;
    columns: DbSchemaColumn[];
    sampleData?: Array<Record<string, any>>;
    totalRows?: number;
  }> {
    const sqlite3 = require("sqlite3").verbose();
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(filePath, (err: Error) => {
        if (err) {
          reject(err);
          return;
        }
      });

      db.all(
        `PRAGMA table_info(${tableName})`,
        [],
        (err: Error, rows: any[]) => {
          if (err) {
            db.close();
            reject(err);
            return;
          }

          const columns: DbSchemaColumn[] = rows.map((row) => ({
            columnName: row.name,
            dataType: row.type,
            isNullable: row.notnull === 0,
            isPrimaryKey: row.pk === 1,
            defaultValue: row.dflt_value,
            ordinalPosition: row.cid
          }));

          const tableInfo: DbSchemaTable = {
            tableName,
            tableType: "TABLE"
          };

          if (!includeData) {
            db.close();
            resolve({ tableInfo, columns });
            return;
          }

          db.get(
            `SELECT COUNT(*) as count FROM "${tableName}"`,
            [],
            (err: Error, countRow: any) => {
              if (err) {
                db.close();
                reject(err);
                return;
              }

              const totalRows = countRow.count;

              db.all(
                `SELECT * FROM "${tableName}" LIMIT ${dataLimit}`,
                [],
                (err: Error, dataRows: any[]) => {
                  db.close();
                  if (err) {
                    reject(err);
                    return;
                  }

                  resolve({
                    tableInfo,
                    columns,
                    sampleData: dataRows,
                    totalRows
                  });
                }
              );
            }
          );
        }
      );
    });
  }

  private async getPostgreSQLSchema(connection: any): Promise<DbSchemaTable[]> {
    throw new Error("PostgreSQL 스키마 조회는 현재 지원하지 않습니다.");
  }

  private async getPostgreSQLTableDetail(
    connection: any,
    tableName: string,
    includeData: boolean,
    dataLimit: number
  ): Promise<{
    tableInfo: DbSchemaTable;
    columns: DbSchemaColumn[];
    sampleData?: Array<Record<string, any>>;
    totalRows?: number;
  }> {
    throw new Error("PostgreSQL 테이블 상세 조회는 현재 지원하지 않습니다.");
  }

  /**
   * MySQL/MariaDB 어댑터 config 빌드 (스키마 조회 / 테이블 상세 공용)
   * 비밀번호는 메모리 내에서만 복호화하며, 로그에는 절대 출력하지 않는다.
   */
  private buildMariaDBAdapterConfig(connection: any, label: string): MariaDBClientConfig {
    let password: string | undefined;
    if (connection.passwordEncrypted) {
      try {
        const buf = Buffer.isBuffer(connection.passwordEncrypted)
          ? connection.passwordEncrypted
          : Buffer.from(connection.passwordEncrypted);
        password = this.decryptPassword(buf);
      } catch {
        // 복호화 실패 시 password 없이 시도 (어차피 인증 실패할 것)
      }
    }
    return {
      databaseName: `${label}-${connection.connectionId}`,
      databaseType: DatabaseType.MARIADB,
      host: connection.host,
      port: connection.port,
      user: connection.username,
      password,
      database: connection.databaseName,
      pool: false,
      connectTimeout: 5000
    } as unknown as MariaDBClientConfig;
  }

  private async getMySQLSchema(connection: any): Promise<DbSchemaTable[]> {
    const adapter = DatabaseFactory.createAdapter(
      this.buildMariaDBAdapterConfig(connection, "schema")
    );

    let client: any = null;
    try {
      await adapter.create();
      client = await adapter.connect();

      const { rows } = await adapter.query(
        `SELECT TABLE_NAME, TABLE_TYPE
         FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_TYPE IN ('BASE TABLE', 'VIEW')
         ORDER BY TABLE_NAME`,
        [],
        client
      );

      return (rows ?? []).map((row: any) => ({
        tableName: row.TABLE_NAME,
        tableType: row.TABLE_TYPE === "VIEW" ? "VIEW" : "TABLE"
      }));
    } catch (error: any) {
      throw new Error(this.translateMariaDBError(error, "MariaDB"));
    } finally {
      if (client) {
        try {
          await adapter.disconnect(client);
        } catch {
          // 정리 실패는 무시
        }
      }
      try {
        await adapter.destroy?.();
      } catch {
        // 정리 실패는 무시
      }
    }
  }

  private async getMySQLTableDetail(
    connection: any,
    tableName: string,
    includeData: boolean,
    dataLimit: number
  ): Promise<{
    tableInfo: DbSchemaTable;
    columns: DbSchemaColumn[];
    sampleData?: Array<Record<string, any>>;
    totalRows?: number;
  }> {
    const adapter = DatabaseFactory.createAdapter(
      this.buildMariaDBAdapterConfig(connection, "tabledetail")
    );

    let client: any = null;
    try {
      await adapter.create();
      client = await adapter.connect();

      // 1. 테이블 존재 확인 (SQL Injection 방지 — 위 SCHEMA 결과를 화이트리스트로 사용)
      const { rows: tableRows } = await adapter.query(
        `SELECT TABLE_NAME, TABLE_TYPE
         FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [tableName],
        client
      );
      if (!tableRows || tableRows.length === 0) {
        throw new Error(`테이블을 찾을 수 없습니다: ${tableName}`);
      }
      const tableInfo: DbSchemaTable = {
        tableName,
        tableType: tableRows[0].TABLE_TYPE === "VIEW" ? "VIEW" : "TABLE"
      };

      // 2. 컬럼 정보
      const { rows: columnRows } = await adapter.query(
        `SELECT
           COLUMN_NAME,
           COLUMN_TYPE,
           IS_NULLABLE,
           COLUMN_KEY,
           COLUMN_DEFAULT,
           ORDINAL_POSITION
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
         ORDER BY ORDINAL_POSITION`,
        [tableName],
        client
      );

      const columns: DbSchemaColumn[] = (columnRows ?? []).map((row: any) => ({
        columnName: row.COLUMN_NAME,
        dataType: row.COLUMN_TYPE,
        isNullable: row.IS_NULLABLE === "YES",
        isPrimaryKey: row.COLUMN_KEY === "PRI",
        defaultValue: row.COLUMN_DEFAULT,
        ordinalPosition: Number(row.ORDINAL_POSITION)
      }));

      if (!includeData) {
        return { tableInfo, columns };
      }

      // 3. sample data — tableName 은 위에서 검증된 값. 백틱은 자기 자신을 이스케이프.
      const escapedTable = "`" + tableName.replace(/`/g, "``") + "`";
      const limit = Math.min(Math.max(Number(dataLimit) || 10, 1), 1000);

      const { rows: sampleRows } = await adapter.query(
        `SELECT * FROM ${escapedTable} LIMIT ${limit}`,
        [],
        client
      );

      const { rows: countRows } = await adapter.query(
        `SELECT COUNT(*) AS cnt FROM ${escapedTable}`,
        [],
        client
      );
      const totalRows = Number(countRows?.[0]?.cnt ?? 0);

      return {
        tableInfo,
        columns,
        sampleData: (sampleRows ?? []) as Array<Record<string, any>>,
        totalRows
      };
    } catch (error: any) {
      // 우리가 던진 "테이블을 찾을 수 없습니다" 메시지는 그대로 통과
      if (typeof error?.message === "string" &&
          error.message.startsWith("테이블을 찾을 수 없습니다")) {
        throw error;
      }
      throw new Error(this.translateMariaDBError(error, "MariaDB"));
    } finally {
      if (client) {
        try {
          await adapter.disconnect(client);
        } catch {
          // 정리 실패는 무시
        }
      }
      try {
        await adapter.destroy?.();
      } catch {
        // 정리 실패는 무시
      }
    }
  }

  /**
   * 테이블 수정
   */
  async updateTable(
    connectionId: number,
    userId: string,
    data: UpdateTableRequest
  ): Promise<UpdateTableResponse> {
    try {
      // 연결 정보 조회
      const connectionInfo = await this.dbConnectionDao.findById(
        connectionId,
        userId
      );
      if (!connectionInfo) {
        throw new ValidationError("데이터베이스 연결을 찾을 수 없습니다.");
      }

      const dbType = await this.dbTypeDao.findById(connectionInfo.dbTypeId);
      if (!dbType) {
        throw new ValidationError("유효하지 않은 DB 타입입니다.");
      }

      const typeLower = dbType.typeName.toLowerCase();
      if (typeLower === "sqlite") {
        await this.updateSQLiteTable(connectionInfo.filePath!, data);
      } else if (typeLower === "mariadb" || typeLower === "mysql") {
        await this.updateMariaDBTable(connectionInfo, data);
      } else {
        throw new ValidationError(`현재 ${dbType.typeName}은 지원하지 않습니다.`);
      }

      return {
        success: true,
        message: "테이블이 수정되었습니다."
      };
    } catch (error) {
      logger.error("[DbConnectionService] updateTable 에러:", error);
      throw error;
    }
  }

  /**
   * 테이블 삭제
   */
  async deleteTable(
    connectionId: number,
    userId: string,
    tableName: string
  ): Promise<DeleteTableResponse> {
    try {
      // 연결 정보 조회
      const connectionInfo = await this.dbConnectionDao.findById(
        connectionId,
        userId
      );
      if (!connectionInfo) {
        throw new ValidationError("데이터베이스 연결을 찾을 수 없습니다.");
      }

      const dbType = await this.dbTypeDao.findById(connectionInfo.dbTypeId);
      if (!dbType) {
        throw new ValidationError("유효하지 않은 DB 타입입니다.");
      }

      const typeLower = dbType.typeName.toLowerCase();
      if (typeLower === "sqlite") {
        await this.deleteSQLiteTable(connectionInfo.filePath!, tableName);
      } else if (typeLower === "mariadb" || typeLower === "mysql") {
        await this.deleteMariaDBTable(connectionInfo, tableName);
      } else {
        throw new ValidationError(`현재 ${dbType.typeName}은 지원하지 않습니다.`);
      }

      return {
        success: true,
        message: "테이블이 삭제되었습니다."
      };
    } catch (error) {
      logger.error("[DbConnectionService] deleteTable 에러:", error);
      throw error;
    }
  }

  /**
   * 테이블 생성
   */
  async createTable(
    connectionId: number,
    userId: string,
    data: CreateTableRequest
  ): Promise<CreateTableResponse> {
    try {
      // 연결 정보 조회
      const connectionInfo = await this.dbConnectionDao.findById(
        connectionId,
        userId
      );
      if (!connectionInfo) {
        throw new ValidationError("데이터베이스 연결을 찾을 수 없습니다.");
      }

      const dbType = await this.dbTypeDao.findById(connectionInfo.dbTypeId);
      if (!dbType) {
        throw new ValidationError("유효하지 않은 DB 타입입니다.");
      }

      const typeLower = dbType.typeName.toLowerCase();
      if (typeLower === "sqlite") {
        await this.createSQLiteTable(connectionInfo.filePath!, data);
      } else if (typeLower === "mariadb" || typeLower === "mysql") {
        await this.createMariaDBTable(connectionInfo, data);
      } else {
        throw new ValidationError(`현재 ${dbType.typeName}은 지원하지 않습니다.`);
      }

      return {
        success: true,
        message: "테이블이 생성되었습니다.",
        tableName: data.tableName
      };
    } catch (error) {
      logger.error("[DbConnectionService] createTable 에러:", error);
      throw error;
    }
  }

  /**
   * 컬럼 추가 (2025-11-13)
   */
  async addColumn(
    connectionId: number,
    userId: string,
    data: AddColumnRequest
  ): Promise<AddColumnResponse> {
    try {
      const connectionInfo = await this.dbConnectionDao.findById(
        connectionId,
        userId
      );
      if (!connectionInfo) {
        throw new ValidationError("데이터베이스 연결을 찾을 수 없습니다.");
      }

      const dbType = await this.dbTypeDao.findById(connectionInfo.dbTypeId);
      if (!dbType) {
        throw new ValidationError("유효하지 않은 DB 타입입니다.");
      }

      const typeLower = dbType.typeName.toLowerCase();
      if (typeLower === "sqlite") {
        await this.addSQLiteColumn(connectionInfo.filePath!, data);
      } else if (typeLower === "mariadb" || typeLower === "mysql") {
        await this.addMariaDBColumn(connectionInfo, data);
      } else {
        throw new ValidationError(`현재 ${dbType.typeName}은 지원하지 않습니다.`);
      }

      return {
        success: true,
        message: "컬럼이 추가되었습니다.",
        tableName: data.tableName,
        columnName: data.columnName
      };
    } catch (error) {
      logger.error("[DbConnectionService] addColumn 에러:", error);
      throw error;
    }
  }

  /**
   * 컬럼 수정
   */
  async updateColumn(
    connectionId: number,
    userId: string,
    data: UpdateColumnRequest
  ): Promise<UpdateColumnResponse> {
    try {
      // 연결 정보 조회
      const connectionInfo = await this.dbConnectionDao.findById(
        connectionId,
        userId
      );
      if (!connectionInfo) {
        throw new ValidationError("데이터베이스 연결을 찾을 수 없습니다.");
      }

      const dbType = await this.dbTypeDao.findById(connectionInfo.dbTypeId);
      if (!dbType) {
        throw new ValidationError("유효하지 않은 DB 타입입니다.");
      }

      const typeLower = dbType.typeName.toLowerCase();
      if (typeLower === "sqlite") {
        await this.updateSQLiteColumn(connectionInfo.filePath!, data);
      } else if (typeLower === "mariadb" || typeLower === "mysql") {
        await this.updateMariaDBColumn(connectionInfo, data);
      } else {
        throw new ValidationError(`현재 ${dbType.typeName}은 지원하지 않습니다.`);
      }

      return {
        success: true,
        message: "컬럼이 수정되었습니다."
      };
    } catch (error) {
      logger.error("[DbConnectionService] updateColumn 에러:", error);
      throw error;
    }
  }

  /**
   * 컬럼 삭제
   */
  async deleteColumn(
    connectionId: number,
    userId: string,
    tableName: string,
    columnName: string
  ): Promise<DeleteColumnResponse> {
    try {
      // 연결 정보 조회
      const connectionInfo = await this.dbConnectionDao.findById(
        connectionId,
        userId
      );
      if (!connectionInfo) {
        throw new ValidationError("데이터베이스 연결을 찾을 수 없습니다.");
      }

      const dbType = await this.dbTypeDao.findById(connectionInfo.dbTypeId);
      if (!dbType) {
        throw new ValidationError("유효하지 않은 DB 타입입니다.");
      }

      const typeLower = dbType.typeName.toLowerCase();
      if (typeLower === "sqlite") {
        await this.deleteSQLiteColumn(
          connectionInfo.filePath!,
          tableName,
          columnName
        );
      } else if (typeLower === "mariadb" || typeLower === "mysql") {
        await this.deleteMariaDBColumn(connectionInfo, tableName, columnName);
      } else {
        throw new ValidationError(`현재 ${dbType.typeName}은 지원하지 않습니다.`);
      }

      return {
        success: true,
        message: "컬럼이 삭제되었습니다."
      };
    } catch (error) {
      logger.error("[DbConnectionService] deleteColumn 에러:", error);
      throw error;
    }
  }

  /**
   * SQLite 테이블 수정 (내부 메서드)
   */
  private async updateSQLiteTable(
    filePath: string,
    data: UpdateTableRequest
  ): Promise<void> {
    const sqlite3 = require("sqlite3").verbose();

    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(filePath, (err: Error) => {
        if (err) {
          reject(new ValidationError(`SQLite DB 연결 실패: ${err.message}`));
          return;
        }
      });

      db.serialize(() => {
        const queries: string[] = [];

        // 테이블명 변경
        if (data.newTableName) {
          queries.push(
            `ALTER TABLE "${data.tableName}" RENAME TO "${data.newTableName}"`
          );
        }

        // SQLite는 테이블 설명을 지원하지 않으므로 무시
        if (data.tableComment) {
        }

        if (queries.length === 0) {
          db.close();
          reject(new ValidationError("수정할 내용이 없습니다."));
          return;
        }

        let completed = 0;
        queries.forEach((query) => {
          db.run(query, [], (err: Error) => {
            if (err) {
              db.close();
              reject(new ValidationError(`테이블 수정 실패: ${err.message}`));
              return;
            }
            completed++;
            if (completed === queries.length) {
              db.close();
              resolve();
            }
          });
        });
      });
    });
  }

  /**
   * SQLite 테이블 삭제 (내부 메서드)
   */
  private async deleteSQLiteTable(
    filePath: string,
    tableName: string
  ): Promise<void> {
    const sqlite3 = require("sqlite3").verbose();

    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(filePath, (err: Error) => {
        if (err) {
          reject(new ValidationError(`SQLite DB 연결 실패: ${err.message}`));
          return;
        }
      });

      db.run(`DROP TABLE IF EXISTS "${tableName}"`, [], (err: Error) => {
        db.close();
        if (err) {
          reject(new ValidationError(`테이블 삭제 실패: ${err.message}`));
          return;
        }
        resolve();
      });
    });
  }

  /**
   * SQLite 테이블 생성 (내부 메서드)
   */
  private async createSQLiteTable(
    filePath: string,
    data: CreateTableRequest
  ): Promise<void> {
    const sqlite3 = require("sqlite3").verbose();

    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(filePath, (err: Error) => {
        if (err) {
          reject(new ValidationError(`SQLite DB 연결 실패: ${err.message}`));
          return;
        }
      });

      // 컬럼 정의 생성
      const columnDefinitions = data.columns
        .map((col: any) => {
          let definition = `"${col.columnName}" ${col.dataType}`;

          if (col.isPrimaryKey) {
            definition += " PRIMARY KEY";
          }

          if (!col.isNullable) {
            definition += " NOT NULL";
          }

          if (col.defaultValue) {
            definition += ` DEFAULT ${col.defaultValue}`;
          }

          return definition;
        })
        .join(", ");

      const createTableQuery = `CREATE TABLE "${data.tableName}" (${columnDefinitions})`;
      db.run(createTableQuery, [], (err: Error) => {
        db.close();
        if (err) {
          reject(new ValidationError(`테이블 생성 실패: ${err.message}`));
          return;
        }
        resolve();
      });
    });
  }

  /**
   * SQLite 컬럼 추가 (내부 메서드) (2025-11-13)
   */
  private async addSQLiteColumn(
    filePath: string,
    data: AddColumnRequest
  ): Promise<void> {
    const sqlite3 = require("sqlite3").verbose();

    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(filePath, (err: Error) => {
        if (err) {
          reject(new ValidationError(`SQLite DB 연결 실패: ${err.message}`));
          return;
        }
      });

      // 컬럼 정의 생성
      let columnDefinition = `"${data.columnName}" ${data.dataType}`;

      if (!data.isNullable) {
        columnDefinition += " NOT NULL";
      }

      if (data.defaultValue) {
        columnDefinition += ` DEFAULT ${data.defaultValue}`;
      }

      // SQLite는 ALTER TABLE ADD COLUMN으로 컬럼 추가 지원
      // 단, PRIMARY KEY는 테이블 생성 시에만 가능
      if (data.isPrimaryKey) {
        db.close();
        reject(
          new ValidationError(
            "PRIMARY KEY 컬럼은 테이블 생성 시에만 추가할 수 있습니다."
          )
        );
        return;
      }

      const addColumnQuery = `ALTER TABLE "${data.tableName}" ADD COLUMN ${columnDefinition}`;
      db.run(addColumnQuery, [], (err: Error) => {
        db.close();
        if (err) {
          reject(new ValidationError(`컬럼 추가 실패: ${err.message}`));
          return;
        }
        resolve();
      });
    });
  }

  /**
   * SQLite 컬럼 수정 (내부 메서드)
   * SQLite는 ALTER TABLE로 컬럼을 직접 수정할 수 없으므로 테이블 재생성 필요
   */
  private async updateSQLiteColumn(
    filePath: string,
    data: UpdateColumnRequest
  ): Promise<void> {
    const sqlite3 = require("sqlite3").verbose();

    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(filePath, (err: Error) => {
        if (err) {
          reject(new ValidationError(`SQLite DB 연결 실패: ${err.message}`));
          return;
        }
      });

      // SQLite는 컬럼명 변경만 지원 (3.25.0 이상)
      if (data.newColumnName) {
        db.run(
          `ALTER TABLE "${data.tableName}" RENAME COLUMN "${data.columnName}" TO "${data.newColumnName}"`,
          [],
          (err: Error) => {
            db.close();
            if (err) {
              reject(new ValidationError(`컬럼 수정 실패: ${err.message}`));
              return;
            }
            resolve();
          }
        );
      } else {
        db.close();
        reject(
          new ValidationError(
            "SQLite는 컬럼명 변경만 지원합니다. 다른 속성 변경은 테이블 재생성이 필요합니다."
          )
        );
      }
    });
  }

  /**
   * SQLite 컬럼 삭제 (내부 메서드)
   */
  private async deleteSQLiteColumn(
    filePath: string,
    tableName: string,
    columnName: string
  ): Promise<void> {
    const sqlite3 = require("sqlite3").verbose();

    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(filePath, (err: Error) => {
        if (err) {
          reject(new ValidationError(`SQLite DB 연결 실패: ${err.message}`));
          return;
        }
      });

      db.run(
        `ALTER TABLE "${tableName}" DROP COLUMN "${columnName}"`,
        [],
        (err: Error) => {
          db.close();
          if (err) {
            reject(new ValidationError(`컬럼 삭제 실패: ${err.message}`));
            return;
          }
          resolve();
        }
      );
    });
  }

  /**
   * 테이블 데이터 삽입 (2025-12-21)
   */
  async insertTableData(
    connectionId: number,
    userId: string,
    data: InsertTableDataRequest
  ): Promise<InsertTableDataResponse> {
    try {

      const connectionInfo = await this.dbConnectionDao.findById(
        connectionId,
        userId
      );
      if (!connectionInfo) {
        throw new ValidationError("데이터베이스 연결을 찾을 수 없습니다.");
      }

      const dbType = await this.dbTypeDao.findById(connectionInfo.dbTypeId);
      if (!dbType) {
        throw new ValidationError("유효하지 않은 DB 타입입니다.");
      }

      const typeLower = dbType.typeName.toLowerCase();
      if (typeLower === "sqlite") {
        const insertedId = await this.insertSQLiteData(
          connectionInfo.filePath!,
          data.tableName,
          data.data
        );
        return {
          success: true,
          message: "데이터가 추가되었습니다.",
          insertedId
        };
      } else if (typeLower === "mariadb" || typeLower === "mysql") {
        const insertedId = await this.insertMariaDBData(
          connectionInfo,
          data.tableName,
          data.data
        );
        return {
          success: true,
          message: "데이터가 추가되었습니다.",
          insertedId
        };
      } else {
        throw new ValidationError(`현재 ${dbType.typeName}은 지원하지 않습니다.`);
      }
    } catch (error) {
      logger.error("[DbConnectionService] insertTableData 에러:", error);
      throw error;
    }
  }

  /**
   * SQLite 데이터 삽입 (내부 메서드)
   */
  private async insertSQLiteData(
    filePath: string,
    tableName: string,
    data: Record<string, any>
  ): Promise<number | undefined> {
    const sqlite3 = require("sqlite3").verbose();

    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(filePath, (err: Error) => {
        if (err) {
          reject(new ValidationError(`SQLite DB 연결 실패: ${err.message}`));
          return;
        }
      });

      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = columns.map(() => "?").join(", ");

      const insertQuery = `INSERT INTO "${tableName}" (${columns
        .map((c) => `"${c}"`)
        .join(", ")}) VALUES (${placeholders})`;
      db.run(insertQuery, values, function (this: any, err: Error) {
        db.close();
        if (err) {
          reject(new ValidationError(`데이터 삽입 실패: ${err.message}`));
          return;
        }
        resolve(this.lastID);
      });
    });
  }

  // ────────────────────────────────────────────────────────────────────
  // Stage 6 — MariaDB/MySQL 테이블·컬럼 CRUD + 데이터 삽입
  // SQL Injection 다층 방어:
  //   (1) assertSafeIdentifier: 식별자(테이블·컬럼명) 정규식 화이트리스트
  //   (2) assertSafeDataType: 컬럼 타입 정규식 화이트리스트
  //   (3) escapeMariaDBIdentifier: 백틱 escape (식별자 외각)
  //   (4) bound parameter: 값은 ? placeholder 로 전달
  // ────────────────────────────────────────────────────────────────────

  /** 식별자(테이블명·컬럼명) 정규식 화이트리스트 검증 */
  private assertSafeIdentifier(name: string, kind = "식별자"): void {
    if (typeof name !== "string" || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      throw new ValidationError(`잘못된 ${kind}: ${name}`);
    }
  }

  /** dataType 정규식 화이트리스트 — 키워드/Injection 차단 */
  private assertSafeDataType(dataType: string): void {
    if (
      typeof dataType !== "string" ||
      !/^[A-Za-z][A-Za-z0-9_]*(\s*\([^)\;\-]+\))?(\s+UNSIGNED)?$/i.test(
        dataType.trim()
      )
    ) {
      throw new ValidationError(`잘못된 데이터 타입: ${dataType}`);
    }
  }

  /** 식별자 백틱 escape (assertSafeIdentifier 통과 후 사용) */
  private escapeMariaDBIdentifier(name: string): string {
    return "`" + String(name).replace(/`/g, "``") + "`";
  }

  /** SQL 문자열 escape — 코멘트 같은 metadata 에 한정. 일반 값은 bound parameter 사용 */
  private escapeMariaDBString(value: string): string {
    return (
      "'" + String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'"
    );
  }

  /** DEFAULT 값 안전 포맷팅 — 숫자형이면 Number 검증, 그 외는 quoted string */
  private formatDefaultValue(value: any, dataType: string): string {
    const typeLower = dataType.toLowerCase();
    const isNumeric =
      /^(int|tinyint|smallint|mediumint|bigint|float|double|decimal|numeric|bit)/.test(
        typeLower
      );
    if (isNumeric) {
      const n = Number(value);
      if (Number.isNaN(n)) {
        throw new ValidationError(`잘못된 숫자 기본값: ${value}`);
      }
      return String(n);
    }
    return this.escapeMariaDBString(String(value));
  }

  /**
   * MariaDB DDL/DML 단일 statement 공용 실행 헬퍼.
   * Stage 2 의 buildMariaDBAdapterConfig 재사용.
   * 에러는 translateMariaDBError 로 친화 변환.
   */
  private async executeMariaDBStatement(
    connection: any,
    label: string,
    sql: string,
    params: any[] = []
  ): Promise<any> {
    const adapter = DatabaseFactory.createAdapter(
      this.buildMariaDBAdapterConfig(connection, label)
    );
    let client: any = null;
    try {
      await adapter.create();
      client = await adapter.connect();
      return await adapter.query(sql, params, client);
    } catch (error: any) {
      // 우리가 명시적으로 throw 한 ValidationError 는 그대로 통과
      if (error instanceof ValidationError) throw error;
      throw new Error(this.translateMariaDBError(error, "MariaDB"));
    } finally {
      if (client) {
        try {
          await adapter.disconnect(client);
        } catch {
          // 정리 실패는 무시
        }
      }
      try {
        await adapter.destroy?.();
      } catch {
        // 정리 실패는 무시
      }
    }
  }

  /** MariaDB 테이블 수정 — 테이블명 변경 + 코멘트 변경 */
  private async updateMariaDBTable(
    connection: any,
    data: UpdateTableRequest
  ): Promise<void> {
    this.assertSafeIdentifier(data.tableName, "테이블명");
    if (data.newTableName) {
      this.assertSafeIdentifier(data.newTableName, "새 테이블명");
    }
    if (!data.newTableName && data.tableComment === undefined) {
      throw new ValidationError("수정할 내용이 없습니다.");
    }

    const oldName = this.escapeMariaDBIdentifier(data.tableName);

    if (data.newTableName) {
      const newName = this.escapeMariaDBIdentifier(data.newTableName);
      await this.executeMariaDBStatement(
        connection,
        "rename-table",
        `ALTER TABLE ${oldName} RENAME TO ${newName}`
      );
    }
    if (data.tableComment !== undefined) {
      const target = data.newTableName
        ? this.escapeMariaDBIdentifier(data.newTableName)
        : oldName;
      const commentEscaped = this.escapeMariaDBString(data.tableComment);
      await this.executeMariaDBStatement(
        connection,
        "table-comment",
        `ALTER TABLE ${target} COMMENT = ${commentEscaped}`
      );
    }
  }

  /** MariaDB 테이블 삭제 */
  private async deleteMariaDBTable(
    connection: any,
    tableName: string
  ): Promise<void> {
    this.assertSafeIdentifier(tableName, "테이블명");
    await this.executeMariaDBStatement(
      connection,
      "drop-table",
      `DROP TABLE IF EXISTS ${this.escapeMariaDBIdentifier(tableName)}`
    );
  }

  /** MariaDB 테이블 생성 */
  private async createMariaDBTable(
    connection: any,
    data: CreateTableRequest
  ): Promise<void> {
    this.assertSafeIdentifier(data.tableName, "테이블명");
    if (!data.columns || data.columns.length === 0) {
      throw new ValidationError("컬럼 정의가 비어 있습니다.");
    }

    const tableName = this.escapeMariaDBIdentifier(data.tableName);

    const columnDefs = data.columns
      .map((col: any) => {
        this.assertSafeIdentifier(col.columnName, "컬럼명");
        this.assertSafeDataType(col.dataType);
        let def = `${this.escapeMariaDBIdentifier(col.columnName)} ${col.dataType}`;
        if (!col.isNullable) def += " NOT NULL";
        if (col.isPrimaryKey) def += " PRIMARY KEY";
        if (
          col.defaultValue !== undefined &&
          col.defaultValue !== null &&
          col.defaultValue !== ""
        ) {
          def += ` DEFAULT ${this.formatDefaultValue(col.defaultValue, col.dataType)}`;
        }
        if (col.columnComment) {
          def += ` COMMENT ${this.escapeMariaDBString(col.columnComment)}`;
        }
        return def;
      })
      .join(", ");

    let sql = `CREATE TABLE ${tableName} (${columnDefs})`;
    if (data.tableComment) {
      sql += ` COMMENT = ${this.escapeMariaDBString(data.tableComment)}`;
    }
    await this.executeMariaDBStatement(connection, "create-table", sql);
  }

  /** MariaDB 컬럼 추가 */
  private async addMariaDBColumn(
    connection: any,
    data: AddColumnRequest
  ): Promise<void> {
    this.assertSafeIdentifier(data.tableName, "테이블명");
    this.assertSafeIdentifier(data.columnName, "컬럼명");
    this.assertSafeDataType(data.dataType);

    const tableName = this.escapeMariaDBIdentifier(data.tableName);
    const columnName = this.escapeMariaDBIdentifier(data.columnName);

    let def = `${columnName} ${data.dataType}`;
    if (!data.isNullable) def += " NOT NULL";
    if (
      data.defaultValue !== undefined &&
      data.defaultValue !== null &&
      data.defaultValue !== ""
    ) {
      def += ` DEFAULT ${this.formatDefaultValue(data.defaultValue, data.dataType)}`;
    }
    if (data.columnComment) {
      def += ` COMMENT ${this.escapeMariaDBString(data.columnComment)}`;
    }

    await this.executeMariaDBStatement(
      connection,
      "add-column",
      `ALTER TABLE ${tableName} ADD COLUMN ${def}`
    );

    if (data.isPrimaryKey) {
      await this.executeMariaDBStatement(
        connection,
        "add-primary-key",
        `ALTER TABLE ${tableName} ADD PRIMARY KEY (${columnName})`
      );
    }
  }

  /** MariaDB 컬럼 수정 (CHANGE COLUMN — 컬럼명·타입·null·default·코멘트 모두) */
  private async updateMariaDBColumn(
    connection: any,
    data: UpdateColumnRequest
  ): Promise<void> {
    this.assertSafeIdentifier(data.tableName, "테이블명");
    this.assertSafeIdentifier(data.columnName, "컬럼명");
    if (data.newColumnName) {
      this.assertSafeIdentifier(data.newColumnName, "새 컬럼명");
    }

    // CHANGE COLUMN 은 dataType 필수 → 사용자가 명시 안 하면 현재 type 조회
    let dataType = data.dataType;
    if (!dataType) {
      const result = await this.executeMariaDBStatement(
        connection,
        "lookup-column-type",
        `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [data.tableName, data.columnName]
      );
      const rows = result?.rows;
      if (!rows || rows.length === 0) {
        throw new ValidationError(`컬럼을 찾을 수 없습니다: ${data.columnName}`);
      }
      dataType = rows[0].COLUMN_TYPE as string;
    }
    this.assertSafeDataType(dataType);

    const tableName = this.escapeMariaDBIdentifier(data.tableName);
    const oldCol = this.escapeMariaDBIdentifier(data.columnName);
    const newCol = data.newColumnName
      ? this.escapeMariaDBIdentifier(data.newColumnName)
      : oldCol;

    let def = `${dataType}`;
    if (data.isNullable === false) def += " NOT NULL";
    else if (data.isNullable === true) def += " NULL";
    if (
      data.defaultValue !== undefined &&
      data.defaultValue !== null &&
      data.defaultValue !== ""
    ) {
      def += ` DEFAULT ${this.formatDefaultValue(data.defaultValue, dataType)}`;
    }
    if (data.columnComment !== undefined) {
      def += ` COMMENT ${this.escapeMariaDBString(data.columnComment)}`;
    }

    await this.executeMariaDBStatement(
      connection,
      "change-column",
      `ALTER TABLE ${tableName} CHANGE COLUMN ${oldCol} ${newCol} ${def}`
    );
  }

  /** MariaDB 컬럼 삭제 */
  private async deleteMariaDBColumn(
    connection: any,
    tableName: string,
    columnName: string
  ): Promise<void> {
    this.assertSafeIdentifier(tableName, "테이블명");
    this.assertSafeIdentifier(columnName, "컬럼명");
    await this.executeMariaDBStatement(
      connection,
      "drop-column",
      `ALTER TABLE ${this.escapeMariaDBIdentifier(tableName)} DROP COLUMN ${this.escapeMariaDBIdentifier(columnName)}`
    );
  }

  /** MariaDB 데이터 삽입 — bound parameter 사용 */
  private async insertMariaDBData(
    connection: any,
    tableName: string,
    data: Record<string, any>
  ): Promise<number | undefined> {
    this.assertSafeIdentifier(tableName, "테이블명");
    const columns = Object.keys(data);
    if (columns.length === 0) {
      throw new ValidationError("삽입할 데이터가 비어 있습니다.");
    }
    columns.forEach((c) => this.assertSafeIdentifier(c, "컬럼명"));

    const escapedCols = columns
      .map((c) => this.escapeMariaDBIdentifier(c))
      .join(", ");
    const placeholders = columns.map(() => "?").join(", ");
    const values = columns.map((c) => data[c]);

    const result = await this.executeMariaDBStatement(
      connection,
      "insert-data",
      `INSERT INTO ${this.escapeMariaDBIdentifier(tableName)} (${escapedCols}) VALUES (${placeholders})`,
      values
    );
    const insertedId = result?.lastInsertRowid;
    if (typeof insertedId === "bigint") {
      return insertedId <= BigInt(Number.MAX_SAFE_INTEGER)
        ? Number(insertedId)
        : undefined;
    }
    return typeof insertedId === "number" ? insertedId : undefined;
  }
}
