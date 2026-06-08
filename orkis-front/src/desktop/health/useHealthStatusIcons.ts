/**
 * desktop 전용 health 아이콘 훅 (cloud useHealthStatusIcons 의 swap 대상).
 *
 * cloud 와 동일 시그니처/반환(StatusItem[])을 유지하여, ChatConnector 는 `@health-icons`
 * alias 로 import 하고 빌드 환경이 구현을 교체한다 (backend `@app` swap 과 동형):
 *   - cloud(vite.config.ts / vite.config.docker.ts): @health-icons → logic/common/health/useHealthStatusIcons
 *   - desktop(orkis-desktop/electron.vite.config.ts): @health-icons → 이 파일
 *
 * cloud 와 다른 점 (desktop 은 server_health PG 테이블도 POST /health/status 폴링도 없음):
 *   - RAG  : podman 컨테이너(backend & ai) HEALTHCHECK → service:status IPC → serviceHealthStore
 *            + ragPollingStore 전처리 상태 합성
 *   - 모델 : 선택 모델의 apiKeyMasked 등록 여부 (외부 API ping 안 함)
 *   - DB   : 보류 (not_configured)
 *
 * 신규 파일이므로 cloud 코드는 한 줄도 변경하지 않는다. 주황 아이콘(rag_progress.png),
 * connecting 매핑, ragPollingStore 등 기존 자산을 그대로 재사용한다.
 */
import { useEffect, useState } from "react"
import { API_BASE } from "@/logic/shared/config/env"
import { useServiceHealthStore } from "@/desktop/stores/serviceHealthStore"
import { useLlmModelStore } from "@/logic/common/llm/llmModelStore"
import { useRagPollingStore } from "@/logic/common/rag/ragPollingStore"
import {
  getDbIcon,
  getModelIcon,
  getRagIcon
} from "@/logic/shared/utils/connectionStatusIcons"
import type {
  HealthChecks,
  HealthColorToken,
  HealthDomainView
} from "@/logic/common/health/types/healthStatusWire"
import type {
  ConnectionState,
  StatusItem
} from "@/logic/common/health/types/serverStatus"
import type { OverallRagStatus } from "@/logic/common/db/types/dbConnection"

export interface UseHealthStatusIconsOptions {
  /** 선택된 DB connection_id (desktop 은 현재 미사용 — DB 도메인 보류) */
  dbId: number | null
  /** 선택된 LLM modelId. 해당 모델의 apiKeyMasked 로 활성 판정 */
  modelId: string | null
  /** 폴링 비활성화 (cloud 시그니처 호환용 — desktop 은 폴링 없음) */
  disabled?: boolean
  /** 도메인별 check 플래그 (cloud 시그니처 호환용 — desktop 은 미사용) */
  checks?: HealthChecks
}

export interface UseHealthStatusIconsResult {
  allStatuses: StatusItem[]
  llmDrift: boolean
  views: {
    rag: HealthDomainView
    db: HealthDomainView
    llm: HealthDomainView
  }
}

const VIEW_SUCCESS: HealthDomainView = { color: "--success", cadence: "normal" }
const VIEW_ERROR: HealthDomainView = { color: "--error", cadence: "cooldown" }
const VIEW_WARN: HealthDomainView = { color: "--info", cadence: "normal" }
const VIEW_UNKNOWN: HealthDomainView = {
  color: "--text-muted",
  cadence: "normal"
}

function colorToConnectionState(color: HealthColorToken): ConnectionState {
  switch (color) {
    case "--success":
      return "connected"
    case "--error":
      return "error"
    case "--info":
      return "connecting"
    case "--text-muted":
    default:
      return "not_configured"
  }
}

/** 전처리 진행 중 여부 (주황 표시 대상). success 는 완료, not_configured 는 미구성. */
function isPreprocessing(status: OverallRagStatus): boolean {
  return (
    status === "pending" || status === "processing" || status === "partial"
  )
}

export function useHealthStatusIcons(
  options: UseHealthStatusIconsOptions
): UseHealthStatusIconsResult {
  // podman 컨테이너 health (service:status IPC). 웹 환경에선 undefined.
  const backend = useServiceHealthStore((s) => s.backend)
  const ai = useServiceHealthStore((s) => s.ai)
  const models = useLlmModelStore((s) => s.models)
  const ragOverall = useRagPollingStore((s) => s.getCurrentOverallStatus())

  // ── RAG 도메인 ──────────────────────────────────────────────
  // 우선순위: 컨테이너 비정상(빨강) > 둘다 healthy + 전처리중(주황) > 둘다 healthy(초록) > 그 외(회색)
  const containerDown =
    backend === "unhealthy" ||
    backend === "down" ||
    ai === "unhealthy" ||
    ai === "down"
  const containerUp = backend === "healthy" && ai === "healthy"
  const ragView: HealthDomainView = containerDown
    ? VIEW_ERROR
    : containerUp
      ? isPreprocessing(ragOverall)
        ? VIEW_WARN
        : VIEW_SUCCESS
      : VIEW_UNKNOWN // starting / 미구성

  // ── 모델 도메인 ─────────────────────────────────────────────
  // 선택 모델에 API 키가 등록(apiKeyMasked 존재)되어 있으면 활성(초록).
  const model = options.modelId
    ? models.find((m) => m.id === options.modelId)
    : null
  const llmView: HealthDomainView =
    model && model.apiKeyMasked ? VIEW_SUCCESS : VIEW_UNKNOWN

  // ── DB 도메인 ───────────────────────────────────────────────
  // POST /health/db-check (DbConnectionChecker: prepareDynamicDBConnection + isConnected).
  // dbId 변경 시 1회 호출 — 사용자 DB 직접 연결이라 무거우므로 폴링하지 않는다.
  //   connection true  → 초록(connected)
  //   connection false → 빨강(error)
  //   미선택/실패        → 회색(not_configured)
  const [dbConnection, setDbConnection] = useState<boolean | null>(null)

  useEffect(() => {
    if (options.dbId == null) {
      setDbConnection(null)
      return
    }
    let cancelled = false
    fetch(`${API_BASE}/health/db-check`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({ connectionId: options.dbId })
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return
        // framework auto-wrap { success, data } 언래핑
        const data =
          json && typeof json === "object" && "data" in json ? json.data : json
        setDbConnection(
          data && typeof data.connection === "boolean" ? data.connection : null
        )
      })
      .catch(() => {
        if (!cancelled) setDbConnection(null)
      })
    return () => {
      cancelled = true
    }
  }, [options.dbId])

  const dbView: HealthDomainView =
    dbConnection === true
      ? VIEW_SUCCESS
      : dbConnection === false
        ? VIEW_ERROR
        : VIEW_UNKNOWN

  const dbState = colorToConnectionState(dbView.color)
  const modelState = colorToConnectionState(llmView.color)
  const ragState = colorToConnectionState(ragView.color)

  const allStatuses: StatusItem[] = [
    { type: "db", label: "DB", status: dbState, icon: getDbIcon(dbState) },
    {
      type: "model",
      label: "모델",
      status: modelState,
      icon: getModelIcon(modelState)
    },
    { type: "rag", label: "RAG", status: ragState, icon: getRagIcon(ragState) }
  ]

  return {
    allStatuses,
    llmDrift: false,
    views: { rag: ragView, db: dbView, llm: llmView }
  }
}
