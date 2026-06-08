/**
 * DatabaseSection 디스플레이 유틸
 * Design Layer 내 순수 표시 함수 (로직 의존 없음)
 */

// ── DB 연결 상태 아이콘 경로 ──

type ConnectionState = "not_configured" | "connecting" | "connected" | "disconnected" | "error";

const ICON_PATH = "/assets/icons/action";

const DB_ICONS: Record<ConnectionState, string> = {
  not_configured: `${ICON_PATH}/db_notconnect.png`,
  connecting: `${ICON_PATH}/db_normal.png`,
  connected: `${ICON_PATH}/db_normal.png`,
  disconnected: `${ICON_PATH}/db_abnormal.png`,
  error: `${ICON_PATH}/db_abnormal.png`,
};

export function getDbIcon(state: ConnectionState): string {
  return DB_ICONS[state] ?? DB_ICONS.not_configured;
}

// ── DB 연결 상태 라벨 ──

export function getConnectionStatusLabel(status: string | undefined): string {
  if (!status) return "미확인";
  if (status === "success") return "연결됨";
  if (status === "failed") return "실패";
  return status;
}

// ── DB 연결 상태 색상 ──

export function getConnectionStatusColor(status: string | undefined): string {
  if (!status) return "var(--text-muted)";
  if (status === "success") return "var(--success)";
  if (status === "failed") return "var(--error)";
  return "var(--text-muted)";
}

// ── lastTestStatus → ConnectionState 변환 ──

export function toConnectionState(status: string | undefined): ConnectionState {
  if (status === "success") return "connected";
  if (status === "failed") return "error";
  return "not_configured";
}
