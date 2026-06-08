/**
 * Phase 1 PR#5b - SQLite (sqlite3) 기반 row streaming adapter.
 *
 * 기존 QueryExportService 의 db.each 흐름을 Readable wrap 으로 변환.
 * 행위 동일성 보장 - character baseline 8 시나리오가 그대로 통과해야 한다.
 *
 * Phase 후속 (옵션 C, docs/2026-06-04/export-adapter-destroy-refactor-plan.md):
 *   - close() 가 streaming 중 호출돼도 for-await 가 hang 하지 않도록 _destroy
 *     표준 패턴 도입. 정상 종료 / abort / error 세 경로 모두 _destroy 로 수렴.
 *   - DB 핸들 정리는 _destroy 단일 책임 (cleanupDb 제거).
 *   - 모든 가드는 this.destroyed 로 일원화 (_closed 필드 제거).
 *   - 관련 결정: D-EX5 (cleanup SSOT) / D-EX8 (complete callback destroyed 가드)
 *     / D-EX11 (open-fail dbRef.close sync throw 보강).
 *
 * 설계 노트:
 *   - sqlite3 의 db.each 는 외부에서 즉시 멈출 수 없다. push() 가 false 반환
 *     (backpressure) 시 internal queue 에 누적하고 _read() 호출 시 drain
 *     (계획 D19). SQLite 는 in-process 라 누적 메모리 손해는 제한적.
 *   - sqlite3 require 는 클래스 외부에 두지 않고 메서드 내부 lazy load -
 *     core 우회 (D22) 의 의도를 유지하되 cold path 영향 최소화는 미세 최적화 X.
 */
import { Readable } from "stream";
import logger from "@orkis/core/utils";
import {
  IDbStreamAdapter,
  OpenStreamInput,
  RowStream
} from "./IDbStreamAdapter";

export class SqliteStreamAdapter implements IDbStreamAdapter {
  readonly typeName = "SQLite";

  constructor(private readonly filePath: string) {}

  async validateSyntax(sql: string): Promise<void> {
    // 기존 QueryExportService.validateSqlSyntax 로직을 그대로 이전.
    // db.prepare 시도 후 즉시 finalize. 방어적 처리 (stmt falsy / finalize 부재)
    // 모두 유지.
    const sqlite3 = require("sqlite3").verbose();
    return new Promise<void>((resolve, reject) => {
      const db = new sqlite3.Database(
        this.filePath,
        sqlite3.OPEN_READONLY,
        (openErr: any) => {
          if (openErr) {
            reject(new Error(`DB 파일을 열 수 없습니다: ${openErr.message}`));
            return;
          }
          const stmt = db.prepare(sql, (prepareErr: any) => {
            const finishClose = () => {
              db.close(() => {
                if (prepareErr) {
                  reject(new Error(`SQL 문법 오류: ${prepareErr.message}`));
                  return;
                }
                resolve();
              });
            };
            if (stmt && typeof stmt.finalize === "function") {
              stmt.finalize(finishClose);
            } else {
              finishClose();
            }
          });
        }
      );
    });
  }

  async openRowStream(input: OpenStreamInput): Promise<RowStream> {
    // SqliteRowStream constructor 는 동기적으로 호출되지만 내부에서 db open 은
    // 비동기. stream 자체는 즉시 반환되고 row 는 비동기 발화.
    return new SqliteRowStream(this.filePath, input.sql);
  }
}

class SqliteRowStream extends Readable implements RowStream {
  private buffer: Record<string, unknown>[] = [];
  private completed = false;
  private completeErr: Error | null = null;
  private db: any | null = null;
  private _rowsEmitted = 0;
  /**
   * "stream 종료가 시작됨" 단일 상태 플래그. push(null) 호출 _이전_ 에 set
   * 되며 drainBuffer terminal 분기 / close() 의 abort 경로 모두 본 플래그를
   * 통과. 이후의 row / complete / open callback 은 모두 본 플래그를 보고 추가
   * push(row) 를 막아 push-after-EOF (ERR_STREAM_PUSH_AFTER_EOF) 차단.
   */
  private _endScheduled = false;

  constructor(filePath: string, sql: string) {
    super({ objectMode: true });

    const sqlite3 = require("sqlite3").verbose();
    this.db = new sqlite3.Database(
      filePath,
      sqlite3.OPEN_READONLY,
      (openErr: any) => {
        if (openErr) {
          // db open 실패 - drainBuffer terminal 분기가 destroy(completeErr)
          // 호출 → _destroy 가 dbRef cleanup. completeErr/completed 설정 후
          // drainBuffer 진입까지 sync 수행이라 추가 가드 불필요.
          this.completeErr = new Error(
            `DB 파일을 열 수 없습니다: ${openErr.message}`
          );
          this.completed = true;
          this.drainBuffer();
          return;
        }
        if (this.destroyed || this._endScheduled) {
          // open 전에 close() / destroy() 가 호출된 경우. _endScheduled 가 set
          // 되어 있으면 push(null) 이 이미 예약 / 발화된 상태 → startQuery 가
          // 새 row 를 push 하면 ERR_STREAM_PUSH_AFTER_EOF. dbRef cleanup 은
          // close() 의 once('end') 핸들러 또는 _destroy 가 담당.
          return;
        }
        this.startQuery(sql);
      }
    );
  }

  get rowsEmitted(): number {
    return this._rowsEmitted;
  }

  private startQuery(sql: string): void {
    if (!this.db || this.destroyed || this._endScheduled) return;
    this.db.each(
      sql,
      [],
      (rowErr: any, row: any) => {
        // _endScheduled 는 push(null) 발화 의미 → 추가 push(row) 금지.
        if (this.destroyed || this._endScheduled) return;
        if (rowErr) {
          // 개별 row 에러는 sqlite3 가 통상 complete callback 에서 보고. 무시.
          return;
        }
        this.buffer.push(row);
        this.drainBuffer();
      },
      (completeErr: any) => {
        // D-EX8: destroy 진행 중 또는 abort 경로 진입 후의 complete 콜백은
        // 무시. completeErr/completed mutate 후 drainBuffer 의 가드가 잡지만,
        // 코드 명료성 + 잠재적 race 차단 목적으로 진입 시점 가드.
        if (this.destroyed || this._endScheduled) return;
        if (completeErr) {
          this.completeErr = completeErr;
        }
        this.completed = true;
        this.drainBuffer();
      }
    );
  }

  _read(_size: number): void {
    this.drainBuffer();
  }

  /**
   * buffer 의 row 를 push. push false (backpressure) 시 다음 _read 호출 대기.
   * complete 상태이고 buffer 가 비었으면 push(null) (정상) 또는 destroy(err) (에러).
   *
   * D-EX5: cleanupDb 호출 제거 - DB 핸들 정리는 _destroy 가 단일 책임.
   * 정상 종료(no err) 는 push(null) 후 process.nextTick 으로 destroy 트리거.
   * 에러 종료 는 destroy(err) 가 _destroy 트리거. nextTick 중복 예약은
   * _endScheduled 가드 + Node Readable destroy idempotency 가 무해 보장.
   */
  private drainBuffer(): void {
    if (this.destroyed) return;
    while (this.buffer.length > 0) {
      const row = this.buffer.shift()!;
      this._rowsEmitted++;
      const ok = this.push(row);
      if (!ok) return; // backpressure - 다음 _read 호출 대기
    }
    if (this.completed && !this._endScheduled) {
      this._endScheduled = true;
      if (this.completeErr) {
        // 에러 종료 - for-await throws. _destroy 가 cleanup.
        this.destroy(this.completeErr);
      } else {
        // 정상 종료 - push(null) 후 'end' 이벤트가 발화된 뒤 destroy 트리거.
        // process.nextTick 로 직접 destroy 호출 시 endReadableNT 보다 먼저
        // 'close' 가 발화되어 for-await 가 "Premature close" 로 throw 하는
        // race 가 있음 (Node Readable 의 endOfStream 내부 처리). 'end' 핸들러
        // 안에서 destroy 호출하면 endEmitted=true 가 보장되어 안전.
        this.push(null);
        this.once("end", () => this.destroy());
      }
    }
  }

  /**
   * Readable lifecycle 의 단일 cleanup 진입점. close() / destroy(err) /
   * 정상 종료 후 nextTick destroy 세 경로 모두 본 메서드를 통과.
   *
   * sqlite3 자원 정리:
   *   1. interrupt 시도 (db open 완료 전이면 throw 가능 - try/catch swallow)
   *   2. dbRef.close 호출. open 완료 전 호출이면 sqlite3 가 queue → open 완료
   *      후 close 실행. D-EX11: open-fail 객체에 대한 close 가 sync throw
   *      가능 → outer try/catch 로 callback 1회 보장.
   *
   * callback 은 호출자가 넘긴 err 를 그대로 전달. cleanup 중 secondary 에러는
   * 로그만 남기고 swallow (원본 err 보존). callback 은 반드시 정확히 1회만 호출.
   */
  _destroy(
    err: Error | null,
    callback: (e: Error | null) => void
  ): void {
    const dbRef = this.db;
    this.db = null;
    if (!dbRef) {
      callback(err);
      return;
    }
    try {
      if (typeof dbRef.interrupt === "function") {
        dbRef.interrupt();
      }
    } catch (interruptErr) {
      // logger.warn 자체가 throw 하면 _destroy 가 callback 미호출 상태로 종료
      // → 'close' 미발화 → stream hang (본 PR 의 fix 무력화). Phase E review
      // Finding 5 (Critical) 대응으로 inner try/catch 보강.
      try {
        logger.warn(
          "[SqliteStreamAdapter] interrupt 실패:",
          interruptErr
        );
      } catch {
        /* logger transport 장애 등 - silent swallow */
      }
    }
    try {
      dbRef.close((closeErr: any) => {
        if (closeErr) {
          try {
            logger.warn(
              "[SqliteStreamAdapter] db.close 실패:",
              closeErr
            );
          } catch {
            /* swallow */
          }
        }
        callback(err);
      });
    } catch (closeSyncErr) {
      // D-EX11: open-fail 객체의 dbRef.close 가 sync throw 가능. callback
      // 1회 보장을 위해 outer try/catch 로 swallow + cb 직접 호출.
      try {
        logger.warn(
          "[SqliteStreamAdapter] db.close sync throw:",
          closeSyncErr
        );
      } catch {
        /* swallow */
      }
      callback(err);
    }
  }

  /**
   * IDbStreamAdapter.RowStream contract. 옵션 C 도입 후 본 메서드는 stream
   * 종료를 시작하고 'close' 이벤트를 기다리는 wrapper.
   *
   * 핵심: destroy() 직접 호출 대신 push(null) → 'end' → destroy 패턴 사용.
   * 직접 destroy 는 for-await 의 endOfStream 헬퍼가 'close' 를 'end' 전에
   * 감지하여 "Premature close" throw 하는 race 가 있음.
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
        // drainBuffer 가 아직 종료 분기에 진입하지 않은 상태 (abort 경로).
        // push(null) 로 iterator 정상 종료 + 'end' 에서 destroy 트리거.
        // 이후 row/complete/open 콜백은 _endScheduled 가드로 차단되어
        // push-after-EOF 방지.
        this._endScheduled = true;
        this.push(null);
        this.once("end", () => this.destroy());
      }
      // _endScheduled 가 이미 true 인 경우: drainBuffer 가 종료를 예약함.
      // drainBuffer 의 once('end') 가 destroy 를 트리거할 것이므로 본 close 는
      // 'close' 만 대기.
    });
  }
}
