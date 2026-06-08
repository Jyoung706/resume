import { Service, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import type { PoolClient } from "pg";

/**
 * server_health 의 'rag' / 'llm' 두 row 를 동일한 ai_server_status 로 동시 갱신하는 입력.
 *
 * - aiServerStatus: AI 서버 alive 여부 (boolean). null 은 허용하지 않음 — 본 job 은 항상 측정 결과를 기록.
 * - lastError: 실패 진단 문자열 또는 null (성공 시 명시적 null 리셋)
 * - lastUpdatedAt: 호출 종료 시각 (jobs 가 명시 set, DB trigger 의 updated_at 과 의도적 분리)
 *
 * 참고:
 *   docs/2026-05-26/jobs-healthcheck-plan.md §3.4 (D3), §4.4, §5.2 (last_error 명시 리셋)
 *   apps/orkis-backend/src/db_schema/31_server_health.sql:55-56 (컬럼 의미)
 */
export interface UpdateBothRowsInput {
  aiServerStatus: boolean;
  lastError: string | null;
  lastUpdatedAt: Date;
}

/**
 * server_health 테이블의 sole writer.
 *
 * - D8 결정: backend Dao 표준 패턴 (`@InjectConnection("main")` 옵션 없음 → wrapped PoolClient)
 *   참고: apps/orkis-backend/src/main/db-connection/RagPreprocessingDao.ts:41-44
 * - D3 결정: 단일 UPDATE statement `WHERE service_type IN ('rag','llm')` 로 2 row 원자적 갱신
 * - parameterized query 만 사용 (SQL injection 방어)
 *
 * 참고:
 *   docs/2026-05-26/jobs-healthcheck-plan.md §3.4 (D3), §3.9 (D8), §4.4
 */
@Service("ServerHealthRepository")
export class ServerHealthRepository {
  @InjectConnection("main")
  private pool!: PoolClient;

  /**
   * 'rag' / 'llm' 두 row 의 ai_server_status / last_error / last_updated_at 동시 갱신.
   *
   * - preprocessing 컬럼은 건드리지 않음 (RAG 전처리 의미 보존 — plan §3.4 D3)
   * - updated_at 은 trigger 자동 갱신 — 명시 set 안 함
   */
  async updateBothRows(input: UpdateBothRowsInput): Promise<void> {
    const query = `
      UPDATE server_health
         SET ai_server_status = $1,
             last_error       = $2,
             last_updated_at  = $3
       WHERE service_type IN ('rag', 'llm')
    `;

    const values = [input.aiServerStatus, input.lastError, input.lastUpdatedAt];

    try {
      const result = await this.pool.query(query, values);
      // 시드가 보장하는 2 row 가 실제로 갱신되지 않으면 운영 알람 후보 (plan §3.4 D3 거부 옵션 C)
      if (result.rowCount !== 2) {
        logger.warn(
          `[ServerHealthRepository] updateBothRows 갱신 row 수 비정상 — 기대 2, 실제 ${result.rowCount}`
        );
      }
    } catch (error) {
      logger.error(`[ServerHealthRepository] server_health UPDATE 실패`, error);
      throw error;
    }
  }
}
