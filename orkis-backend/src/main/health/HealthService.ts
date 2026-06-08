import { Autowired, Service } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { DbConnectionChecker } from "./checkers/DbConnectionChecker";
import { LlmApiChecker } from "./checkers/LlmApiChecker";
import {
  LlmRegistryDto,
  RagRegistryDto,
  RagRegistryReader
} from "./RagRegistryReader";

/**
 * rev7 wire 응답의 db 도메인 부분.
 * rev3 (2026-05-26) — skipped 마커 추가. cached 는 deprecated (항상 false, BC 유지).
 */
export interface DbWireDto {
  source: "liveness";
  connection: boolean | null;
  lastCheckedAt: string | null;
  /** @deprecated 항상 false. 다음 메이저에서 제거 예정. rev3 부터 skipped 사용. */
  cached: boolean;
  /**
   * rev3 신규 — true 면 backend 가 pollCount throttle 결정으로 DB ping 을 스킵했음.
   * connection / lastCheckedAt 은 null. front 는 prior wire 와 per-field merge.
   * 참고: docs/2026-05-26/front-backend-healthcheck-policy-revision.md (rev3, D3/D5).
   */
  skipped: boolean;
  stale: boolean;
}

/**
 * rev7 wire 응답의 llm 도메인 부분.
 * rev3 (2026-05-26) — skipped 마커 추가. cached 는 deprecated.
 *
 * skipped 의 의미:
 *   - llmConnection (LLM API call, 무거움) 만 throttle 대상.
 *   - aiServerStatus (server_health SELECT, 가벼움) 는 매번 fresh.
 *   - skipped=true 시 llmConnection / lastCheckedAt 은 null, drift 는 false (계산 불가).
 *     front 가 prior 의 llmConnection / drift 를 보존 (D5/D10).
 */
export interface LlmWireDto {
  source: "mixed";
  aiServerStatus: boolean | null;
  aiServerStatusUpdatedAt: string | null;
  llmConnection: boolean | null;
  lastCheckedAt: string | null;
  /** @deprecated 항상 false. 다음 메이저에서 제거 예정. rev3 부터 skipped 사용. */
  cached: boolean;
  /** rev3 신규 — true 면 LLM API call 을 throttle 결정으로 스킵. */
  skipped: boolean;
  stale: boolean;
  drift: boolean;
}

/**
 * rev7 wire 응답 전체 shape (version:"2").
 */
export interface HealthStatusWire {
  version: "2";
  timestamp: string;
  rag: RagRegistryDto;
  db: DbWireDto;
  llm: LlmWireDto;
}

/**
 * HealthService.compose 의 입력. connectionId / modelId 는 null 가능 (미선택 사용자 대응).
 *
 * skipRag (2026-05-22 panel-domain-checks):
 *   - true 면 server_health SELECT 자체를 skip. rag.* 와 llm.aiServerStatus(registry) 모두 null.
 *   - llm.llmConnection (liveness) 는 별개로 modelId 가 있으면 check.
 *   - 사용자 요구 "RAG 전처리 중 server_health 미체크" 반영.
 *
 * rev3 (2026-05-26) — backend pollCount throttle 신호:
 *   - pollCount: front sessionStorage 카운터. 미전송 시 0 (BC: 매번 실측).
 *   - forceCheck: 에러 자동복구 / bootstrap C4 가드. 미전송 시 모두 false.
 *   - cadenceProfile: 관측용. backend 로직에는 영향 없음.
 */
export interface HealthComposeInput {
  userId: string;
  connectionId: number | null;
  modelId: string | null;
  skipRag?: boolean;
  pollCount?: number;
  forceCheck?: { db: boolean; llm: boolean };
  cadenceProfile?: "foreground" | "background";
}

/**
 * 3 도메인 (rag / db / llm) 의 헬스 결과를 조립해 rev7 wire 응답을 만든다.
 *
 * 핵심 원칙:
 * - 도메인별 try/catch -> 실패 도메인은 unknown 마커로 응답 (HTTP 자체는 200).
 * - rag.aiServerStatus 는 server_health 'rag' row, llm.aiServerStatus 는 'llm' row 에서 읽음.
 *   (rev7: 현 단계에서는 동일 AI 서버를 공유하지만 row 는 service_type 별 분리)
 * - drift 는 llm 도메인에서 aiServerStatus(registry) != llmConnection(liveness) 인 경우 true.
 *
 * 참고:
 *   docs/2026-05-19/healthCheck/health-check-plan.md (rev7, ## API 계약)
 *   docs/2026-05-19/healthCheck/health-check-panel-decisions.md (2026-05-22)
 */
@Service("HealthService")
export class HealthService {
  @Autowired("RagRegistryReader")
  private ragRegistryReader!: RagRegistryReader;

  @Autowired("DbConnectionChecker")
  private dbConnectionChecker!: DbConnectionChecker;

  @Autowired("LlmApiChecker")
  private llmApiChecker!: LlmApiChecker;

  async compose(input: HealthComposeInput): Promise<HealthStatusWire> {
    const skipRag = input.skipRag === true;
    // rev3 — throttle 신호. 누락 시 안전 기본값 (BC).
    const pollCount = input.pollCount ?? 0;
    const forceCheckDb = input.forceCheck?.db === true;
    const forceCheckLlm = input.forceCheck?.llm === true;

    const [rag, db, llmRegistry, llmLiveness] = await Promise.all([
      skipRag ? this.composeRagSkipped() : this.composeRag(),
      this.composeDb(input, pollCount, forceCheckDb),
      skipRag ? this.composeLlmRegistrySkipped() : this.composeLlmRegistry(),
      this.composeLlmLiveness(input, pollCount, forceCheckLlm)
    ]);

    const llm = this.assembleLlm(llmRegistry, llmLiveness);

    return {
      version: "2",
      timestamp: new Date().toISOString(),
      rag,
      db,
      llm
    };
  }

  /** server_health 도메인 명시 skip 시의 RAG 응답 (panel-domain-checks). */
  private async composeRagSkipped(): Promise<RagRegistryDto> {
    return {
      source: "registry",
      preprocessing: "unknown",
      aiServerStatus: null,
      lastUpdatedAt: null,
      stale: false
    };
  }

  /** server_health 도메인 명시 skip 시의 LLM registry 응답. llm.llmConnection 은 별개. */
  private async composeLlmRegistrySkipped(): Promise<LlmRegistryDto> {
    return {
      aiServerStatus: null,
      aiServerStatusUpdatedAt: null,
      stale: false
    };
  }

  private async composeRag(): Promise<RagRegistryDto> {
    try {
      return await this.ragRegistryReader.readRag();
    } catch (err) {
      logger.error("[HealthService] composeRag failed", err);
      return {
        source: "registry",
        preprocessing: "unknown",
        aiServerStatus: null,
        lastUpdatedAt: null,
        stale: false
      };
    }
  }

  /**
   * rev3 (2026-05-26) — pollCount throttle + forceCheck 자동복구.
   *
   * 측정 조건 (OR):
   *   1. pollCount % HEALTH_DB_CHECK_EVERY_N === 0  (modulo throttle)
   *   2. forceCheckDb === true                       (에러 자동복구 / C4 bootstrap)
   *
   * 측정 안 함: connection=null, lastCheckedAt=null, skipped=true 반환.
   *             front 가 zustand store 의 prior wire 와 per-field merge (D5).
   */
  private async composeDb(
    input: HealthComposeInput,
    pollCount: number,
    forceCheckDb: boolean
  ): Promise<DbWireDto> {
    if (input.connectionId === null) {
      return {
        source: "liveness",
        connection: null,
        lastCheckedAt: null,
        cached: false,
        skipped: false,
        stale: false
      };
    }

    const everyN = HealthService.readCheckEveryN(
      "HEALTH_DB_CHECK_EVERY_N"
    );
    const shouldMeasure = pollCount % everyN === 0 || forceCheckDb;

    logger.debug("[HealthService] composeDb throttle decision", {
      userId: input.userId,
      connectionId: input.connectionId,
      pollCount,
      everyN,
      forceCheckDb,
      shouldMeasure
    });

    if (!shouldMeasure) {
      return {
        source: "liveness",
        connection: null,
        lastCheckedAt: null,
        cached: false,
        skipped: true,
        stale: false
      };
    }

    try {
      const result = await this.dbConnectionChecker.check(
        input.userId,
        input.connectionId
      );
      return {
        source: "liveness",
        connection: result.connection,
        lastCheckedAt: result.lastCheckedAt,
        cached: false,
        skipped: false,
        stale: false
      };
    } catch (err) {
      logger.error("[HealthService] composeDb failed", err);
      return {
        source: "liveness",
        connection: null,
        lastCheckedAt: null,
        cached: false,
        skipped: false,
        stale: false
      };
    }
  }

  /**
   * 환경변수에서 throttle N 값을 읽고 검증.
   * 1 ≤ N ≤ 1000. 범위 외 또는 NaN 이면 기본값 5 로 fallback.
   */
  private static readCheckEveryN(envName: string): number {
    const raw = process.env[envName];
    const parsed = raw ? parseInt(raw, 10) : NaN;
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 1000) return 5;
    return parsed;
  }

  private async composeLlmRegistry(): Promise<LlmRegistryDto> {
    try {
      return await this.ragRegistryReader.readLlmRegistry();
    } catch (err) {
      logger.error("[HealthService] composeLlmRegistry failed", err);
      return {
        aiServerStatus: null,
        aiServerStatusUpdatedAt: null,
        stale: false
      };
    }
  }

  /**
   * rev3 (2026-05-26) — LLM API call throttle.
   *
   * 측정 조건은 composeDb 와 동일 (OR):
   *   1. pollCount % HEALTH_LLM_CHECK_EVERY_N === 0
   *   2. forceCheckLlm === true
   *
   * 주의: aiServerStatus (server_health SELECT) 는 별도 — composeLlmRegistry 에서 항상 매번 측정.
   *       throttle 대상은 llmConnection (실제 LLM API call) 만.
   */
  private async composeLlmLiveness(
    input: HealthComposeInput,
    pollCount: number,
    forceCheckLlm: boolean
  ): Promise<{
    llmConnection: boolean | null;
    lastCheckedAt: string | null;
    skipped: boolean;
  }> {
    if (input.modelId === null) {
      return { llmConnection: null, lastCheckedAt: null, skipped: false };
    }

    const everyN = HealthService.readCheckEveryN(
      "HEALTH_LLM_CHECK_EVERY_N"
    );
    const shouldMeasure = pollCount % everyN === 0 || forceCheckLlm;

    logger.debug("[HealthService] composeLlmLiveness throttle decision", {
      userId: input.userId,
      modelId: input.modelId,
      pollCount,
      everyN,
      forceCheckLlm,
      shouldMeasure
    });

    if (!shouldMeasure) {
      return { llmConnection: null, lastCheckedAt: null, skipped: true };
    }

    try {
      const result = await this.llmApiChecker.check(input.userId, input.modelId);
      return {
        llmConnection: result.llmConnection,
        lastCheckedAt: result.lastCheckedAt,
        skipped: false
      };
    } catch (err) {
      logger.error("[HealthService] composeLlmLiveness failed", err);
      return { llmConnection: null, lastCheckedAt: null, skipped: false };
    }
  }

  /**
   * rev3 (2026-05-26) — drift 정책:
   *   - liveness.skipped === false (측정함): registry.aiServerStatus vs liveness.llmConnection 비교.
   *   - liveness.skipped === true  (스킵): drift=false 강제. 계산 불가 — front 가 prior drift 보존 (D10).
   */
  private assembleLlm(
    registry: LlmRegistryDto,
    liveness: {
      llmConnection: boolean | null;
      lastCheckedAt: string | null;
      skipped: boolean;
    }
  ): LlmWireDto {
    const drift = liveness.skipped
      ? false
      : registry.aiServerStatus !== null &&
        liveness.llmConnection !== null &&
        registry.aiServerStatus !== liveness.llmConnection;

    return {
      source: "mixed",
      aiServerStatus: registry.aiServerStatus,
      aiServerStatusUpdatedAt: registry.aiServerStatusUpdatedAt,
      llmConnection: liveness.llmConnection,
      lastCheckedAt: liveness.lastCheckedAt,
      cached: false,
      skipped: liveness.skipped,
      stale: registry.stale,
      drift
    };
  }
}
