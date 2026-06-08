/**
 * SQL 실행을 위한 Repository
 * DynamicRepository 패턴을 사용하여 선택된 데이터베이스에서 쿼리 실행
 */

import { DatabaseClient, DatabaseConfig } from "@orkis/core/database";
import { Dao, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";

export interface QueryExecutionResult {
  success: boolean;
  columns?: string[];
  data?: Record<string, any>[];
  error?: string;
  executionTime?: number;
  affectedRows?: number;
}

@Dao("SqlExecutionRepository")
export class SqlExecutionRepository {
  @InjectConnection("dynamic", { dynamic: true })
  dynamicConn!: DatabaseClient;

  /**
   * 선택된 데이터베이스에서 SQL 쿼리 실행
   * @param sqlQuery 실행할 SQL 쿼리
   * @param dbConfig DatabaseConfig (동적 DB 연결을 위해 필수)
   * @returns QueryExecutionResult
   */
  async executeQuery(
    sqlQuery: string,
    dbConfig?: DatabaseConfig
  ): Promise<QueryExecutionResult> {
    const startTime = Date.now();

    try {
      // DatabaseConfig가 제공되면 동적 DB 연결 설정
      // if (dbConfig) {
      //   logger.info(`[SqlExecutionRepository] 동적 DB 연결 설정:`, {
      //     databaseType: dbConfig.databaseType,
      //     databaseName: dbConfig.databaseName
      //   });

      //   // prepareDynamicDBConnection 호출 (Repository에서 직접 호출)
      //   await (this as any).prepareDynamicDBConnection(dbConfig);

      //   logger.info(`[SqlExecutionRepository] prepareDynamicDBConnection 완료`);
      // }

      // SQL 쿼리 실행 (LIMIT은 클라이언트 측에서 처리)
      const result = await this.dynamicConn.query(sqlQuery);
      const executionTime = Date.now() - startTime;

      // 결과 파싱
      if (result === null || result === undefined) {        return {
          success: true,
          columns: [],
          data: [],
          executionTime,
          affectedRows: 0
        };
      }

      // SQLiteAdapter 결과 형식: { rows: any[], rowCount: number, lastInsertRowid?: number }
      if (result && typeof result === "object" && "rows" in result) {
        const { rows, rowCount } = result;

        // rows가 배열이고 데이터가 있는 경우
        if (Array.isArray(rows) && rows.length > 0) {
          const dataRows = rows as Record<string, any>[];
          const columns = Object.keys(dataRows[0]);

          return {
            success: true,
            columns,
            data: dataRows,
            executionTime,
            affectedRows: rowCount || dataRows.length
          };
        }

        // rows가 빈 배열인 경우 (조회 결과 0건)

        return {
          success: true,
          columns: [],
          data: [],
          executionTime,
          affectedRows: rowCount || 0
        };
      }

      // 레거시: 직접 배열로 반환하는 경우 (하위 호환성)
      if (Array.isArray(result)) {
        const dataRows = result as Record<string, any>[];
        const columns = dataRows.length > 0 ? Object.keys(dataRows[0]) : [];        return {
          success: true,
          columns,
          data: dataRows,
          executionTime,
          affectedRows: dataRows.length
        };
      }

      // 예상치 못한 결과 형식      return {
        success: true,
        columns: [],
        data: [],
        executionTime,
        affectedRows: 0
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "알 수 없는 오류";

      logger.error(`[SqlExecutionRepository] 쿼리 실행 실패:`, {
        error: errorMessage,
        query: sqlQuery.substring(0, 100),
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
   * 쿼리 결과를 CSV 형식으로 변환
   */
  convertToCSV(columns: string[], data: Record<string, any>[]): string {
    if (!columns || columns.length === 0 || !data || data.length === 0) {
      return "";
    }

    // CSV 헤더
    const header = columns.join(",");

    // CSV 데이터 행
    const rows = data.map((row) => {
      return columns
        .map((col) => {
          const value = row[col];
          // 문자열에 쉼표나 따옴표가 있으면 따옴표로 감싸기
          if (
            typeof value === "string" &&
            (value.includes(",") || value.includes('"'))
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value !== null && value !== undefined ? value : "";
        })
        .join(",");
    });

    return [header, ...rows].join("\n");
  }

  /**
   * 쿼리 결과를 JSON 형식으로 변환
   */
  convertToJSON(columns: string[], data: Record<string, any>[]): string {
    if (!columns || columns.length === 0 || !data || data.length === 0) {
      return "[]";
    }

    return JSON.stringify(data, null, 2);
  }
}
