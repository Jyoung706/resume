/**
 * QueryExportService - Pro 모드 "전체 데이터 다운로드" 의 orchestrator.
 *
 * Phase 1 PR#5b 이후 (2026-06-01):
 *   - DB resolution / driver streaming 은 QueryExportAdapterFactory + IDbStreamAdapter 로 위임
 *   - 인코딩은 IRowEncoder (CsvEncoder / JsonEncoder) 로 위임
 *   - 본 service 는 HTTP streaming orchestration (헤더 / preamble / abort / finalize) 만 담당
 *
 * 행위 보존 (character baseline 으로 검증):
 *   - format-specific 헤더 + preamble (CSV: UTF-8 BOM / JSON: `[\n`)
 *   - row 단위 streaming
 *   - 정상 종료 시 encoder.finalize 출력 + res.end
 *   - 스트리밍 중 에러 시 headersSent 분기: 미전송 → throw / 전송 → res.end + swallow
 *   - abort 시 res.end 미호출 (기존 동작 보존)
 *
 * 참조: docs/2026-06-01/bulk-download-streaming-plan.md (§9, D22)
 */
import { Autowired, Service } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import type { Request, Response } from "express";
import { CsvEncoder } from "./encoders/CsvEncoder";
import { JsonEncoder } from "./encoders/JsonEncoder";
import { IRowEncoder } from "./encoders/IRowEncoder";
import { QueryExportAdapterFactory } from "./adapters/QueryExportAdapterFactory";
import { IDbStreamAdapter, RowStream } from "./adapters/IDbStreamAdapter";

export type ExportFormat = "csv" | "json";

export interface ResolveDbInput {
  dbId?: string;
  connectionId?: number;
  userId: string;
}

export interface ValidateSqlForExportInput extends ResolveDbInput {
  sqlQuery: string;
}

export interface ExportQueryInput {
  sqlQuery: string;
  dbId?: string;
  connectionId?: number;
  format: ExportFormat;
  userId: string;
  req: Request;
  res: Response;
}

/**
 * fetch batch size 의 기본값. EXPORT_FETCH_BATCH 환경변수로 override 가능 (D8).
 *
 * driver 별 의미:
 *   - SQLite: in-process 라 사실상 무의미 (SqliteStreamAdapter 가 사용 안 함)
 *   - PostgreSQL (Phase 3+): pg-query-stream 의 batchSize 매핑
 *   - MySQL/MariaDB (Phase 3+): mysql2 의 highWaterMark 매핑
 *   - Oracle (Phase 4): oracledb 의 fetchArraySize 매핑
 *
 * 5만건 임계 초과 시 _운영_ 측에서 1000 등으로 상향 권장 (계획 §6.3).
 */
const DEFAULT_FETCH_BATCH = 500;

function getFetchBatchSize(): number {
  const raw = process.env.EXPORT_FETCH_BATCH;
  if (!raw) return DEFAULT_FETCH_BATCH;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_FETCH_BATCH;
}

/**
 * heartbeat interval - JSON 포맷 streaming 중 주기적으로 whitespace 송신.
 *
 * 의도 (D13 / D16-c):
 *   거대 SELECT 의 _첫 row 가 도착하기 전_ idle 구간에서도 nginx idle counter 가
 *   리셋되도록 newline (`\n`) 만 push. JSON parser 는 array element 사이의
 *   whitespace 를 무시하므로 안전.
 *
 * CSV 미적용:
 *   CSV 는 line 단위 의미 - 임의 newline 이 _빈 row_ 로 해석될 위험. 본 보호는
 *   PR#4 의 backend flushHeaders (D16-b) + nginx 30분 timeout (D16-a) 으로 충분.
 *
 * EXPORT_HEARTBEAT_MS 환경변수로 운영 조정 가능. 기본 60초.
 */
const DEFAULT_HEARTBEAT_INTERVAL_MS = 60_000;

function getHeartbeatIntervalMs(): number {
  const raw = process.env.EXPORT_HEARTBEAT_MS;
  if (!raw) return DEFAULT_HEARTBEAT_INTERVAL_MS;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_HEARTBEAT_INTERVAL_MS;
}

@Service("QueryExportService")
export class QueryExportService {
  @Autowired("QueryExportAdapterFactory")
  private adapterFactory!: QueryExportAdapterFactory;

  /**
   * adapter 인스턴스 해석 - controller 가 직접 사용할 일은 없으나
   * character test 및 향후 확장을 위해 노출.
   */
  async resolveAdapter(opts: ResolveDbInput): Promise<IDbStreamAdapter> {
    return this.adapterFactory.resolve(opts);
  }

  /**
   * 사전 SQL 검증 - controller 의 /query/validate-for-export 에서 사용.
   * adapter.validateSyntax 위임. 문법 오류만 throw.
   */
  async validateSqlForExport(input: ValidateSqlForExportInput): Promise<void> {
    const adapter = await this.adapterFactory.resolve({
      connectionId: input.connectionId,
      dbId: input.dbId,
      userId: input.userId
    });
    await adapter.validateSyntax(input.sqlQuery);
  }

  /**
   * 전체 쿼리 결과를 streaming 으로 export.
   *   - adapter.openRowStream 으로 row stream 획득
   *   - encoder.preamble / encodeRow / finalize 로 byte 인코딩
   *   - req close 시 rowStream.close() 로 driver 자원 해제 (D14)
   *
   * 응답 timeout 은 controller 의 res.setTimeout 으로 설정 (본 메서드 외부).
   */
  async exportQuery(input: ExportQueryInput): Promise<void> {
    const { sqlQuery, dbId, connectionId, format, userId, req, res } = input;

    // 1. Adapter 해석 - 실패 시 throw → controller 가 4xx/5xx JSON 응답.
    const adapter = await this.adapterFactory.resolve({
      dbId,
      connectionId,
      userId
    });

    const encoder: IRowEncoder =
      format === "csv" ? new CsvEncoder() : new JsonEncoder();

    let rowStream: RowStream | null = null;
    let aborted = false;

    // 2. req close 핸들러를 가장 먼저 등록 - openRowStream 이전·이후 abort 모두 대응.
    req.on("close", () => {
      if (res.writableEnded) return;
      aborted = true;
      if (rowStream) {
        rowStream.close().catch((cleanupErr) => {
          logger.warn(
            "[QueryExportService] abort cleanup 실패:",
            cleanupErr
          );
        });
      }
      logger.info(
        `[QueryExportService] 클라이언트가 export 중단 (userId=${userId})`
      );
    });

    // 3. 헤더 + preamble - streaming 시작 (res.write 가 headersSent 를 true 로 전환).
    res.setHeader("Content-Type", encoder.contentType);
    // D16-b: 응답 헤더 즉시 송신. 첫 row 가 도착하기 전이라도 nginx idle counter 가
    // 리셋되어 5분 read timeout 을 회피. flushHeaders 는 Node 12+ 표준이지만
    // 일부 mock/proxy 환경 호환을 위해 typeof 가드.
    if (typeof (res as any).flushHeaders === "function") {
      (res as any).flushHeaders();
    }
    res.write(encoder.preamble());

    // D13/D16-c: JSON 포맷 한정 heartbeat - 첫 row lag 동안 nginx idle 회피.
    // setInterval 의 callback 은 macrotask 라 row write (동기) 중간에 끼어들지
    // 않음. JSON parser 는 array element 사이 whitespace 를 무시 - 안전.
    let heartbeatTimer: NodeJS.Timeout | null = null;
    if (format === "json") {
      heartbeatTimer = setInterval(() => {
        if (res.writableEnded || aborted) return;
        try {
          res.write("\n");
        } catch (heartbeatErr) {
          logger.warn(
            "[QueryExportService] heartbeat write 실패:",
            heartbeatErr
          );
        }
      }, getHeartbeatIntervalMs());
      if (typeof heartbeatTimer.unref === "function") {
        heartbeatTimer.unref();
      }
    }

    try {
      rowStream = await adapter.openRowStream({
        sql: sqlQuery,
        fetchBatchSize: getFetchBatchSize()
      });

      let isFirstRow = true;
      let columns: string[] = [];

      for await (const row of rowStream as AsyncIterable<
        Record<string, unknown>
      >) {
        if (aborted || res.writableEnded) break;
        if (isFirstRow) {
          columns = Object.keys(row);
        }
        res.write(encoder.encodeRow(row, isFirstRow, columns));
        isFirstRow = false;
      }

      if (aborted) {
        // 기존 행위 보존 - abort 시 res.end 미호출. req close 핸들러가 stream 정리만.
        return;
      }

      // 정상 완료 - finalize (CSV: "" / JSON: "\n]\n") 후 종료.
      res.write(encoder.finalize({ aborted: false }));
      if (!res.writableEnded) res.end();
    } catch (streamErr: any) {
      logger.error(
        "[QueryExportService] streaming 중 쿼리 실행 실패:",
        streamErr
      );
      if (!res.headersSent) {
        // 헤더 미전송 - controller 가 4xx/5xx JSON 응답을 만들도록 throw.
        throw streamErr;
      }
      // 헤더 이미 전송 - connection 종료. partial 본문이 클라에 도달 (기존 동작).
      if (!res.writableEnded) res.end();
    } finally {
      // heartbeat 정리 (JSON 포맷에서만 활성)
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
      }
      // abort 케이스는 req close 핸들러가 이미 close 호출. 중복 호출은 idempotent.
      if (rowStream) {
        await rowStream.close().catch((closeErr) => {
          logger.warn(
            "[QueryExportService] finally cleanup 실패:",
            closeErr
          );
        });
      }
    }
  }
}
