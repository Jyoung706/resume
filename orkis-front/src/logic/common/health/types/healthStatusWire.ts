/**
 * rev7 wire 응답 타입 (GET /health/status).
 *
 * backend 의 apps/orkis-backend/src/main/health/HealthService.ts 의 HealthStatusWire 와 동일 shape.
 * 변경 시 양쪽을 함께 갱신할 것.
 *
 * 참고:
 *   docs/2026-05-19/healthCheck/health-check-plan.md (rev7, ## API 계약)
 *   docs/2026-05-19/healthCheck/health-check-panel-decisions.md (2026-05-22)
 */

export type RagPreprocessing = "idle" | "in_progress" | "done" | "unknown"

export interface RagDomainWire {
  source: "registry"
  preprocessing: RagPreprocessing
  aiServerStatus: boolean | null
  lastUpdatedAt: string | null
  stale: boolean
}

export interface DbDomainWire {
  source: "liveness"
  connection: boolean | null
  lastCheckedAt: string | null
  cached: boolean
  stale: boolean
}

export interface LlmDomainWire {
  source: "mixed"
  aiServerStatus: boolean | null
  aiServerStatusUpdatedAt: string | null
  llmConnection: boolean | null
  lastCheckedAt: string | null
  cached: boolean
  stale: boolean
  drift: boolean
}

export interface HealthStatusWire {
  version: "2"
  timestamp: string
  rag: RagDomainWire
  db: DbDomainWire
  llm: LlmDomainWire
}

/**
 * 도메인별 명시 check 플래그 (panel-domain-checks, 2026-05-22).
 * Front 가 사용자 컨텍스트 (selectedDb, currentModel, isRagPollingActive) 기반으로 계산해 backend 에 전달.
 *
 * - db === false : DB ping skip (dbId 있어도)
 * - llm === false: LLM API check skip (modelId 있어도)
 * - rag === false: server_health SELECT skip (rag.* + llm.aiServerStatus null)
 *
 * 누락 시 backwards-compatible: dbId/modelId 존재 추론.
 */
export interface HealthChecks {
  db?: boolean
  llm?: boolean
  rag?: boolean
}

/**
 * 도메인 색상 토큰 (D3 결정 — 기존 토큰 매핑).
 */
export type HealthColorToken =
  | "--error"
  | "--success"
  | "--info"
  | "--text-muted"

/**
 * 도메인별 cadence — 'normal' / 'cooldown'.
 * 실제 사용 시 ms 로 변환 (env 또는 default).
 */
export type HealthCadence = "normal" | "cooldown"

export interface HealthDomainView {
  color: HealthColorToken
  cadence: HealthCadence
  drift?: boolean
}
