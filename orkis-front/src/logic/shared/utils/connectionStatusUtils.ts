/**
 * DB 연결 상태 → 텍스트/라벨 헬퍼
 */

type DbTestStatus = "success" | "failed" | string;

// ── 상태 라벨 ──────────────────────────────

export function getConnectionStatusLabel(status: DbTestStatus | undefined): string {
  if (!status) return "미확인";
  if (status === "success") return "연결됨";
  if (status === "failed") return "실패";
  return status;
}

// ── 상태 색상 CSS 변수 ─────────────────────

export function getConnectionStatusColor(status: DbTestStatus | undefined): string {
  if (!status) return "var(--text-muted)";
  if (status === "success") return "var(--success)";
  if (status === "failed") return "var(--error)";
  return "var(--text-muted)";
}
