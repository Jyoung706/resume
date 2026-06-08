/**
 * 서버 연결 상태 → 아이콘 경로 매핑
 * orkis-front connectionStatusIcons.ts 이식 (간소화)
 */
import type { ConnectionState } from "@/logic/common/health/types/serverStatus";

const ICON_PATH = "/assets/icons/action";

const ConnectionIcons = {
  db: {
    not_configured: `${ICON_PATH}/db_notconnect.png`,
    connecting: `${ICON_PATH}/db_normal.png`,
    connected: `${ICON_PATH}/db_normal.png`,
    disconnected: `${ICON_PATH}/db_abnormal.png`,
    error: `${ICON_PATH}/db_abnormal.png`,
  },
  model: {
    not_configured: `${ICON_PATH}/model_notconnect.png`,
    connecting: `${ICON_PATH}/model_normal.png`,
    connected: `${ICON_PATH}/model_normal.png`,
    disconnected: `${ICON_PATH}/model_abnormal.png`,
    error: `${ICON_PATH}/model_abnormal.png`,
  },
  rag: {
    not_configured: `${ICON_PATH}/rag_notconnect.png`,
    connecting: `${ICON_PATH}/rag_progress.png`,
    connected: `${ICON_PATH}/rag_normal.png`,
    disconnected: `${ICON_PATH}/rag_abnormal.png`,
    error: `${ICON_PATH}/rag_abnormal.png`,
  },
} as const;

export function getDbIcon(state: ConnectionState): string {
  return ConnectionIcons.db[state] ?? ConnectionIcons.db.not_configured;
}

export function getModelIcon(state: ConnectionState): string {
  return ConnectionIcons.model[state] ?? ConnectionIcons.model.not_configured;
}

export function getRagIcon(state: ConnectionState): string {
  return ConnectionIcons.rag[state] ?? ConnectionIcons.rag.not_configured;
}
