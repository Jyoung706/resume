/**
 * rev7 wire 헬스 폴링 훅.
 *
 * 핵심 설계 (panel-decisions D2 = 변형 A):
 * - setTimeout-chain (응답 수신 후 cadence 만큼 대기 후 다음 fire).
 * - sessionStorage 카운트: N번째 폴링에서만 실제 backend 호출, 나머지는 캐시 재방출.
 * - document.visibilityState=hidden 동안 backend 호출 보류 + visibilitychange 로 즉시 복귀.
 * - AbortController + HEALTH_REQUEST_TIMEOUT_MS.
 * - 첫 fire 에 0~HEALTH_POLL_JITTER_MS 랜덤 지연 (thundering herd 방지).
 *
 * 참고:
 *   docs/2026-05-19/healthCheck/health-check-plan.md (rev7, ## 헬스 흐름 / 환경변수 / S7,S8,S9)
 *   docs/2026-05-19/healthCheck/health-check-panel-decisions.md (2026-05-22, D2 = 변형 A)
 *   docs/2026-05-19/healthCheck/health-check-final-process.md (다이어그램 A/B/E)
 */
import { useEffect } from "react"
import { API_BASE } from "@/logic/shared/config/env"
import {
  getOverallCadence,
  useHealthStatusStore
} from "@/logic/common/health/healthStatusStore"
import type {
  HealthChecks,
  HealthStatusWire
} from "@/logic/common/health/types/healthStatusWire"

const SS_PREFIX = "orkis:health"
const KEY_POLL_COUNT = (k: string) => `${SS_PREFIX}:pollCount:${k}`
const KEY_LAST_RESPONSE = (k: string) => `${SS_PREFIX}:lastResponse:${k}`
const KEY_LAST_RESPONSE_AT = (k: string) => `${SS_PREFIX}:lastResponseAt:${k}`

/* env 읽기 + 허용 범위 fallback (rev7 S8) */
function readIntEnv(
  name: string,
  defaultValue: number,
  min: number,
  max: number
): number {
  const raw = (import.meta.env as Record<string, string | undefined>)[name]
  if (raw === undefined) return defaultValue
  const parsed = parseInt(raw, 10)
  if (Number.isNaN(parsed) || parsed < min || parsed > max) {
    // 허용 범위 외 -> 기본값 fallback (rev7 S8)
    // console 금지 — front 로깅은 별도 logger 사용. 단순화 위해 무시.
    return defaultValue
  }
  return parsed
}

/**
 * N번째 폴링에서만 실제 backend 호출, 그 외는 sessionStorage 캐시 재방출.
 * 기본 5 (1~100). panel-decisions D2 변형 A.
 * 예) 5 → 5회 중 1회만 fetch, 나머지 4회는 캐시.
 */
const HEALTH_PING_EVERY_N = readIntEnv(
  "VITE_HEALTH_PING_EVERY_N",
  5,
  1,
  100
)
/**
 * normal cadence. 응답 수신 후 setTimeout 으로 대기 후 다음 fire.
 * 기본 1000ms (200~60000). 범위 외 → 기본값 fallback (rev7 S8).
 */
const HEALTH_POLL_INTERVAL_MS = readIntEnv(
  "VITE_HEALTH_POLL_INTERVAL_MS",
  1000,
  200,
  60000
)
/**
 * cooldown cadence. 도메인 실패 시 백오프 주기.
 * 기본 30000ms (5000~600000). 자동 복구 보장용.
 */
const HEALTH_POLL_COOLDOWN_MS = readIntEnv(
  "VITE_HEALTH_POLL_COOLDOWN_MS",
  30000,
  5000,
  600000
)
/**
 * 단일 /health/status fetch abort 임계 (AbortController).
 * 기본 2000ms (500~30000). setTimeout-chain 이므로 timeout > interval 도 허용.
 */
const HEALTH_REQUEST_TIMEOUT_MS = readIntEnv(
  "VITE_HEALTH_REQUEST_TIMEOUT_MS",
  2000,
  500,
  30000
)
/**
 * 첫 fire 의 0~jitter 랜덤 지연 — 다중 클라이언트 thundering herd 방지.
 * 기본 200ms (0~5000).
 */
const HEALTH_POLL_JITTER_MS = readIntEnv(
  "VITE_HEALTH_POLL_JITTER_MS",
  200,
  0,
  5000
)

/* sessionStorage 안전 read/write */
function ssReadNumber(key: string): number {
  try {
    const raw = sessionStorage.getItem(key)
    if (raw === null) return 0
    const n = parseInt(raw, 10)
    return Number.isNaN(n) ? 0 : n
  } catch {
    return 0
  }
}

function ssWriteNumber(key: string, value: number): void {
  try {
    sessionStorage.setItem(key, String(value))
  } catch {
    // sessionStorage 쿼터 초과 등은 무시 — 다음 tick 에서 복구 시도
  }
}

function ssReadJson<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (raw === null) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function ssWriteJson(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 무시
  }
}

export interface UseHealthPollingOptions {
  /** 선택된 DB connection_id (정수). null 이면 db.connection=null 응답 */
  dbId: number | null
  /** 선택된 LLM modelId. null 이면 llm.llmConnection=null 응답 */
  modelId: string | null
  /** 비활성화 (기본 false). 사용자가 로그아웃했거나 헬스 폴링을 끄고 싶을 때 true */
  disabled?: boolean
  /**
   * 도메인별 명시 check 플래그 (panel-domain-checks, 2026-05-22).
   * 누락 시 backwards-compatible: backend 가 dbId/modelId 존재 추론.
   */
  checks?: HealthChecks
}

/**
 * /health/status 폴링 훅.
 *
 * setTimeout-chain + visibility + sessionStorage 카운트.
 * 결과는 useHealthStatusStore 에 반영. 호출자는 store 를 구독해 색상/cadence 계산.
 */
export function useHealthPolling(options: UseHealthPollingOptions): void {
  const { dbId, modelId, disabled = false, checks } = options
  // checks 객체는 매 렌더마다 새 참조일 수 있어 안정화 (JSON.stringify 으로 dep 키 생성).
  const checksKey = checks
    ? JSON.stringify({ db: checks.db, llm: checks.llm, rag: checks.rag })
    : ""
  const setWire = useHealthStatusStore((s) => s.setWire)
  const setWireFromCache = useHealthStatusStore((s) => s.setWireFromCache)
  const recordFailure = useHealthStatusStore((s) => s.recordFailure)

  useEffect(() => {
    // useEffect run 마다 독립된 로컬 변수 — race condition 회피 (panel-fetch-race rev2).
    // useRef 였을 때의 버그: cleanup 이 set 한 값을 새 useEffect 가 즉시 리셋하여,
    // 옛 fire 의 await 이 깨어났을 때 옛/새 상태가 혼동됨.
    // 모든 mutable 상태 (isDisposed / pendingTimer / abortCtrl) 를 useEffect 로컬로 격리.
    let isDisposed = false
    let pendingTimer: ReturnType<typeof setTimeout> | null = null
    let abortCtrl: AbortController | null = null

    if (disabled) return

    // dbId/modelId 가 null 로 바뀌었으면 wire 의 해당 도메인을 즉시 null 로 패치
    // (transient stale 윈도우 제거 — panel-icon-rag D2).
    useHealthStatusStore.getState().patchDomainsForInputs(dbId, modelId)

    const storageKey = `${dbId ?? "null"}:${modelId ?? "null"}`

    function cancelPendingTimer() {
      if (pendingTimer !== null) {
        clearTimeout(pendingTimer)
        pendingTimer = null
      }
    }

    function abortInflight() {
      if (abortCtrl) {
        abortCtrl.abort()
        abortCtrl = null
      }
    }

    function scheduleNext(delayMs: number) {
      if (isDisposed) return
      cancelPendingTimer()
      pendingTimer = setTimeout(fire, delayMs)
    }

    function computeNextDelay(): number {
      const cadence = getOverallCadence(useHealthStatusStore.getState().wire)
      return cadence === "cooldown"
        ? HEALTH_POLL_COOLDOWN_MS
        : HEALTH_POLL_INTERVAL_MS
    }

    async function callBackend(): Promise<HealthStatusWire | null> {
      const ac = new AbortController()
      abortCtrl = ac
      const timeoutId = setTimeout(
        () => ac.abort(),
        HEALTH_REQUEST_TIMEOUT_MS
      )
      try {
        // POST /health/status (2026-05-22 전환 — orkis 컨트롤러 규약과 일관성)
        // checks (2026-05-22 panel-domain-checks): 도메인별 명시 check 플래그.
        // backend 가 누락 시 backwards-compatible 로 dbId/modelId 존재 추론.
        const url = `${API_BASE}/health/status`
        const body: {
          dbId: number | null
          modelId: string | null
          checks?: HealthChecks
        } = {
          dbId: dbId,
          modelId: modelId
        }
        if (checks !== undefined) {
          body.checks = checks
        }

        const res = await fetch(url, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify(body),
          signal: ac.signal
        })
        if (!res.ok) return null

        // backend 는 framework auto-wrap 으로 { success, data: <wire>, timestamp } 반환.
        // shared/services/request.ts 의 handleResponse 와 동일하게 data 를 언래핑.
        const json = (await res.json()) as
          | { success?: boolean; data?: unknown; timestamp?: string }
          | HealthStatusWire

        const unwrapped =
          json &&
          typeof json === "object" &&
          "success" in json &&
          "data" in json
            ? (json as { data: unknown }).data
            : json

        if (
          unwrapped &&
          typeof unwrapped === "object" &&
          (unwrapped as HealthStatusWire).version === "2"
        ) {
          return unwrapped as HealthStatusWire
        }
        return null
      } catch {
        // abort / network 실패 / JSON 파싱 실패 — 캐시 유지
        return null
      } finally {
        clearTimeout(timeoutId)
        if (abortCtrl === ac) abortCtrl = null
      }
    }

    async function fire() {
      if (isDisposed) return

      // visibility hidden -> backend 호출 보류, 다음 tick 만 예약
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        scheduleNext(computeNextDelay())
        return
      }

      const pollCount = ssReadNumber(KEY_POLL_COUNT(storageKey))
      const shouldHitBackend = pollCount % HEALTH_PING_EVERY_N === 0

      if (shouldHitBackend) {
        const wire = await callBackend()
        // await 후 isDisposed 재확인 (panel-fetch-race, 2026-05-26):
        // cleanup 에 의한 fetch abort 는 의도된 행위 — recordFailure() 호출 금지.
        // 실제 timeout / network 실패는 isDisposed=false 그대로이므로 정상 처리됨.
        if (isDisposed) return
        if (wire !== null) {
          ssWriteJson(KEY_LAST_RESPONSE(storageKey), wire)
          ssWriteNumber(KEY_LAST_RESPONSE_AT(storageKey), Date.now())
          setWire(wire)
        } else {
          // fetch 실패 (timeout/network/JSON 파싱 실패) — panel-fetch-failure D5/D7.
          // cleanup 으로 인한 abort 는 위 isDisposed 가드에서 이미 return.
          recordFailure()
        }
      } else {
        // 캐시 재방출 경로 — 실제 fetch 가 아니므로 consecutiveFailures 카운터를 건드리지 않음.
        // setWire 를 호출하면 counter 가 0 으로 리셋되어 silent failure 가 재발하는 버그가 있었음
        // (panel-fetch-failure rev4, 2026-05-22). setWireFromCache 는 wire 만 갱신.
        const cached = ssReadJson<HealthStatusWire>(KEY_LAST_RESPONSE(storageKey))
        if (cached !== null) {
          setWireFromCache(cached)
        }
      }

      ssWriteNumber(KEY_POLL_COUNT(storageKey), pollCount + 1)
      scheduleNext(computeNextDelay())
    }

    // 첫 fire — jitter 적용 (useEffect run 마다 한 번씩 thundering herd 회피).
    const initialDelay = Math.floor(Math.random() * (HEALTH_POLL_JITTER_MS + 1))
    scheduleNext(initialDelay)

    function onVisibilityChange() {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "visible"
      ) {
        // visible 복귀 시 즉시 1회 fire (rev7 S7)
        cancelPendingTimer()
        fire()
      }
    }

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibilityChange)
    }

    return () => {
      isDisposed = true
      cancelPendingTimer()
      abortInflight()
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange)
      }
    }
  }, [
    dbId,
    modelId,
    disabled,
    checksKey,
    setWire,
    setWireFromCache,
    recordFailure
  ])
}
