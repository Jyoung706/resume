import { Autowired, Service } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import path from "path";
import fs from "fs";
import { DbConnectionDao } from "@/db-connection/DbConnectionDao";
import { DbTypeDao } from "@/db-connection/DbTypeDao";
import { SqlExecutionService } from "../database/SqlExecutionService";
import { QueryExecutionTracker } from "./QueryExecutionTracker";

export interface QueryResult {
  columns: string[];
  data: Array<Record<string, any>>;
  queryTitle: string;
  querySubtitle?: string;
  executionTime?: number;
  affectedRows?: number;
}

@Service("QueryExecutionService")
export class QueryExecutionService {
  @Autowired("DbConnectionDao")
  private dbConnectionDao!: DbConnectionDao;

  @Autowired("DbTypeDao")
  private dbTypeDao!: DbTypeDao;

  @Autowired("SqlExecutionService")
  private sqlExecutionService!: SqlExecutionService;

  // Phase 1 PR#3 (D20) - cancel 인프라는 QueryExecutionTracker 로 추출.
  // execution path 와 export path 가 동일 트래커를 공유 가능 (export 통합은 후속 PR).
  @Autowired("QueryExecutionTracker")
  private tracker!: QueryExecutionTracker;

  /**
   * 진행 중인 쿼리 cancel - QueryExecutionTracker.cancel 로 위임.
   * controller backward-compat 을 위해 시그니처 유지.
   */
  cancelExecution(executionId: string, requesterUserId: string): boolean {
    return this.tracker.cancel(executionId, requesterUserId);
  }

  /**
   * 실제 DB에서 SQL 쿼리 실행
   * @param sqlQuery SQL 쿼리 문
   * @param dbId DB 경로 (share/sqlite 이후의 상대 경로)
   * @param connectionId DB 연결 ID
   * @param limit 조회 제한 (기본값: 1000, null/undefined: 제한 없음)
   * @param userId 사용자 ID (세션에서 추출)
   */
  async executeRealQuery(
    sqlQuery: string,
    dbId?: string,
    connectionId?: number,
    limit?: number | null,
    userId?: string,
    executionId?: string
  ): Promise<QueryResult> {
    // limit이 명시적으로 제공되지 않으면 기본값 1000, null이면 제한 없음
    const effectiveLimit = limit === null ? 0 : (limit ?? 1000);
    const startTime = Date.now();

    // Feature Flag: ENABLE_QUERY_CANCEL=false 시 activeExecutions 등록 자체 스킵.
    // executionId 가 있어도 cancel 추적 비활성화 — 기존 동작과 동일하게 진행.
    const cancelEnabled = process.env.ENABLE_QUERY_CANCEL !== "false";

    // executionId 가 있고 Feature Flag on 이고 userId(ownership 검증용) 가 있을 때만
    // cancel 추적 활성화.
    const trackedExecutionId =
      cancelEnabled && executionId && userId ? executionId : undefined;

    // duplicate-ID reject - 악의적 ID 재사용/추측 방어 (preventive check, db open 이전).
    // tracker.register 에도 동일 가드가 있으나 본 위치는 빠른 reject 용.
    if (trackedExecutionId && this.tracker.has(trackedExecutionId)) {
      logger.warn(
        `[METRIC] query_cancel_total result=duplicate executionId=${trackedExecutionId}`
      );
      throw new Error(`duplicate executionId: ${trackedExecutionId}`);
    }

    try {
      // connectionId가 있으면 DB 연결 정보 조회
      if (connectionId) {
        if (!userId) {
          throw new Error("사용자 인증 정보가 없습니다.");
        }
        // connectionId와 userId로 DB 연결 정보 조회
        const connection = await this.dbConnectionDao.findById(
          connectionId,
          userId
        );

        if (!connection) {
          throw new Error(
            `DB 연결 정보를 찾을 수 없습니다. (connectionId: ${connectionId}, userId: ${userId})`
          );
        }

        const dbType = await this.dbTypeDao.findById(connection.dbTypeId);

        if (!dbType) {
          throw new Error("DB 타입 정보를 찾을 수 없습니다.");
        }

        if (dbType.typeName === "SQLite") {
          return await this.executeSQLiteQuery(
            connection.filePath!,
            sqlQuery,
            effectiveLimit,
            startTime,
            trackedExecutionId,
            userId
          );
        }

        // 비-SQLite 분기 — SqlExecutionService 에 위임 (Stage 3.5-A 의 buildDatabaseConfig 재사용)
        // cancel 인프라는 SQLite 에만 적용 — core 어댑터 cancel 은 별도 설계 (Stage 5)
        const limitedSql = this.applyLimitIfNeeded(sqlQuery, effectiveLimit);
        const result = await this.sqlExecutionService.executeSqlQuery(
          limitedSql,
          String(connection.connectionId),
          userId
        );
        if (!result.success) {
          throw new Error(
            result.error || `${dbType.typeName} 쿼리 실행 실패`
          );
        }
        return {
          columns: result.columns ?? [],
          data: result.data ?? [],
          queryTitle: "SQL 실행 결과",
          querySubtitle: `${dbType.typeName} · ${result.affectedRows ?? 0} rows`,
          executionTime: result.executionTime,
          affectedRows: result.affectedRows
        };
      }

      // dbId로 파일 경로 구성
      if (dbId) {
        const filePath = await this.resolveDbPath(dbId);
        return await this.executeSQLiteQuery(
          filePath,
          sqlQuery,
          effectiveLimit,
          startTime,
          trackedExecutionId,
          userId
        );
      }

      throw new Error("connectionId 또는 dbId가 필요합니다.");
    } catch (error: any) {
      logger.error("[QueryExecutionService] 쿼리 실행 오류:", error);
      throw error;
    }
  }

  /**
   * dbId로부터 실제 파일 경로 해석
   * @param dbId share/sqlite 이후의 상대 경로 (예: "user123/california_schools")
   */
  private async resolveDbPath(dbId: string): Promise<string> {
    const baseDir = path.join(process.cwd(), "share", "sqlite");
    const dbFolder = path.join(baseDir, dbId);
    if (!fs.existsSync(dbFolder)) {
      throw new Error(`DB 폴더를 찾을 수 없습니다: ${dbFolder}`);
    }

    // .sqlite, .sqlite3, .db 파일 찾기
    const possibleFiles = [
      path.join(dbFolder, `${path.basename(dbId)}.sqlite`),
      path.join(dbFolder, `${path.basename(dbId)}.sqlite3`),
      path.join(dbFolder, `${path.basename(dbId)}.db`)
    ];

    for (const file of possibleFiles) {
      if (fs.existsSync(file)) {
        return file;
      }
    }

    throw new Error(`DB 파일을 찾을 수 없습니다: ${dbFolder}`);
  }

  /**
   * SQLite 쿼리 실행
   *
   * @param executionId Phase 2 cancel 추적 ID. 있으면 activeExecutions 에 등록되며
   *   cancelExecution(id, userId) 호출 시 db.interrupt() 로 진행 중 쿼리 중단.
   *   미전달 시 기존 동작 그대로(추적 안 함).
   * @param userId ownership 검증용. executionId 와 함께만 의미 있음.
   */
  private async executeSQLiteQuery(
    filePath: string,
    sqlQuery: string,
    limit: number,
    startTime: number,
    executionId?: string,
    userId?: string
  ): Promise<QueryResult> {
    const sqlite3 = require("sqlite3").verbose();

    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(
        filePath,
        sqlite3.OPEN_READONLY,
        (err: any) => {
          if (err) {
            logger.error(
              `[QueryExecutionService] SQLite DB 열기 실패: ${filePath}`,
              err
            );
            reject(new Error(`DB 파일을 열 수 없습니다: ${err.message}`));
            return;
          }
        }
      );

      // 핸들 등록 - 호출자(executeRealQuery) 가 duplicate-ID 가드와 Feature
      // Flag/ownership 조건을 충족한 케이스에서만 executionId 가 전달됨.
      if (executionId && userId) {
        this.tracker.register(executionId, userId, db);
      }

      // LIMIT 처리: 서브쿼리 래핑 방식 (추후 개선 예정)
      let finalQuery = sqlQuery.trim();

      // 끝의 세미콜론 제거
      if (finalQuery.endsWith(";")) {
        finalQuery = finalQuery.slice(0, -1).trim();
      }

      const queryLower = finalQuery.toLowerCase();
      const isSelectQuery = queryLower.startsWith("select");
      const hasLimit = queryLower.includes(" limit ");

      // SELECT 쿼리이고 LIMIT이 없는 경우에만 서브쿼리 래핑
      // 끝 라인 주석(--)이 닫는 괄호와 LIMIT 절을 주석 처리해 SQLITE_ERROR: incomplete input
      // 을 일으키는 결함을 막기 위해 닫는 괄호 앞·뒤에 개행을 강제로 넣는다.
      if (isSelectQuery && !hasLimit && limit > 0) {
        finalQuery = `SELECT * FROM (\n${finalQuery}\n) LIMIT ${limit}`;
      }

      db.all(finalQuery, [], (err: any, rows: any[]) => {
        const executionTime = Date.now() - startTime;

        // 핸들 정리 - cancelExecution 이 이미 delete 했어도 idempotent.
        if (executionId) {
          this.tracker.unregister(executionId);
        }

        db.close((closeErr: any) => {
          if (closeErr) {
            logger.error(`[QueryExecutionService] DB 닫기 실패:`, closeErr);
          }
        });

        if (err) {
          // SQLITE_INTERRUPT 감지 — node-sqlite3 5.x 는 err.code 에 문자열
          // "SQLITE_INTERRUPT", err.errno 에 9 를 둘 다 설정. 버전 변동에 강건하게
          // 양쪽 체크.
          const isInterrupted =
            err.code === "SQLITE_INTERRUPT" || err.errno === 9;
          if (isInterrupted) {
            // 정상 cancel — 일반 500 으로 로깅하지 않음(노이즈 차단).
            logger.info(
              `[METRIC] query_cancel_total result=interrupted executionId=${executionId ?? "n/a"}`
            );
            reject(new Error("CANCELLED"));
            return;
          }
          logger.error(`[QueryExecutionService] 쿼리 실행 실패:`, err);
          reject(new Error(`쿼리 실행 실패: ${err.message}`));
          return;
        }

        // 컬럼 추출
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        resolve({
          columns,
          data: rows,
          queryTitle: "쿼리 실행 결과",
          querySubtitle: `${rows.length}건 조회`,
          executionTime,
          affectedRows: rows.length
        });
      });
    });
  }

  /**
   * SQL 쿼리 검증 (기본)
   */
  validateSqlQuery(sqlQuery: string): boolean {
    if (!sqlQuery || sqlQuery.trim().length === 0) {
      throw new Error("SQL 쿼리가 비어있습니다.");
    }

    const lowerQuery = sqlQuery.toLowerCase().trim();

    // 기본 SQL 키워드 확인
    const validKeywords = ["select", "insert", "update", "delete", "count"];
    const hasValidKeyword = validKeywords.some((keyword) =>
      lowerQuery.startsWith(keyword)
    );

    if (!hasValidKeyword) {
      throw new Error("유효하지 않은 SQL 쿼리입니다.");
    }

    // 위험한 키워드 확인
    const dangerousKeywords = ["drop", "truncate", "alter"];
    const hasDangerousKeyword = dangerousKeywords.some((keyword) =>
      lowerQuery.includes(keyword)
    );

    if (hasDangerousKeyword) {
      throw new Error("위험한 SQL 명령어가 포함되어 있습니다.");
    }

    return true;
  }

  /**
   * 비-SQLite 분기에서 SELECT/CTE 쿼리에 LIMIT 자동 적용.
   *
   * 핵심 동작:
   *   - 이미 LIMIT 가 포함된 쿼리 (대소문자/공백 불문) 는 건드리지 않는다
   *   - SELECT 또는 WITH (CTE) 로 시작하는 read-only 쿼리만 래핑 대상
   *   - 그 외 (INSERT/UPDATE/DELETE/DDL) 는 그대로 통과
   *
   * MariaDB/MySQL 표준은 FROM 의 subquery 에 alias 가 필수이므로
   * `AS __orkis_limit__` 를 항상 부여 (SQLite/PostgreSQL 도 alias 허용 — 무영향).
   */
  private applyLimitIfNeeded(sql: string, limit: number): string {
    let finalQuery = sql.trim();
    if (finalQuery.endsWith(";")) {
      finalQuery = finalQuery.slice(0, -1).trim();
    }
    if (limit <= 0) return finalQuery;

    // SELECT 또는 WITH 로 시작 (대소문자 무관, 선두 공백 제거 완료)
    const isReadable = /^(select|with)\b/i.test(finalQuery);
    if (!isReadable) return finalQuery;

    // 이미 LIMIT 가 있는 경우 — 줄바꿈/탭/대소문자 무관. (단어 경계 \b 로 검사)
    if (/\blimit\b/i.test(finalQuery)) return finalQuery;

    // derived table 래핑 + alias (MariaDB/MySQL alias 필수 / SQLite·PG 호환)
    return `SELECT * FROM (\n${finalQuery}\n) AS __orkis_limit__ LIMIT ${limit}`;
  }
}
