import { Dao, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import type { PoolClient } from "pg";

/**
 * server_health 테이블의 단일 row shape (DB 컬럼 -> camelCase 매핑).
 */
export interface ServerHealthRow {
  serviceType: "rag" | "llm";
  preprocessing: "idle" | "in_progress" | "done" | null;
  aiServerStatus: boolean | null;
  lastUpdatedAt: Date | null;
  lastError: string | null;
}

/**
 * rev7 wire 응답의 rag 도메인 부분 (HealthService 가 timestamp/source 등 조립 시 사용).
 */
export interface RagRegistryDto {
  source: "registry";
  preprocessing: "idle" | "in_progress" | "done" | "unknown";
  aiServerStatus: boolean | null;
  lastUpdatedAt: string | null;
  stale: boolean;
}

/**
 * rev7 wire 응답의 llm 도메인 중 registry 영역 (aiServerStatus / aiServerStatusUpdatedAt / stale).
 * llmConnection 은 LlmApiChecker 가 liveness 로 별도 제공.
 */
export interface LlmRegistryDto {
  aiServerStatus: boolean | null;
  aiServerStatusUpdatedAt: string | null;
  stale: boolean;
}

/**
 * server_health 테이블 SELECT 전용 Dao.
 *
 * 본 작업 단계에서는 jobs 가 미가동 — 32_initial_data_server_health.sql 의 healthy 시드가
 * 유일한 적재처. stale 판정은 1줄 주석으로 비활성 (jobs 도입 시 활성).
 *
 * 참고:
 *   docs/2026-05-19/healthCheck/health-check-plan.md (rev7, ## API 계약 / ## 데이터 모델)
 *   docs/2026-05-19/healthCheck/health-check-panel-decisions.md (2026-05-22, D1 = 변형 A')
 */
@Dao("RagRegistryReader")
export class RagRegistryReader {
  @InjectConnection("main")
  private pool!: PoolClient;

  async readRag(): Promise<RagRegistryDto> {
    const row = await this.selectByServiceType("rag");
    if (!row) {
      return {
        source: "registry",
        preprocessing: "unknown",
        aiServerStatus: null,
        lastUpdatedAt: null,
        stale: false
      };
    }

    // [TODO: jobs 도입 후 활성화]
    // jobs 가 last_updated_at 을 주기적으로 갱신하기 시작하면 아래 stale 판정을 활성화한다.
    // 현재는 시드 1회 기록만 존재하므로 stale 판정을 항상 false 로 고정 (panel-decisions D1 = 변형 A').
    //
    // const staleThresholdMs = parseInt(process.env.HEALTH_STALE_THRESHOLD_MS ?? "60000", 10);
    // const stale =
    //   row.lastUpdatedAt === null ||
    //   Date.now() - row.lastUpdatedAt.getTime() > staleThresholdMs;
    const stale = false;

    return {
      source: "registry",
      preprocessing: row.preprocessing ?? "unknown",
      aiServerStatus: row.aiServerStatus,
      lastUpdatedAt: row.lastUpdatedAt?.toISOString() ?? null,
      stale
    };
  }

  async readLlmRegistry(): Promise<LlmRegistryDto> {
    const row = await this.selectByServiceType("llm");
    if (!row) {
      return {
        aiServerStatus: null,
        aiServerStatusUpdatedAt: null,
        stale: false
      };
    }

    // [TODO: jobs 도입 후 활성화] — RagRegistryReader.readRag 의 stale 주석 참조.
    const stale = false;

    return {
      aiServerStatus: row.aiServerStatus,
      aiServerStatusUpdatedAt: row.lastUpdatedAt?.toISOString() ?? null,
      stale
    };
  }

  private async selectByServiceType(
    serviceType: "rag" | "llm"
  ): Promise<ServerHealthRow | null> {
    const query = `
      SELECT
        service_type     AS "serviceType",
        preprocessing,
        ai_server_status AS "aiServerStatus",
        last_updated_at  AS "lastUpdatedAt",
        last_error       AS "lastError"
      FROM   server_health
      WHERE  service_type = $1
      LIMIT  1
    `;

    try {
      const result = await this.pool.query(query, [serviceType]);
      if (result.rows.length === 0) return null;
      return result.rows[0] as ServerHealthRow;
    } catch (err) {
      logger.error(
        `[RagRegistryReader] selectByServiceType(${serviceType}) failed`,
        err
      );
      throw err;
    }
  }
}
