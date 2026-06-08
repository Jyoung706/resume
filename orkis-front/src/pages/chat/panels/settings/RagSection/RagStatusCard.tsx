// ============================================
// RagStatusCard — RAG 전처리 상태 카드 (스키마/데이터)
// Design Layer: props 기반 (로직 없음)
// ============================================

import { Button, FlexBox, Img, Paper, Typography } from "@/components";
import type { RagPreprocessingStatus } from "@/logic/common/db/types/dbConnection";
import {
  getRagPreprocessingStatusLabel,
  getRagPreprocessingStatusIcon,
  formatRagDate,
} from "./displayUtils";

// ============================================
// Props
// ============================================

export interface RagStatusCardProps {
  /** 카드 라벨 (예: "스키마", "데이터") */
  label: string;
  /** RAG 전처리 상태 */
  status?: RagPreprocessingStatus;
  /** 전처리 일시 */
  updatedAt?: string;
  /** 실행 버튼 클릭 핸들러 (없으면 버튼 미표시) */
  onRun?: () => void;
  /** 실행 중 여부 (true이면 버튼 disabled + 로딩 표시) */
  isRunning?: boolean;
  /** 에러 메시지 */
  errorMessage?: string;
}

// ============================================
// RagStatusCard
// ============================================

export function RagStatusCard({
  label,
  status,
  updatedAt,
  onRun,
  isRunning,
  errorMessage,
}: RagStatusCardProps) {
  const statusLabel = getRagPreprocessingStatusLabel(status);

  return (
    <Paper variant="outlined" className="RagStatusCard">
      <FlexBox direction="column" className="RagStatusCard__content">
        <Img
          src={getRagPreprocessingStatusIcon(status)}
          alt={label}
          className="RagStatusCard__icon"
        />
        <Typography className="RagStatusCard__label">
          {label}
        </Typography>
        <Typography
          className="RagStatusCard__status"
          data-status={status ?? "pending"}
        >
          {statusLabel}
        </Typography>
        <Typography className="RagStatusCard__date">
          {formatRagDate(updatedAt)}
        </Typography>
        {errorMessage && (
          <Typography className="RagStatusCard__error">
            {errorMessage}
          </Typography>
        )}
        {onRun && (
          <Button
            size="small"
            variant="outlined"
            className="RagStatusCard__run-btn"
            onClick={onRun}
            disabled={isRunning}
          >
            {isRunning ? "실행 중..." : "실행"}
          </Button>
        )}
      </FlexBox>
    </Paper>
  );
}
