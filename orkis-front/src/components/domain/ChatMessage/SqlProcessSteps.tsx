// ============================================
// SqlProcessSteps — SQL 처리 단계 파이프라인 (아코디언)
// Design Layer: props 기반 (로직 없음)
//
// orkis-front SqlGenerationProcess 기준:
//   - 가로 파이프라인: 진행률 + 단계칩 + 화살표 + 최종상태
//   - 아코디언 접기/펼치기
// ============================================

import { useState, useEffect, useRef } from "react";
import clsx from "clsx";
import {
  Box,
  CancelIcon,
  Collapse,
  ExpandLessIcon,
  ExpandMoreIcon,
  Icon,
  FlexBox,
  IconButton,
  Typography
} from "@/components";
import "./ChatMessage.scss";

// ============================================
// 타입
// ============================================

export interface ProcessStepData {
  id: string;
  label: string;
  status: "pending" | "running" | "completed" | "error" | "stopped";
}

export interface SqlProcessStepsProps {
  steps: ProcessStepData[];
  /** 초기 펼침 상태 (기본: true) */
  defaultExpanded?: boolean;
  /** 헤더(타이틀+토글)와 Collapse 래퍼를 제거하고 본문만 렌더. 외부 아코디언이 토글을 담당할 때 사용 */
  headless?: boolean;
  /** 진행률 그룹(SQL생성 NN%) 표시 여부 (기본: true) */
  showProgress?: boolean;
  /** 최종 상태 배지(생성성공/실패/중지) 표시 여부 (기본: true) */
  showFinalStatus?: boolean;
}

// ============================================
// 최종 상태 계산
// ============================================

function getFinalStatus(
  steps: ProcessStepData[]
): "completed" | "error" | "running" | "pending" | "stopped" {
  if (steps.some((s) => s.status === "error")) return "error";
  if (steps.some((s) => s.status === "stopped")) return "stopped";
  if (steps.every((s) => s.status === "completed")) return "completed";
  if (steps.some((s) => s.status === "running")) return "running";
  return "pending";
}

function getStatusLabel(steps: ProcessStepData[]): string {
  const finalStatus = getFinalStatus(steps);
  if (finalStatus === "completed") return "SQL 생성 완료";
  if (finalStatus === "error") {
    const completed = steps.filter((s) => s.status === "completed").length;
    return `SQL 생성 실패 (${completed}/${steps.length})`;
  }
  if (finalStatus === "stopped") {
    const completed = steps.filter((s) => s.status === "completed").length;
    const pct = Math.round((completed / steps.length) * 100);
    return `SQL 생성 중지 (${pct}%)`;
  }
  const completed = steps.filter((s) => s.status === "completed").length;
  const pct = Math.round((completed / steps.length) * 100);
  return `SQL 생성 중... (${pct}%)`;
}

function getStatusLabelModifier(steps: ProcessStepData[]): string {
  const finalStatus = getFinalStatus(steps);
  if (finalStatus === "completed") return "SqlProcess__status-label--completed";
  if (finalStatus === "error") return "SqlProcess__status-label--error";
  if (finalStatus === "stopped") return "SqlProcess__status-label--stopped";
  return "SqlProcess__status-label--running";
}

function getProgressPercent(steps: ProcessStepData[]): number {
  if (steps.length === 0) return 0;
  const completed = steps.filter((s) => s.status === "completed").length;
  return Math.round((completed / steps.length) * 100);
}

// ============================================
// 단계별 칩 아이콘
// ============================================

function StepStatusIcon({ status }: { status: ProcessStepData["status"] }) {
  switch (status) {
    case "pending":
      return (
        // <AutorenewIcon
        //   className="SqlProcess__status-icon SqlProcess__status-icon--pending"
        // />
        <Icon className="SqlProcess__status-icon SqlProcess__status-icon--pending">cycle</Icon>
      );
    case "running":
      return (
        // <CircularProgress size={12} className="SqlProcess__status-icon--running" />
        <Icon className="SqlProcess__status-icon SqlProcess__status-icon--running">cycle</Icon>
      );
    case "completed":
      return (
        // <CheckCircleIcon
        //   className="SqlProcess__status-icon SqlProcess__status-icon--completed"
        // />
        <Icon className="SqlProcess__status-icon SqlProcess__status-icon--completed">check_circle</Icon>
      );
    case "error":
      return (
        // <CancelIcon
        //   className="SqlProcess__status-icon SqlProcess__status-icon--error"
        // />
        <Icon className="SqlProcess__status-icon SqlProcess__status-icon--error">error</Icon>
      );
    case "stopped":
      return (
        // <CancelIcon
        //   className="SqlProcess__status-icon SqlProcess__status-icon--stopped"
        // />
        <Icon className="SqlProcess__status-icon SqlProcess__status-icon--stopped">cancel</Icon>
      );
  }
}

// ============================================
// 화살표 SVG
// ============================================

function StepArrow({ status }: { status: ProcessStepData["status"] }) {
  const color =
    status === "completed"
      ? "#81ce5f"
      : status === "error"
        ? "#e86a75"
        : status === "stopped"
          ? "#f59e0b"
          : "#d0d0d0";
  return (
    <Box className="SqlProcess__arrow">
      <svg width="16" height="8" viewBox="0 0 16 8" fill="none">
        <path d="M0 4H14M14 4L10 0.5M14 4L10 7.5" stroke={color} strokeWidth="1.2" />
      </svg>
    </Box>
  );
}

// ============================================
// 단계 칩
// ============================================

function StepChip({ step }: { step: ProcessStepData }) {
  return (
    <FlexBox
      className={clsx(
        "SqlProcess__chip",
        step.status === "completed" && "SqlProcess__chip--completed",
        step.status === "error" && "SqlProcess__chip--error",
        step.status === "stopped" && "SqlProcess__chip--stopped",
      )}
    >
      <Typography className="SqlProcess__chip-label">
        {step.label}
      </Typography>
      <StepStatusIcon status={step.status} />
    </FlexBox>
  );
}

// ============================================
// 최종 상태 표시
// ============================================

function FinalStatusBadge({ steps }: { steps: ProcessStepData[] }) {
  const finalStatus = getFinalStatus(steps);
  if (finalStatus !== "completed" && finalStatus !== "error" && finalStatus !== "stopped") return null;

  if (finalStatus === "stopped") {
    return (
      <FlexBox className="SqlProcess__final-status">
        <CancelIcon className="SqlProcess__final-icon SqlProcess__final-icon--stopped" />
        <Typography className="SqlProcess__final-label SqlProcess__final-label--stopped">
          생성중지
        </Typography>
      </FlexBox>
    );
  }

  const isSuccess = finalStatus === "completed";
  return (
    <FlexBox className="SqlProcess__final-status">
      {isSuccess ? (
        // <CheckCircleIcon
        //   className="SqlProcess__final-icon SqlProcess__final-icon--success"
        // />
        <Icon className="SqlProcess__final-icon SqlProcess__final-icon--success">check_circle</Icon>
      ) : (
        // <CancelIcon
        //   className="SqlProcess__final-icon SqlProcess__final-icon--error"
        // />
        <Icon className="SqlProcess__final-icon SqlProcess__final-icon--error">error</Icon>
      )}
      <Typography
        className={clsx(
          "SqlProcess__final-label",
          isSuccess ? "SqlProcess__final-label--success" : "SqlProcess__final-label--error"
        )}
      >
        {isSuccess ? "생성성공" : "생성실패"}
      </Typography>
    </FlexBox>
  );
}

// ============================================
// PipelineBody — 본문 (진행률 + 단계칩/화살표 + 최종배지)
// 채팅답변/채팅이력에서 동일하게 사용
// ============================================

function PipelineBody({
  steps,
  showProgress,
  showFinalStatus,
}: {
  steps: ProcessStepData[];
  showProgress: boolean;
  showFinalStatus: boolean;
}) {
  const pct = getProgressPercent(steps);

  return (
    <Box className="SqlProcess__pipeline">
      {/* 진행률 표시 */}
      {showProgress && (
        <FlexBox className="SqlProcess__progress-group">
          <Typography className="SqlProcess__progress-label">
            SQL생성
          </Typography>
          <Box className="SqlProcess__percentage">
            {pct}%
          </Box>
        </FlexBox>
      )}

      {/* 단계 칩 + 화살표 */}
      {steps.map((step, idx) => (
        <FlexBox key={step.id} className="SqlProcess__step-group">
          <StepChip step={step} />
          {idx < steps.length - 1 && <StepArrow status={step.status} />}
        </FlexBox>
      ))}

      {/* 최종 상태 */}
      {showFinalStatus && <FinalStatusBadge steps={steps} />}
    </Box>
  );
}

// ============================================
// SqlProcessSteps
// ============================================

export function SqlProcessSteps({
  steps,
  defaultExpanded = true,
  headless = false,
  showProgress = true,
  showFinalStatus = true,
}: SqlProcessStepsProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const prevFinalStatusRef = useRef(getFinalStatus(steps));

  // SQL 생성 완료 시 자동 접기 (headless 모드에서는 무동작)
  useEffect(() => {
    if (headless) return;
    const prev = prevFinalStatusRef.current;
    const curr = getFinalStatus(steps);
    if (prev !== "completed" && curr === "completed") {
      setIsExpanded(false);
    }
    prevFinalStatusRef.current = curr;
  }, [steps, headless]);

  if (steps.length === 0) return null;

  // headless: 헤더/Collapse 없이 본문만. 외부 아코디언이 토글 담당
  if (headless) {
    return (
      <Box className="SqlProcess__section SqlProcess__section--headless">
        <PipelineBody steps={steps} showProgress={showProgress} showFinalStatus={showFinalStatus} />
      </Box>
    );
  }

  return (
    <Box className="SqlProcess__section">
      {/* 헤더 — 클릭으로 열고 닫기 */}
      <FlexBox
        className={clsx(
          "SqlProcess__header",
          isExpanded && "SqlProcess__header-expanded"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Typography className="SqlProcess__header-title">
          SQL 생성 과정
          <Typography
            component="span"
            className={clsx("SqlProcess__status-label", getStatusLabelModifier(steps))}
          >
            ({getStatusLabel(steps)})
          </Typography>
        </Typography>
        <IconButton size="small" className="SqlProcess__toggle-btn">
          {isExpanded ? (
            <ExpandLessIcon fontSize="small" />
          ) : (
            <ExpandMoreIcon fontSize="small" />
          )}
        </IconButton>
      </FlexBox>

      {/* 내용 — 가로 파이프라인 */}
      <Collapse in={isExpanded} timeout={300} mountOnEnter unmountOnExit>
        <PipelineBody steps={steps} showProgress={showProgress} showFinalStatus={showFinalStatus} />
      </Collapse>
    </Box>
  );
}
