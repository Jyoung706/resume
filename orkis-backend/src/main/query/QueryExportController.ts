/**
 * QueryExportController — Pro 모드 "전체 데이터 다운로드" 엔드포인트.
 *
 * 신규 라우트만 추가하며 기존 QueryExecutionController 와 분리되어 있다.
 * 기존 /query/execute 동작은 영향받지 않는다.
 *
 * 엔드포인트:
 *   - POST /query/export             — streaming export (CSV / JSON)
 *   - POST /query/validate-for-export — 사전 SQL 검증 (form submit 전)
 *
 * 응답 정책:
 *   - 검증·인증 실패 등 스트리밍 시작 전 에러: {success, error, timestamp} JSON
 *   - 스트리밍 시작 후 에러: connection close. 클라가 partial 인지 (best-effort)
 */
import {
  Autowired,
  Body,
  Controller,
  Req,
  REQUEST_METHOD,
  RequestMapping,
  Res,
  Session
} from "@orkis/core/common";
import logger from "@orkis/core/utils";
import type { Request, Response } from "express";
import { ExportFormat, QueryExportService } from "./QueryExportService";
import { isExportableQuery } from "./sqlValidation";

export interface ExportRequestBody {
  sqlQuery: string;
  dbId?: string;
  connectionId?: number;
  format: ExportFormat;
}

export interface ValidateForExportBody {
  sqlQuery: string;
  dbId?: string;
  connectionId?: number;
}

/** export 응답 timeout — 기본 30분, 환경변수로 조정 가능 */
const DEFAULT_EXPORT_TIMEOUT_MS = 1800000;

function getExportTimeoutMs(): number {
  const raw = process.env.EXPORT_TIMEOUT_MS;
  if (!raw) return DEFAULT_EXPORT_TIMEOUT_MS;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_EXPORT_TIMEOUT_MS;
}

function nowTimestamp(): string {
  return new Date().toISOString();
}

@Controller({ path: "/query" })
export class QueryExportController {
  @Autowired("QueryExportService")
  private queryExportService!: QueryExportService;

  /**
   * 사전 SQL 검증 — form submit 전 클라이언트가 호출.
   * 검증 실패 시 4xx JSON 응답 → 클라가 토스트 표시 + form submit 차단.
   *
   * 인증:
   *   - filteredType 미지정 → OrkisInterCeptor 가 세션·토큰 자동 검증.
   *   - 미인증은 인터셉터에서 OrkisError (401) 로 차단되어 본 메서드 도달 X.
   *   - session.login_info.ID 존재 보장 (session: any 타입이라 명시 string 단언).
   */
  @RequestMapping({
    route: "/validate-for-export",
    method: REQUEST_METHOD.POST
  })
  async validateForExport(
    @Body() body: ValidateForExportBody,
    @Session() session: any
  ): Promise<any> {
    const userId: string = session.login_info.ID;

    const { sqlQuery, dbId, connectionId } =
      body ?? ({} as ValidateForExportBody);

    if (!sqlQuery || sqlQuery.trim().length === 0) {
      return {
        success: false,
        error: "SQL 쿼리가 비어 있습니다.",
        timestamp: nowTimestamp()
      };
    }

    if (!isExportableQuery(sqlQuery)) {
      return {
        success: false,
        error: "SELECT 또는 WITH 로 시작하는 쿼리만 export 할 수 있습니다.",
        timestamp: nowTimestamp()
      };
    }

    try {
      // Phase 1 PR#5b: 사전 검증을 service 의 합성 메서드로 위임.
      // 내부적으로 adapter.validateSyntax 호출 (SQLite 의 경우 prepare → finalize).
      await this.queryExportService.validateSqlForExport({
        sqlQuery,
        dbId,
        connectionId,
        userId
      });
      return {
        success: true,
        data: { valid: true },
        timestamp: nowTimestamp()
      };
    } catch (err: any) {
      logger.warn("[QueryExportController] validateForExport 실패:", err);
      // SQL 문법 오류는 사용자가 수정 가능한 유용한 정보 → 노출.
      // 그 외 내부 에러 (DB 경로·DB 타입 등) 는 정보 누출 방지 위해 일반화.
      const userMessage =
        err instanceof Error &&
        typeof err.message === "string" &&
        err.message.startsWith("SQL 문법 오류")
          ? err.message
          : "쿼리 검증에 실패했습니다.";
      return {
        success: false,
        error: userMessage,
        timestamp: nowTimestamp()
      };
    }
  }

  /**
   * 전체 데이터 export — 클라이언트 form submit 으로 호출.
   * 응답은 attachment 파일 streaming. 사전 검증 실패 시에만 JSON 4xx.
   *
   * 인증:
   *   - filteredType 미지정 → OrkisInterCeptor 가 자동 세션·토큰 검증.
   *   - 미인증은 인터셉터에서 차단되어 본 메서드 도달 X.
   *   - session.login_info.ID 존재 보장 (session: any 타입이라 명시 string 단언).
   */
  @RequestMapping({
    route: "/export",
    method: REQUEST_METHOD.POST
  })
  async exportQuery(
    @Body() body: ExportRequestBody,
    @Session() session: any,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    const userId: string = session.login_info.ID;

    const { sqlQuery, dbId, connectionId, format } =
      body ?? ({} as ExportRequestBody);

    if (!sqlQuery || sqlQuery.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: "SQL 쿼리가 비어 있습니다.",
        timestamp: nowTimestamp()
      });
      return;
    }

    if (format !== "csv" && format !== "json") {
      res.status(400).json({
        success: false,
        error: "format 은 csv 또는 json 이어야 합니다.",
        timestamp: nowTimestamp()
      });
      return;
    }

    if (!isExportableQuery(sqlQuery)) {
      res.status(400).json({
        success: false,
        error: "SELECT 또는 WITH 로 시작하는 쿼리만 export 할 수 있습니다.",
        timestamp: nowTimestamp()
      });
      return;
    }

    // 응답 timeout (chunk 가 흐르는 동안에는 영향 없음. long-running 시작 전 보호)
    res.setTimeout(getExportTimeoutMs());

    // Content-Disposition 은 호출 측 (클라이언트) 파일명 정책 따름.
    // 클라가 form data 에 filename 보내지 않으므로 서버가 fallback.
    const filename =
      format === "csv"
        ? `sql_result_full_${Date.now()}.csv`
        : `sql_result_full_${Date.now()}.json`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    try {
      await this.queryExportService.exportQuery({
        sqlQuery,
        dbId,
        connectionId,
        format,
        userId,
        req,
        res
      });
    } catch (err: any) {
      logger.error("[QueryExportController] exportQuery 실패:", err);
      if (!res.headersSent) {
        // 스트리밍 전 에러 — SQL 문법 오류만 노출, 그 외는 일반화 (정보 누출 방지).
        const userMessage =
          err instanceof Error &&
          typeof err.message === "string" &&
          err.message.startsWith("SQL 문법 오류")
            ? err.message
            : "쿼리 export 처리 중 오류가 발생했습니다.";
        res.status(500).json({
          success: false,
          error: userMessage,
          timestamp: nowTimestamp()
        });
      } else {
        // 스트리밍 시작 후 에러 — connection 종료
        if (!res.writableEnded) {
          res.end();
        }
      }
    }
  }
}
