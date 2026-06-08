import { promisify } from "util";
import { systemLog } from "../../utils/Logger";
import { BaseAdapter } from "./BaseAdapter";
import { Database } from "sqlite3";
import { SQLiteDatabaseConfig } from "../types";

interface PromisifiedDatabase extends Database {
  runAsync: (sql: string, ...params: any[]) => Promise<any>;
  allAsync: (sql: string, ...params: any[]) => Promise<any[]>;
  getAsync: (sql: string, ...params: any[]) => Promise<any>;
  execAsync: (sql: string) => Promise<void>;
  closeAsync: () => Promise<void>;
}

export class SQLiteAdapter extends BaseAdapter<
  PromisifiedDatabase,
  SQLiteDatabaseConfig
> {
  private transactionDepth: number = 0;

  // ───────────────────────────────────────────────────────────────────
  // 트랜잭션 직렬화 mutex
  //
  // [배경] SQLiteAdapter.connect() 는 단일 connectionInstance 를 항상 반환한다
  // (PostgreSQLAdapter 는 Pool 에서 매번 다른 client 를 반환하는 것과 대조).
  // 따라서 동시 HTTP 요청(예: 프론트 페이지 로드 시 병렬 API 호출)이 각자
  // @Transactional 로 같은 connection 에 BEGIN 을 실행하면 SQLite 가
  // "cannot start a transaction within a transaction" 으로 거부한다.
  //
  // [해결] beginTransaction 에서 mutex 를 잡고 commit/rollback 에서 해제하여
  // transaction 을 직렬화한다. SQLite 는 본질적으로 single-writer 이고
  // desktop 은 single-user 라 직렬화 비용은 체감되지 않는다.
  //
  // [한계 / 향후 개선] mutex 는 read 트랜잭션까지 직렬화하므로 WAL 의 다중
  // reader 병렬성을 활용하지 못한다. 동시성 병목이 실측되면 connection pool
  // (PostgreSQLAdapter 처럼 connect()=새 connection 획득, releaseConnection()=
  // 반환) 으로 전환할 것. 그 경우 transactionDepth 를 connection 별로 옮기고
  // busy_timeout / :memory: 분기 / schema init connection 정합을 함께 처리해야
  // 한다. 상세 설계는 desktop-v2 작업 기록 참조.
  // ───────────────────────────────────────────────────────────────────
  private txMutexHeld: boolean = false;
  private txWaiters: Array<() => void> = [];

  private acquireTxMutex(): Promise<void> {
    if (!this.txMutexHeld) {
      this.txMutexHeld = true;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => this.txWaiters.push(resolve));
  }

  private releaseTxMutex(): void {
    const next = this.txWaiters.shift();
    if (next) {
      // 대기자에게 직접 양도 (held 유지 → 소유권만 이동)
      next();
    } else {
      this.txMutexHeld = false;
    }
  }

  async create(): Promise<void> {
    const dbPath = this.config.filePath || ":memory:";

    return new Promise((resolve, reject) => {
      const database = new Database(dbPath, async (err) => {
        if (err) {
          systemLog.error("connection failed", err);
          reject(err);
          return;
        }

        this.connectionInstance = database as PromisifiedDatabase;

        // this.connectionInstance.runAsync = promisify(this.connectionInstance.run.bind(this.connectionInstance));
        this.connectionInstance.runAsync = promisify(
          this.connectionInstance.run.bind(this.connectionInstance)
        );
        this.connectionInstance.allAsync = promisify(
          this.connectionInstance.all.bind(this.connectionInstance)
        );
        this.connectionInstance.getAsync = promisify(
          this.connectionInstance.get.bind(this.connectionInstance)
        );
        this.connectionInstance.execAsync = promisify(
          this.connectionInstance.exec.bind(this.connectionInstance)
        );
        this.connectionInstance.closeAsync = promisify(
          this.connectionInstance.close.bind(this.connectionInstance)
        );

        try {
          await this.connectionInstance.runAsync("PRAGMA journal_mode = WAL");
          await this.connectionInstance.runAsync("PRAGMA foreign_keys = ON");
          this._isConnected = true;

          systemLog.info(`SQLite connected to ${dbPath}`);
          resolve();
        } catch (error) {
          systemLog.error(error, "connect");
          reject(error);
        }
      });
    });
  }

  async connect(): Promise<PromisifiedDatabase> {
    if (!this.connectionInstance) {
      throw new Error("SQLite not connected, create Method first.");
    }
    return this.connectionInstance;
  }

  async destroy(): Promise<void> {
    try {
      if (this.connectionInstance) {
        // 진행 중인 트랜잭션 롤백
        if (this.transactionDepth > 0) {
          try {
            await this.connectionInstance.runAsync("ROLLBACK");
            systemLog.warn(
              `[${this.adapterName}] Rolled back ${this.transactionDepth} pending transaction(s)`
            );
          } catch (e) {
            // 롤백 실패는 무시 (이미 종료 중)
          }
        }

        // WAL 체크포인트 실행 (데이터 정리)
        try {
          await this.connectionInstance.runAsync(
            "PRAGMA wal_checkpoint(TRUNCATE)"
          );
        } catch (e) {
          systemLog.debug("WAL checkpoint failed (may not be using WAL mode)");
        }

        // 데이터베이스 연결 종료
        await this.connectionInstance.closeAsync();
        this.connectionInstance = null;
        this._isConnected = false;
        systemLog.info("SQLite database destroyed");
      }
    } catch (error) {
      this.handleError(error, "destroy");
    }
  }

  async disconnect(): Promise<void> {
    systemLog.info("SQLite disconnect called");
  }

  async query(
    command: string,
    params?: any[],
    client?: PromisifiedDatabase
  ): Promise<any> {
    if (!client) {
      throw new Error(
        `[${this.adapterName}] Client must be provided as third parameter.`
      );
    }

    try {
      const transformed = this.transformQuery(command, params);
      const sqlType = this.getSqlType(transformed.command);
      return await this.executeSqlByType(client, sqlType, transformed.command, transformed.params);
    } catch (error) {
      this.handleError(error, "query");
    }
  }

  public supportsTransaction(): boolean {
    return true;
  }

  public async beginTransaction(
    connection: PromisifiedDatabase
  ): Promise<void> {
    // mutex 를 먼저 잡아야 BEGIN 가능 (동시 BEGIN 직렬화)
    await this.acquireTxMutex();
    try {
      await connection.runAsync("BEGIN TRANSACTION");
      this.transactionDepth++;
    } catch (error) {
      // BEGIN 실패 시 mutex 를 즉시 해제해야 다음 대기자가 진행 가능
      this.releaseTxMutex();
      throw error;
    }
  }

  public async commitTransaction(
    connection: PromisifiedDatabase
  ): Promise<void> {
    try {
      await connection.runAsync("COMMIT");
      this.transactionDepth = Math.max(0, this.transactionDepth - 1);
    } finally {
      // commit 성공/실패와 무관하게 mutex 해제 (해제 누락 시 전체 deadlock)
      this.releaseTxMutex();
    }
  }

  public async rollbackTransaction(
    connection: PromisifiedDatabase
  ): Promise<void> {
    try {
      await connection.runAsync("ROLLBACK");
      this.transactionDepth = Math.max(0, this.transactionDepth - 1);
    } finally {
      // rollback 이 실패해도 (transactionResolver 는 rollback 에러를 삼킨다)
      // mutex 는 반드시 해제 — 누락 시 후속 모든 요청이 영구 대기
      this.releaseTxMutex();
    }
  }

  public async releaseConnection(_: PromisifiedDatabase): Promise<void> {
    systemLog.debug(
      `[${this.adapterName}] Connection release called (no-op for SQLite)`
    );
  }

  private getSqlType(command: string): "SELECT" | "MODIFY" | "DDL" | "PRAGMA" {
    const upperCommand = command.trim().toUpperCase();

    if (upperCommand.startsWith("PRAGMA")) {
      return "PRAGMA";
    }

    if (upperCommand.startsWith("SELECT") || upperCommand.startsWith("WITH")) {
      return "SELECT";
    }

    if (
      upperCommand.startsWith("INSERT") ||
      upperCommand.startsWith("UPDATE") ||
      upperCommand.startsWith("DELETE") ||
      upperCommand.startsWith("REPLACE")
    ) {
      return "MODIFY";
    }
    return "DDL";
  }

  private async executeReturning(
    db: PromisifiedDatabase,
    command: string,
    params?: any[]
  ): Promise<any> {
    const rows = await new Promise<any[]>((resolve, reject) => {
      const results: any[] = [];
      db.each(
        command,
        params || [],
        (err: Error | null, row: any) => {
          if (err) {
            reject(err);
            return;
          }
          results.push(row);
        },
        (err: Error | null) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(results);
        }
      );
    });
    return { rows, rowCount: rows.length };
  }

  private async executeSqlByType(
    db: PromisifiedDatabase,
    sqlType: string,
    command: string,
    params?: any[]
  ): Promise<any> {
    // RETURNING 포함 시 sqlType 무관하게 db.each 사용.
    // sqlite3 npm v5 의 db.all() 이 INSERT/UPDATE/DELETE...RETURNING 에서
    // prepare/step 사이클 중 statement 를 두 번 실행하는 known issue 우회.
    // CTE (WITH ... INSERT ... RETURNING) 도 이 분기로 처리됨.
    // word boundary 로 컬럼명/주석의 'returning' 오탐 방지.
    const returningRegex = /\bRETURNING\b/i;
    if (returningRegex.test(command)) {
      return this.executeReturning(db, command, params);
    }

    switch (sqlType) {
      case "SELECT":
      case "PRAGMA":
        const rows = await db.allAsync(command, ...(params || []));
        return { rows, rowCount: rows.length };
      case "MODIFY":

        const result = await new Promise<any>((resolve, reject) => {
          db.run(command, params || [], function (err) {
            if (err) {
              reject(err);
            } else {
              resolve({ changes: this.changes, lastID: this.lastID });
            }
          });
        });

        return {
          rows: [],
          rowCount: result.changes,
          lastInsertRowid: result.lastID
        };

      case "DDL":
      default:
        await db.runAsync(command, ...(params || []));
        return { rows: [], rowCount: 0 };
    }
  }
}
