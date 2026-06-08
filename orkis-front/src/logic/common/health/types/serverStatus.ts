/**
 * 헬스 상태 아이콘 표시용 공용 타입.
 * useHealthStatusIcons 가 wire (rev7) 를 매핑해 본 타입으로 반환,
 * ChatLayout 의 statusItems prop 이 소비.
 */

/** 서버 연결 상태 */
export type ConnectionState =
  | "connected"
  | "disconnected"
  | "connecting"
  | "not_configured"
  | "error";

/** 상태 바 표시 아이템 */
export interface StatusItem {
  type: "db" | "model" | "rag";
  label: string;
  status: ConnectionState;
  icon: string;
}

// ── RAG 관련 타입은 dbConnection.ts에서 정의 (Single Source of Truth) ──
export type { RagStatus, RagPreprocessingHistory } from "@/logic/common/db/types/dbConnection";
