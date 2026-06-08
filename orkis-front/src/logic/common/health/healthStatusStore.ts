/**
 * rev7 wire 기반 헬스 상태 스토어 (Zustand).
 *
 * - useHealthPolling 이 /health/status 응답을 setWire 로 주입한다.
 * - 도메인별 color/cadence 는 매트릭스(getRagView/getDbView/getLlmView)로 derive.
 * - 본 스토어는 rev7 옵션 D 결정의 per-user 상태 (현재 보는 wire 값) 역할이다.
 *   throttle 의 자리는 아니다 — throttle 카운터는 useHealthPolling 의 sessionStorage 가 담당.
 * - fetch 실패 시 silent failure 회피 — consecutiveFailures 가 임계 도달 시
 *   isHealthCheckUnreachable 이 true 가 되고 selectors 가 모든 아이콘 회색 short-circuit.
 *
 * 참고:
 *   docs/2026-05-19/healthCheck/health-check-plan.md (rev7, ## 상태 -> 아이콘 색상 -> 폴링 cadence 매트릭스)
 *   docs/2026-05-19/healthCheck/health-check-panel-decisions.md (2026-05-22, D2 = 변형 A, D3 = 기존 토큰)
 *   docs/2026-05-19/healthCheck/health-check-fetch-failure-panel.md (2026-05-22, D5/D6/D7)
 */
import { create } from "zustand"
import type {
  HealthCadence,
  HealthColorToken,
  HealthDomainView,
  HealthStatusWire
} from "@/logic/common/health/types/healthStatusWire"

/**
 * fetch 연속 실패 임계 (env 또는 기본 1 — 즉시 회색).
 * 1~10 범위 외 입력 시 기본값 fallback.
 *
 * 기본 1 의 의미 (panel-fetch-failure rev2, 2026-05-22):
 *   - 사용자 정신 모델 "에러 = 즉시 표시" 와 정합
 *   - false-negative (실제 에러 미감지) 비용 > flicker (transient blip 깜박임) 비용
 *   - 운영팀이 transient tolerance 가 필요하면 env 로 N>=2 override
 */
export const HEALTH_FAILURE_THRESHOLD: number = (() => {
  const raw = (import.meta.env as Record<string, string | undefined>)[
    "VITE_HEALTH_FAILURE_THRESHOLD"
  ]
  const defaultValue = 1
  if (raw === undefined) return defaultValue
  const parsed = parseInt(raw, 10)
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 10) return defaultValue
  return parsed
})()

interface HealthStatusState {
  wire: HealthStatusWire | null
  lastSuccessAt: number
  /** fetch 연속 실패 누적 카운터. setWire 성공 시 0 으로 자동 리셋 (panel-fetch-failure D7). */
  consecutiveFailures: number
  /**
   * 실제 fetch 성공 응답 수신 시 호출.
   * wire 갱신 + lastSuccessAt 갱신 + consecutiveFailures = 0 자동 리셋.
   */
  setWire: (wire: HealthStatusWire) => void
  /**
   * sessionStorage 캐시 재방출 시 호출 (panel-fetch-failure rev4, 2026-05-22).
   * wire 만 갱신. lastSuccessAt / consecutiveFailures 는 변경하지 않음.
   * 캐시 재방출은 실제 성공이 아니므로 counter 리셋 시 silent failure 재발.
   */
  setWireFromCache: (wire: HealthStatusWire) => void
  /** fetch 실패 1회 기록. 임계 (HEALTH_FAILURE_THRESHOLD) 도달 시 isHealthCheckUnreachable=true. */
  recordFailure: () => void
  reset: () => void
  /**
   * dbId / modelId 가 null 로 바뀐 시점에 wire 의 해당 도메인을 즉시 null 로 패치.
   * 다음 폴링 응답이 도착하기 전까지의 transient stale 윈도우를 제거 (panel D2).
   */
  patchDomainsForInputs: (dbId: number | null, modelId: string | null) => void
}

export const useHealthStatusStore = create<HealthStatusState>((set, get) => ({
  wire: null,
  lastSuccessAt: 0,
  consecutiveFailures: 0,
  setWire: (wire) =>
    set({ wire, lastSuccessAt: Date.now(), consecutiveFailures: 0 }),
  setWireFromCache: (wire) => set({ wire }),
  recordFailure: () =>
    set((s) => ({ consecutiveFailures: s.consecutiveFailures + 1 })),
  reset: () => set({ wire: null, lastSuccessAt: 0, consecutiveFailures: 0 }),
  patchDomainsForInputs: (dbId, modelId) => {
    const current = get().wire
    if (current === null) return
    const dbShouldClear = dbId === null && current.db.connection !== null
    const llmShouldClear =
      modelId === null && current.llm.llmConnection !== null
    if (!dbShouldClear && !llmShouldClear) return
    set({
      wire: {
        ...current,
        db: dbShouldClear
          ? {
              ...current.db,
              connection: null,
              lastCheckedAt: null,
              cached: false
            }
          : current.db,
        llm: llmShouldClear
          ? {
              ...current.llm,
              llmConnection: null,
              lastCheckedAt: null,
              cached: false,
              drift: false
            }
          : current.llm
      }
    })
  }
}))

/**
 * fetch 연속 실패 임계 도달 여부 (panel-fetch-failure D5/D6/D7).
 * true 면 useHealthStatusIcons 가 모든 도메인 view 를 회색으로 short-circuit.
 */
export function isHealthCheckUnreachable(consecutiveFailures: number): boolean {
  return consecutiveFailures >= HEALTH_FAILURE_THRESHOLD
}

/* ============================================================
 * 매트릭스 helpers (rev7 매트릭스 3종 + D3 토큰 매핑)
 * ============================================================ */

const COLOR_ERROR: HealthColorToken = "--error"
const COLOR_SUCCESS: HealthColorToken = "--success"
const COLOR_WARN: HealthColorToken = "--info"
const COLOR_UNKNOWN: HealthColorToken = "--text-muted"

export function getRagView(wire: HealthStatusWire | null): HealthDomainView {
  if (!wire) return { color: COLOR_UNKNOWN, cadence: "normal" }
  const r = wire.rag
  if (r.stale) return { color: COLOR_UNKNOWN, cadence: "normal" }
  if (r.aiServerStatus === null) return { color: COLOR_UNKNOWN, cadence: "normal" }

  const ai = r.aiServerStatus
  const pp = r.preprocessing
  if (pp === "unknown") return { color: COLOR_UNKNOWN, cadence: "normal" }

  if (ai === false) {
    // ai 다운: idle 만 cooldown, 그 외 normal
    const cadence: HealthCadence = pp === "idle" ? "cooldown" : "normal"
    return { color: COLOR_ERROR, cadence }
  }
  // ai === true
  if (pp === "idle") return { color: COLOR_ERROR, cadence: "cooldown" }
  if (pp === "in_progress") return { color: COLOR_WARN, cadence: "normal" }
  return { color: COLOR_SUCCESS, cadence: "normal" } // done
}

export function getDbView(wire: HealthStatusWire | null): HealthDomainView {
  if (!wire) return { color: COLOR_UNKNOWN, cadence: "normal" }
  const c = wire.db.connection
  if (c === null) return { color: COLOR_UNKNOWN, cadence: "normal" }
  if (c === false) return { color: COLOR_ERROR, cadence: "cooldown" }
  return { color: COLOR_SUCCESS, cadence: "normal" }
}

export function getLlmView(wire: HealthStatusWire | null): HealthDomainView {
  if (!wire) return { color: COLOR_UNKNOWN, cadence: "normal" }
  const l = wire.llm
  const ai = l.aiServerStatus
  const lv = l.llmConnection
  const drift = l.drift

  if (ai === null) return { color: COLOR_UNKNOWN, cadence: "normal", drift }
  if (lv === null) return { color: COLOR_UNKNOWN, cadence: "normal", drift }

  if (ai === false && lv === false) {
    return { color: COLOR_ERROR, cadence: "cooldown", drift }
  }
  if (ai === true && lv === true) {
    return { color: COLOR_SUCCESS, cadence: "normal", drift }
  }
  // drift 케이스 (ai != lv) — 빨강 + normal cadence
  return { color: COLOR_ERROR, cadence: "normal", drift }
}

/**
 * LLM liveness-only view (panel-domain-checks rev2, 2026-05-22).
 *
 * checks.rag === false 로 server_health SELECT 가 명시 skip 된 경우 사용.
 * wire.llm.aiServerStatus = null 이지만 이는 "측정 못 함" 이 아니라
 * "사용자가 명시적으로 skip 함" — llmConnection 만으로 판정.
 *
 * 사용자 요구 (2026-05-22): "RAG 전처리 중에도 모델은 계속 check 한다."
 */
export function getLlmViewLivenessOnly(
  wire: HealthStatusWire | null
): HealthDomainView {
  if (!wire) return { color: COLOR_UNKNOWN, cadence: "normal" }
  const lv = wire.llm.llmConnection
  if (lv === null) return { color: COLOR_UNKNOWN, cadence: "normal" }
  if (lv === false) return { color: COLOR_ERROR, cadence: "cooldown" }
  return { color: COLOR_SUCCESS, cadence: "normal" }
}

/**
 * 실제 /health/status 호출 cadence = min(rag, db, llm).
 * cooldown 이 normal 보다 길기 때문에 모두 cooldown 일 때만 cooldown.
 */
export function getOverallCadence(
  wire: HealthStatusWire | null
): HealthCadence {
  const rag = getRagView(wire).cadence
  const db = getDbView(wire).cadence
  const llm = getLlmView(wire).cadence
  if (rag === "normal" || db === "normal" || llm === "normal") return "normal"
  return "cooldown"
}
