/**
 * RagSection 디스플레이 유틸
 * Design Layer 내 순수 표시 함수 (로직 의존 없음)
 */

// ── RagType 상수 (Design Layer 용) ──
// logic/common/db/types/dbConnection의 RagType enum 값과 동일

export const RAG_TYPE = {
  ALL: 0,
  SCHEMA: 1,
  DATA: 2,
} as const;

export type RagTypeValue = (typeof RAG_TYPE)[keyof typeof RAG_TYPE];

// ── RAG 전처리 상태 타입 ──

type RagPreprocessingStatus = "pending" | "processing" | "success" | "failed";

// ── 아이콘 경로 ──

const ICON_PATH = "/assets/icons/action";

const STATUS_ICON: Record<RagPreprocessingStatus, string> = {
  pending: `${ICON_PATH}/rag_notconnect.png`,
  processing: `${ICON_PATH}/rag_progress.png`,
  success: `${ICON_PATH}/rag_normal.png`,
  failed: `${ICON_PATH}/rag_abnormal.png`,
};

export function getRagPreprocessingStatusIcon(status: RagPreprocessingStatus | undefined): string {
  return status ? STATUS_ICON[status] ?? STATUS_ICON.pending : STATUS_ICON.pending;
}

// ── 상태 라벨 ──

const STATUS_LABEL: Record<RagPreprocessingStatus, string> = {
  pending: "대기 중",
  processing: "처리 중",
  success: "완료",
  failed: "실패",
};

export function getRagPreprocessingStatusLabel(status: RagPreprocessingStatus | undefined): string {
  return status ? STATUS_LABEL[status] ?? "미설정" : "미설정";
}

// ── 상태 색상 CSS 변수 ──

const STATUS_COLOR: Record<RagPreprocessingStatus, string> = {
  pending: "var(--text-muted)",
  processing: "var(--info)",
  success: "var(--success)",
  failed: "var(--error)",
};

export function getRagPreprocessingStatusColor(status: RagPreprocessingStatus | undefined): string {
  return status ? STATUS_COLOR[status] ?? "var(--text-muted)" : "var(--text-muted)";
}

// ── 날짜 포맷 ──

export function formatRagDate(dateStr: string | undefined): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}
