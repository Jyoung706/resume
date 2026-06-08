/**
 * Phase 3 PR#10-2 - PostgreSQL streaming adapter.
 *
 * pg-query-stream 의 portal/cursor 기반 row streaming.
 * D9: BEGIN READ ONLY DEFERRABLE 트랜잭션으로 pg_sleep / dblink 등 부수효과 차단.
 * D22: backend 내부에서 pg + pg-query-stream 직접 import (core 추상화 우회).
 *
 * Phase 후속 (옵션 C, docs/2026-06-04/export-adapter-destroy-refactor-plan.md):
 *   - close() 가 streaming 중 호출돼도 for-await 가 hang 하지 않도록 _destroy
 *     표준 패턴 도입. cleanupQuiet 제거 → 단일 cleanup 진입점.
 *   - 모든 가드 (data / end / error) 를 this.destroyed + _endScheduled 로 통일.
 *   - 관련 결정: D-EX9 (가드 마이그레이션 + cleanupQuiet 제거) / D-EX10
 *     (_destroy 의 async IIFE + 중첩 try/catch + outer finally - logger throw
 *     발생 시에도 client.end() skip 방지).
 *
 * 의존성 (PR#10-4 에서 package.json 에 추가):
 *   - pg (이미 메타 DB 용 transitive 존재)
 *   - pg-query-stream
 *
 * 의존성 미설치 시 require 시점 throw - PostgreSQL connection 을 export
 * 하려 할 때만 발생. SqliteStreamAdapter 만 사용하는 환경은 영향 없음.
 *
 * 실측 검증: docker compose 의 postgres:16-alpine 컨테이너 + scripts/check/
 *   run-adapter-contract.ts 의 PG 케이스 (PR#10-3).
 */
import { Readable } from "stream";
import logger from "@orkis/core/utils";
import {
  IDbStreamAdapter,
  OpenStreamInput,
  RowStream
} from "./IDbStreamAdapter";

export interface PostgresAdapterConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string | undefined;
  /** ms - connect timeout. statement_timeout 은 export 에서 0 (long-running) */
  connectionTimeoutMillis: number;
}

/** validateSyntax 의 PREPARE 단계 timeout - K13 회피 (sqlite3 와 다름) */
const VALIDATE_STATEMENT_TIMEOUT_MS = 5000;

export class PostgresStreamAdapter implements IDbStreamAdapter {
  readonly typeName = "PostgreSQL";

  constructor(private readonly config: PostgresAdapterConfig) {}

  async validateSyntax(sql: string): Promise<void> {
    const { Client } = require("pg");
    const client = new Client(this.buildClientOptions());
    await client.connect();
    try {
      await client.query(
        `SET statement_timeout = ${VALIDATE_STATEMENT_TIMEOUT_MS}`
      );
      // 임시 PREPARE 이름 + DEALLOCATE - 부수효과 없음
      const stmtName = `_orkis_export_validate_${Date.now()}_${Math.floor(
        Math.random() * 1e6
      )}`;
      await client.query(`PREPARE ${stmtName} AS ${sql}`);
      await client.query(`DEALLOCATE ${stmtName}`);
    } catch (err: any) {
      throw new Error(`SQL 문법 오류: ${err?.message ?? String(err)}`);
    } finally {
      try {
        await client.end();
      } catch (endErr) {
        logger.warn(
          "[PostgresStreamAdapter] validateSyntax client.end 실패:",
          endErr
        );
      }
    }
  }

  async openRowStream(input: OpenStreamInput): Promise<RowStream> {
    const { Client } = require("pg");
    const QueryStream = require("pg-query-stream");

    const client = new Client(this.buildClientOptions());
    await client.connect();

    // D9: READ-ONLY DEFERRABLE - 부수효과 차단 + serializable snapshot 회피
    try {
      await client.query("BEGIN READ ONLY DEFERRABLE");
    } catch (txErr) {
      try {
        await client.end();
      } catch {}
      throw txErr;
    }

    const queryStream = new QueryStream(input.sql, [], {
      batchSize: input.fetchBatchSize
    });
    const innerStream = client.query(queryStream);

    return new PgRowStream(innerStream, client);
  }

  private buildClientOptions(): Record<string, unknown> {
    return {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      connectionTimeoutMillis: this.config.connectionTimeoutMillis,
      // export 는 long-running 허용 - server-level default 가 작아도 export 만 해제
      statement_timeout: 0,
      query_timeout: 0
    };
  }
}

/**
 * pg-query-stream 의 Readable 을 IDbStreamAdapter contract 로 wrap.
 *
 * pg-query-stream 은 portal/cursor 기반 native pause/resume 지원 -
 * SqliteStreamAdapter 의 internal queue 패턴 불필요.
 *
 * 옵션 C: 종료 / abort / error 세 경로 모두 _destroy 단일 진입점으로 수렴.
 * close 의 idempotency 및 ROLLBACK + client.end 호출 보장 (D-EX10).
 */
class PgRowStream extends Readable implements RowStream {
  private _rowsEmitted = 0;
  /**
   * "stream 종료가 시작됨" 단일 상태 플래그. push(null) 호출 _이전_ 또는
   * destroy(err) 호출 _이전_ 에 set. 이후의 inner 'data'/'end'/'error' 콜백은
   * 본 플래그를 보고 추가 push(row) 를 막아 push-after-EOF 차단.
   */
  private _endScheduled = false;
  private client: any;

  constructor(
    private readonly inner: NodeJS.ReadableStream,
    client: any
  ) {
    super({ objectMode: true });
    this.client = client;

    inner.on("data", (row: Record<string, unknown>) => {
      // D-EX9: data 핸들러도 _endScheduled 가드 필요. push(null) 이후의
      // 잔여 row 가 push 되면 ERR_STREAM_PUSH_AFTER_EOF.
      if (this.destroyed || this._endScheduled) return;
      this._rowsEmitted++;
      const ok = this.push(row);
      if (!ok) {
        // backpressure - pg-query-stream 의 native pause 호출
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
    // backpressure 해제 - pause 했던 stream 을 다시 흐르게
    if (typeof (this.inner as any).resume === "function") {
      (this.inner as any).resume();
    }
  }

  /**
   * Readable lifecycle 의 단일 cleanup 진입점. 정상 종료 / abort / error 세
   * 경로 모두 본 메서드를 통과.
   *
   * pg 자원 정리 순서 (D-EX10 async IIFE + 중첩 try/catch + outer finally):
   *   1. inner stream (pg-query-stream) destroy - network flow 즉시 차단
   *   2. client.query("ROLLBACK") - 트랜잭션 명시 종료. 실패해도 connection
   *      종료 시 server-side 가 implicit rollback (PG 표준)
   *   3. client.end() - PG client connection 종료
   *   4. outer finally 가 callback(err) 1회 보장 - logger.warn 자체 throw
   *      등 secondary 에러로 client.end 가 skip 되지 않도록.
   */
  _destroy(
    err: Error | null,
    callback: (e: Error | null) => void
  ): void {
    const clientRef = this.client;
    this.client = null;
    if (!clientRef) {
      callback(err);
      return;
    }
    try {
      if (typeof (this.inner as any).destroy === "function") {
        (this.inner as any).destroy();
      }
    } catch (destroyErr) {
      // Phase E Finding 5 (Critical) 대응: sync prelude 의 logger.warn 도
      // try/catch 로 wrap. 그렇지 않으면 _destroy 가 callback 미호출 상태로
      // throw 종료 → 'close' 미발화 → stream hang.
      try {
        logger.warn(
          "[PostgresStreamAdapter] inner stream destroy 실패:",
          destroyErr
        );
      } catch {
        /* swallow */
      }
    }
    // D-EX10: promise chain (.catch.then.catch.finally) 은 .catch 핸들러
    // 내부의 logger.warn 이 throw 시 후속 .then 의 client.end 가 skip 되어
    // connection leak. async IIFE 안에 중첩 try/catch 로 각 단계 독립 실행 +
    // outer finally 가 callback 1회 보장. Phase E Finding 4 추가 보강:
    // 각 catch 의 logger.warn 도 자체 try/catch (unhandled rejection 회피).
    (async () => {
      try {
        try {
          await clientRef.query("ROLLBACK");
        } catch (rollbackErr) {
          try {
            logger.warn(
              "[PostgresStreamAdapter] ROLLBACK 실패 (idempotent):",
              rollbackErr
            );
          } catch {
            /* swallow */
          }
        }
        try {
          await clientRef.end();
        } catch (endErr) {
          try {
            logger.warn(
              "[PostgresStreamAdapter] client.end 실패:",
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
   * → 'end' → destroy 패턴의 wrapper. inner stream 의 destroy 는 close 즉시
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
        // network flow 즉시 차단 - cursor 가 server-side 에서 계속 fetch 하는
        // 것을 막기 위해 inner destroy 우선. inner 의 'end'/'error' 콜백은
        // _endScheduled 가드로 차단되어 추가 push 없음.
        try {
          if (typeof (this.inner as any).destroy === "function") {
            (this.inner as any).destroy();
          }
        } catch (innerDestroyErr) {
          // Phase E Finding 5: close() 의 sync prelude 도 _destroy 와 동일하게
          // logger.warn 의 secondary throw 로부터 보호.
          try {
            logger.warn(
              "[PostgresStreamAdapter] close inner destroy 실패:",
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
