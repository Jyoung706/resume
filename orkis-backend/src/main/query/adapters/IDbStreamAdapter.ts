/**
 * Phase 1 PR#5b - DB driver streaming 추상화.
 *
 * 분리 의도:
 *   - 현재 SQLite 전용 export 흐름을 driver 별로 분리 가능한 형태로 구조화
 *   - Phase 3 의 PostgreSQL / MySQL adapter 추가 시 service / controller 무변경
 *   - core 의 DatabaseClient 추상화는 long-lived cursor streaming 을 표현하지
 *     않으므로 본 adapter 가 backend 내부에서 driver 를 직접 사용 (계획 D22)
 *
 * 참조: docs/2026-06-01/bulk-download-streaming-plan.md (§9)
 */
import { Readable } from "stream";

export interface OpenStreamInput {
  /** 사용자 SQL. LIMIT 자동 래핑 없음 (export 는 원본 그대로) */
  sql: string;
  /**
   * driver 의 fetch batch size. SQLite 는 in-process 라 의미 미약.
   * Phase 3+ (PG/MySQL/Oracle) 에서 cursor batch 크기로 사용.
   */
  fetchBatchSize: number;
}

export interface RowStream extends Readable {
  /** 누적 emit row 수 (관찰용) */
  readonly rowsEmitted: number;
  /**
   * stream 정리. driver-specific (sqlite3: interrupt + close,
   *   PG: cursor close + client release, 등). idempotent.
   */
  close(): Promise<void>;
}

export interface IDbStreamAdapter {
  /** db_types.type_name 기준 - SQLite / PostgreSQL / MySQL / MariaDB / Oracle */
  readonly typeName: string;
  /**
   * prepare 시도 후 즉시 정리. SQL 문법 오류만 throw.
   * controller 의 사전 validate-for-export 단계에서 호출.
   */
  validateSyntax(sql: string): Promise<void>;
  /**
   * row stream open. 반환 시점에는 driver 연결이 _시작_ 되어 있고
   * 이후 row 는 비동기 발화. 호출자는 _close()_ 를 try/finally 또는
   * req close 핸들러에서 반드시 호출해야 함 (계획 D14).
   */
  openRowStream(input: OpenStreamInput): Promise<RowStream>;
}
