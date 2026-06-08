/**
 * rev7 wire 기반 액션 아이콘 매트릭스 연동 어댑터.
 *
 * 데이터 소스 분기 (panel-icon-rag 2026-05-22 결정):
 *   - DB / LLM 도메인: wire (rev7 폴링 응답)
 *   - RAG 도메인: ragPollingStore (per-user 처리 상태). 단 wire.rag.aiServerStatus===false
 *                  일 때만 server liveness 우선 (빨강 overlay).
 *
 * StatusItem[] shape 를 반환하여 ChatConnector 가 ChatLayout 의 statusItems prop 으로 전달.
 *
 *   const { allStatuses } = useHealthStatusIcons({
 *     dbId: selectedDbConnectionId,
 *     modelId: selectedLlmModelId,
 *   });
 *
 * 매트릭스 -> ConnectionState 매핑:
 *   --success    -> "connected"
 *   --error      -> "error"
 *   --info       -> "connecting"      (in_progress / processing / pending / partial)
 *   --text-muted -> "not_configured"  (unknown / stale / null state)
 *
 * 참고:
 *   docs/2026-05-19/healthCheck/health-check-plan.md (rev7, ## 상태 -> 아이콘 색상 -> 폴링 cadence)
 *   docs/2026-05-19/healthCheck/health-check-panel-decisions.md (2026-05-22, D3 = 기존 토큰)
 *   docs/2026-05-19/healthCheck/health-check-icon-rag-panel.md (2026-05-22, D1/D2/D3)
 */
import {
  getDbView,
  getLlmView,
  getLlmViewLivenessOnly,
  isHealthCheckUnreachable,
  useHealthStatusStore
} from "@/logic/common/health/healthStatusStore"
import { useHealthPolling } from "@/logic/common/health/useHealthPolling"
import { useRagPollingStore } from "@/logic/common/rag/ragPollingStore"
import type {
  HealthChecks,
  HealthColorToken,
  HealthDomainView,
  HealthStatusWire
} from "@/logic/common/health/types/healthStatusWire"
import type {
  ConnectionState,
  StatusItem
} from "@/logic/common/health/types/serverStatus"
import type { OverallRagStatus } from "@/logic/common/db/types/dbConnection"
import {
  getDbIcon,
  getModelIcon,
  getRagIcon
} from "@/logic/shared/utils/connectionStatusIcons"

export interface UseHealthStatusIconsOptions {
  /** 선택된 DB connection_id. null 이면 db 도메인 unknown 표시 */
  dbId: number | null
  /** 선택된 LLM modelId. null 이면 llm 도메인 unknown 표시 */
  modelId: string | null
  /** 폴링 비활성화 (로그아웃 등) */
  disabled?: boolean
  /**
   * 도메인별 명시 check 플래그 (panel-domain-checks, 2026-05-22).
   * - db === false : DB ping skip (dbId 있어도)
   * - llm === false: LLM API check skip (modelId 있어도)
   * - rag === false: server_health SELECT skip (rag.* + llm.aiServerStatus null)
   * 누락 시 backwards-compatible: backend 가 dbId/modelId 존재 추론.
   */
  checks?: HealthChecks
}

export interface UseHealthStatusIconsResult {
  /** ChatLayout statusItems prop 에 그대로 전달 가능 */
  allStatuses: StatusItem[]
  /** LLM 도메인 drift 여부 (registry vs liveness 모순). tooltip 노출용 */
  llmDrift: boolean
  /** 각 도메인 raw view (cadence/color) — 추가 UI 가공이 필요할 때 */
  views: {
    rag: HealthDomainView
    db: HealthDomainView
    llm: HealthDomainView
  }
}

const COLOR_ERROR: HealthColorToken = "--error"
const COLOR_SUCCESS: HealthColorToken = "--success"
const COLOR_WARN: HealthColorToken = "--info"
const COLOR_UNKNOWN: HealthColorToken = "--text-muted"

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

/**
 * per-user RAG 처리 상태 -> 색상/cadence 매핑 (panel-icon-rag D1).
 */
function mapRagPollingToView(status: OverallRagStatus): HealthDomainView {
  switch (status) {
    case "processing":
    case "pending":
    case "partial":
      return { color: COLOR_WARN, cadence: "normal" }
    case "success":
      return { color: COLOR_SUCCESS, cadence: "normal" }
    case "failed":
      return { color: COLOR_ERROR, cadence: "cooldown" }
    case "not_configured":
    default:
      return { color: COLOR_UNKNOWN, cadence: "normal" }
  }
}

/**
 * RAG 도메인 view (D1 + D3 server liveness overlay).
 *   wire.rag.aiServerStatus === false -> 빨강 (cooldown), ragPollingStore 결과 무시
 *   그 외 -> ragPollingStore.overallStatus 기반
 */
function getRagViewHybrid(
  wire: HealthStatusWire | null,
  ragPollingStatus: OverallRagStatus
): HealthDomainView {
  if (wire && wire.rag.aiServerStatus === false) {
    return { color: COLOR_ERROR, cadence: "cooldown" }
  }
  return mapRagPollingToView(ragPollingStatus)
}

/**
 * unreachable 시 모든 도메인을 빨강으로 short-circuit (panel-fetch-failure rev3, 2026-05-22).
 *
 * 색상 결정 근거:
 *   - 사용자 정신 모델: "에러 = 빨강". 회색은 "미구성/unknown" 으로 너무 passive.
 *   - monitoring 자체의 실패는 그 자체로 alarming 상황.
 *   - 기존 매트릭스 일관성: db.connection=false 와 동등한 실패 상태로 취급.
 *
 * cadence = normal 유지: 빠른 복구 감지를 위해 1Hz 폴링 지속.
 */
const UNREACHABLE_VIEW: HealthDomainView = {
  color: COLOR_ERROR,
  cadence: "normal"
}

/** 명시 skip 시의 도메인 view — 회색 (not_configured). panel-domain-checks D11. */
const SKIPPED_VIEW: HealthDomainView = {
  color: COLOR_UNKNOWN,
  cadence: "normal"
}

export function useHealthStatusIcons(
  options: UseHealthStatusIconsOptions
): UseHealthStatusIconsResult {
  const { checks } = options

  useHealthPolling(options)

  const wire = useHealthStatusStore((s) => s.wire)
  const consecutiveFailures = useHealthStatusStore(
    (s) => s.consecutiveFailures
  )
  const ragPollingStatus = useRagPollingStore((s) =>
    s.getCurrentOverallStatus()
  )

  const unreachable = isHealthCheckUnreachable(consecutiveFailures)

  // 명시 skip 플래그 (panel-domain-checks, 2026-05-22) — 즉시 회색 표시.
  // wire 응답을 기다리지 않고 사용자 의도 (지금 이 도메인 체크 안 함) 를 즉시 반영.
  //
  // RAG 도메인 예외: checks.rag=false 는 "server_health SELECT skip" 이지 RAG 아이콘 자체 숨김이 아님.
  // RAG 아이콘은 ragPollingStore (per-user 상태) 이 독립적으로 구동 — 전처리 중 orange 그대로 표시.
  // panel-icon-rag D1 합의: RAG 아이콘 소스 = ragPollingStore (wire 가 아닌).
  const dbSkipped = checks?.db === false
  const llmSkipped = checks?.llm === false
  const ragRegistrySkipped = checks?.rag === false

  // fetch 연속 실패 임계 도달 시 silent failure 회피 — 모든 아이콘 빨강.
  // 명시 skip 은 unreachable 보다 우선 (사용자가 의도적으로 disabled 한 도메인은 빨강 아님).
  const ragView = unreachable
    ? UNREACHABLE_VIEW
    : getRagViewHybrid(wire, ragPollingStatus)
  const dbView = dbSkipped
    ? SKIPPED_VIEW
    : unreachable
      ? UNREACHABLE_VIEW
      : getDbView(wire)
  // LLM 도메인: checks.rag === false 면 wire.llm.aiServerStatus 가 명시 skip 으로 null 임.
  // getLlmView 는 ai===null 을 unknown 처리 (rev7 매트릭스) — 이 컨텍스트에서는 잘못된 회색 표시.
  // 따라서 liveness-only view 로 전환 (panel-domain-checks rev2, 2026-05-22).
  const llmView = llmSkipped
    ? SKIPPED_VIEW
    : unreachable
      ? UNREACHABLE_VIEW
      : ragRegistrySkipped
        ? getLlmViewLivenessOnly(wire)
        : getLlmView(wire)

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
    llmDrift: unreachable ? false : llmView.drift === true,
    views: { rag: ragView, db: dbView, llm: llmView }
  }
}
