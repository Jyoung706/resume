/**
 * Phase 3 PR#11-3 - MariaDB / MySQL streaming adapter.
 *
 * mariadb (Node.js) driver 의 connection.queryStream() 기반 row streaming.
 * mariadb driver 는 _MariaDB 와 MySQL 모두_ wire protocol 호환 - 본 adapter 가
 * factory 의 MySQL / MariaDB 두 typeName 모두 처리.
 *
 * D9: START TRANSACTION READ ONLY - SELECT INTO OUTFILE / FOR UPDATE 차단.
 * D18-c: multipleStatements: false 명시.
 * D22: backend 내부에서 mariadb 직접 import (core 추상화 우회).
 *
 * Phase 후속 (옵션 C, docs/2026-06-04/export-adapter-destroy-refactor-plan.md):
 *   - close() 가 streaming 중 호출돼도 for-await 가 hang 하지 않도록 _destroy
 *     표준 패턴 도입. cleanupQuiet 제거 → 단일 cleanup 진입점.
 *   - 모든 가드 (data / end / error) 를 this.destroyed + _endScheduled 로 통일.
 *   - 관련 결정: D-EX9 (가드 마이그레이션 + cleanupQuiet 제거).
 *   - PG 의 D-EX10 (async IIFE + 중첩 try/catch + outer finally) 도 동일 적용.
 *     mariadb 는 명시 ROLLBACK 없이 conn.end() 만 — connection 종료 시 transaction
 *     자동 rollback (mariadb/MySQL 표준 동작).
 *
 * 의존성:
 *   - mariadb (이미 @orkis/core transitive 로 존재 - 별도 추가 불필요)
 *
 * 변경 이력 (사용자 지적 - 2026-06-04):
 *   PR#11-1 의 MysqlStreamAdapter (mysql2 기반) 는 core 의 mariadb driver 와
 *   중복 의존성. 본 PR#11-3 에서 mariadb driver 로 전환 + mysql2 의존성 제거.
 */
import { Readable } from "stream";
import logger from "@orkis/core/utils";
import {
  IDbStreamAdapter,
  OpenStreamInput,
  RowStream
} from "./IDbStreamAdapter";

export interface MariadbAdapterConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string | undefined;
  connectionTimeoutMillis: number;
}

export class MariadbStreamAdapter implements IDbStreamAdapter {
  /**
   * factory 가 MySQL / MariaDB 어느 type 으로 호출하든 본 adapter 가 처리.
   * typeName 은 _자기 식별_ 용도 - log / contract test 의 출력에 사용.
   */
  readonly typeName: string;

  constructor(
    private readonly config: MariadbAdapterConfig,
    typeName: "MariaDB" | "MySQL" = "MariaDB"
  ) {
    this.typeName = typeName;
  }

  async validateSyntax(sql: string): Promise<void> {
    const mariadb = require("mariadb");
    const conn = await mariadb.createConnection(this.buildOptions());
    try {
      // user variable + PREPARE/DEALLOCATE - parameter binding 으로 escape 안전
      const stmtName = `_orkis_export_validate_${Date.now()}_${Math.floor(
        Math.random() * 1e6
      )}`;
      await conn.query("SET @_orkis_validate_sql = ?", [sql]);
      await conn.query(`PREPARE ${stmtName} FROM @_orkis_validate_sql`);
      await conn.query(`DEALLOCATE PREPARE ${stmtName}`);
    } catch (err: any) {
      throw new Error(`SQL 문법 오류: ${err?.message ?? String(err)}`);
    } finally {
      try {
        await conn.end();
      } catch (endErr) {
        logger.warn(
          "[MariadbStreamAdapter] validateSyntax conn.end 실패:",
          endErr
        );
      }
    }
  }

  async openRowStream(input: OpenStreamInput): Promise<RowStream> {
    const mariadb = require("mariadb");
    const conn = await mariadb.createConnection(this.buildOptions());

    // D9: START TRANSACTION READ ONLY
    try {
      await conn.query("START TRANSACTION READ ONLY");
    } catch (txErr) {
      try {
        await conn.end();
      } catch {}
      throw txErr;
    }

    // mariadb 의 queryStream(sql) - native cursor 기반 Readable
    // batchSize 매핑: mariadb driver 는 fetch chunk size 를 queryStream 옵션으로 받지 않음.
    // server-side prefetch 는 자체 결정. fetchBatchSize 는 _향후 보강_ 항목.
    const inner = conn.queryStream(input.sql);

    return new MariadbRowStream(inner, conn);
  }

  private buildOptions(): Record<string, unknown> {
    return {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      connectTimeout: this.config.connectionTimeoutMillis,
      multipleStatements: false, // D18-c
      // BIGINT 를 number 로 (default BigInt 는 JSON.stringify 안 됨)
      bigIntAsNumber: true,
      // DATE/DATETIME 을 string 으로 (Date 인스턴스 회피 - JSON.stringify 안정)
      dateStrings: true,
      // INSERT/UPDATE 결과 metadata 비활성 - SELECT 전용 streaming 이라 무관
      insertIdAsNumber: true
    };
  }
}

/**
 * mariadb driver 의 queryStream() Readable 을 IDbStreamAdapter contract 로 wrap.
 *
 * native pause/resume backpressure 지원 - SqliteStreamAdapter 의 internal queue
 * 패턴 불필요.
 *
 * 옵션 C: 종료 / abort / error 세 경로 모두 _destroy 단일 진입점으로 수렴.
 * close 의 idempotency 및 conn.end 호출 보장 (D-EX10 의 패턴 — mariadb 는
 * 명시 ROLLBACK 없이 conn.end 만으로 transaction 자동 종료).
 */
class MariadbRowStream extends Readable implements RowStream {
  private _rowsEmitted = 0;
  /**
   * "stream 종료가 시작됨" 단일 상태 플래그. push(null) 또는 destroy(err)
   * 호출 _이전_ 에 set. 이후의 inner 'data'/'end'/'error' 콜백은 본 플래그를
   * 보고 추가 push(row) 를 막아 push-after-EOF 차단.
   */
  private _endScheduled = false;
  private conn: any;

  constructor(
    private readonly inner: NodeJS.ReadableStream,
    conn: any
  ) {
    super({ objectMode: true });
    this.conn = conn;

    inner.on("data", (row: Record<string, unknown>) => {
      // D-EX9: data 핸들러도 _endScheduled 가드. push(null) 이후 잔여 row 가
      // push 되면 ERR_STREAM_PUSH_AFTER_EOF.
      if (this.destroyed || this._endScheduled) return;
      this._rowsEmitted++;
      const ok = this.push(row);
      if (!ok) {
        if (typeof (inner as any).pause === "function") {
          (inner as any).pause();
        }
      }
    });

    inner.on("end", () => {
      // D-EX9: end 핸들러도 _endScheduled 가드. close() 가 이미 push(null)
      // 을 호출했다면 중복 발화 회피.
      if (this.destroyed || this._endScheduled) return;
      this._endScheduled = true;
      this.push(null);
      // 'end' 후 destroy 로 cleanup 트리거. 직접 destroy 는 endOfStream 의
      // "Premature close" race 위험 - once('end') 패턴으로 회피.
      this.once("end", () => this.destroy());
    });

    inner.on("error", (err: Error) => {
      // D-EX9: error 핸들러도 _endScheduled 가드 + cleanupQuiet 호출 제거.
      // destroy(err) 가 _destroy 진입 → cleanup 일원화.
      if (this.destroyed || this._endScheduled) return;
      this._endScheduled = true;
      this.destroy(err);
    });
  }

  get rowsEmitted(): number {
    return this._rowsEmitted;
  }

  _read(_size: number): void {
    if (typeof (this.inner as any).resume === "function") {
      (this.inner as any).resume();
    }
  }

  /**
   * Readable lifecycle 의 단일 cleanup 진입점. 정상 종료 / abort / error 세
   * 경로 모두 본 메서드를 통과.
   *
   * mariadb 자원 정리 순서 (D-EX10 패턴 적용):
   *   1. inner stream (queryStream) destroy - network flow 즉시 차단
   *   2. conn.end() - mariadb connection 종료. connection 종료 시 mariadb/
   *      MySQL 표준 동작으로 active transaction 자동 rollback. 명시 ROLLBACK
   *      불필요 (PG 와의 차이점).
   *   3. outer finally 가 callback(err) 1회 보장 - logger.warn 자체 throw
   *      등 secondary 에러로 conn.end 가 skip 되지 않도록.
   */
  _destroy(
    err: Error | null,
    callback: (e: Error | null) => void
  ): void {
    const connRef = this.conn;
    this.conn = null;
    if (!connRef) {
      callback(err);
      return;
    }
    try {
      if (typeof (this.inner as any).destroy === "function") {
        (this.inner as any).destroy();
      }
    } catch (destroyErr) {
      // Phase E Finding 5 (Critical): sync prelude 의 logger.warn 도
      // try/catch 로 wrap. PG / SQLite 와 동일 보강.
      try {
        logger.warn(
          "[MariadbStreamAdapter] inner stream destroy 실패:",
          destroyErr
        );
      } catch {
        /* swallow */
      }
    }
    // D-EX10 패턴: async IIFE + 중첩 try/catch + outer finally. logger.warn
    // secondary throw 가 callback 호출을 skip 시키지 않도록 보장. Phase E
    // Finding 4 추가: 각 catch 의 logger.warn 도 자체 try/catch.
    (async () => {
      try {
        try {
          await connRef.end();
        } catch (endErr) {
          try {
            logger.warn(
              "[MariadbStreamAdapter] conn.end 실패:",
              endErr
            );
          } catch {
            /* swallow */
          }
        }
      } finally {
        callback(err);
      }
    })();
  }

  /**
   * IDbStreamAdapter.RowStream contract. 옵션 C 도입 후 본 메서드는 push(null)
   * → 'end' → destroy 패턴의 wrapper. inner stream destroy 는 close 즉시
   * 호출하여 network flow 를 빠르게 차단.
   *
   * 직접 destroy 호출은 for-await 의 endOfStream 헬퍼가 'close' 를 'end' 전에
   * 감지하여 "Premature close" throw 하는 race 위험 - push(null) 우선.
   *
   * idempotent (이미 'close' 발화 후 또는 종료 진행 중이어도 안전).
   */
  async close(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.closed) {
        resolve();
        return;
      }
      this.once("close", () => resolve());
      if (this.destroyed) return; // 이미 destroying - 'close' 만 대기
      if (!this._endScheduled) {
        this._endScheduled = true;
        try {
          if (typeof (this.inner as any).destroy === "function") {
            (this.inner as any).destroy();
          }
        } catch (innerDestroyErr) {
          // Phase E Finding 5: close() 의 sync prelude 도 _destroy 와 동일하게
          // logger.warn 의 secondary throw 로부터 보호.
          try {
            logger.warn(
              "[MariadbStreamAdapter] close inner destroy 실패:",
              innerDestroyErr
            );
          } catch {
            /* swallow */
          }
        }
        this.push(null);
        this.once("end", () => this.destroy());
      }
    });
  }
}
