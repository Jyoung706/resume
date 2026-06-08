// ============================================
// RagSection — RAG 전처리 상태 표시
// Design Layer: props 기반 (로직 없음)
//
// 우선순위 단일 상태 표시:
//   1) dbConnections.length === 0 → "등록된 DB 없음" 만
//   2) hasAnyModel === false       → 드롭다운 + LLM 경고
//   3) selectedDbId == null        → 드롭다운 + "DB 선택하세요" placeholder
//   4) 정상                         → 드롭다운 + 전체 실행 + 카드 + 하단 경고
// ============================================

import { Button, FlexBox, FormControl, MenuItem, Select, Typography, Icon } from "@/components";
import type {
  DbConnection,
  RagPreprocessingHistory,
  OverallRagStatus,
} from "@/logic/common/db/types/dbConnection";
import { RAG_TYPE, type RagTypeValue } from "./displayUtils";
import { RagStatusCard } from "./RagStatusCard";

// ============================================
// Props
// ============================================

export interface RagSectionProps {
  /** DB 연결 목록 (RAG 드롭다운용) */
  dbConnections: DbConnection[];
  /** 선택된 DB ID */
  selectedDbId: number | null;
  /** DB 선택 변경 핸들러 */
  onDbChange: (id: number | null) => void;
  /** 선택된 DB의 RAG 히스토리 */
  ragHistory?: RagPreprocessingHistory[];
  /** RAG 전처리 완료된 DB ID 목록 (✅ 표시용) */
  ragCompletedDbIds?: number[];

  // ── 실행 버튼 (STEP D에서 활용) ──
  /** 전체 실행 핸들러 (없으면 버튼 미표시) */
  onRunAll?: () => void;
  /** 개별 실행 핸들러 (없으면 카드에 실행 버튼 미표시) */
  onRunSingle?: (ragType: RagTypeValue) => void;
  /** 실행 중 여부 (true이면 모든 실행 버튼 disabled) */
  isExecuting?: boolean;
  /** 종합 RAG 상태 (processing/pending 시 실행 버튼 비활성화) */
  overallStatus?: OverallRagStatus;
  /** 스키마 에러 메시지 */
  schemaErrorMessage?: string;
  /** 데이터 에러 메시지 */
  dataErrorMessage?: string;
  /** LLM 모델 등록 여부 (false이면 RAG 실행 차단) */
  hasAnyModel?: boolean;
}

// ============================================
// RagSection
// ============================================

export function RagSection({
  dbConnections,
  selectedDbId,
  onDbChange,
  ragHistory = [],
  ragCompletedDbIds = [],
  onRunAll,
  onRunSingle,
  isExecuting,
  overallStatus,
  schemaErrorMessage,
  dataErrorMessage,
  hasAnyModel,
}: RagSectionProps) {
  const schemaHistory = ragHistory.find((h) => h.ragType === RAG_TYPE.SCHEMA);
  const dataHistory = ragHistory.find((h) => h.ragType === RAG_TYPE.DATA);

  // ── 1순위: 등록된 DB 없음 ─────────────────────
  if (dbConnections.length === 0) {
    return (
      <FlexBox direction="column" className="RagSection">
        <FlexBox className="Panel__placeholder">
          <Typography className="Panel__placeholder-text">
            등록된 데이터베이스가 없습니다
          </Typography>
        </FlexBox>
      </FlexBox>
    );
  }

  // ── 드롭다운 (2~4순위 공통) ──────────────────
  const dropdown = (
    <FormControl fullWidth size="small" className="RagSection__db-select">
      <Select
        value={selectedDbId ?? ""}
        onChange={(e) => {
          const val = e.target.value;
          onDbChange(val === "" ? null : Number(val));
        }}
        displayEmpty
        MenuProps={{
          sx: { zIndex: "calc(var(--mui-zIndex-modal) + 2)" },
        }}
      >
        <MenuItem value="">
          <Typography className="RagSection__placeholder-option">
            DB를 선택하세요
          </Typography>
        </MenuItem>
        {dbConnections.map((conn) => {
          const isCompleted = ragCompletedDbIds.includes(conn.connectionId);
          return (
            <MenuItem key={conn.connectionId} value={conn.connectionId}>
              {isCompleted ? "✅ " : ""}
              {conn.connectionName}
              {conn.typeName ? ` (${conn.typeName})` : ""}
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  );

  // ── 2순위: LLM 모델 미등록 ────────────────────
  if (hasAnyModel === false) {
    return (
      <FlexBox direction="column" className="RagSection">
        {dropdown}
        <Typography className="RagSection__model-warning">
          LLM 모델을 등록해야 RAG 인덱싱을 실행할 수 있습니다
        </Typography>
      </FlexBox>
    );
  }

  // ── 3순위: DB 미선택 ─────────────────────────
  if (selectedDbId == null) {
    return (
      <FlexBox direction="column" className="RagSection">
        {dropdown}
        <FlexBox className="Panel__placeholder">
          <Typography className="Panel__placeholder-text">
            DB를 선택하면 RAG 전처리 상태를 확인할 수 있습니다
          </Typography>
        </FlexBox>
      </FlexBox>
    );
  }

  // ── 4순위: 정상 (DB 선택 + 모델 등록됨) ───────
  const isRunDisabled =
    isExecuting ||
    overallStatus === "processing" ||
    overallStatus === "pending";

  return (
    <FlexBox direction="column" className="RagSection">
      {dropdown}

      {/* 전체 실행 버튼 */}
      {onRunAll && (
        <FlexBox className="RagSection__run-all">
          <Button
            size="small"
            variant="contained"
            color="primary"
            className="RagSection__run-all-btn"
            onClick={onRunAll}
            disabled={isRunDisabled}
          >
            {isExecuting ? "실행 중..." : "전체 실행"}
          </Button>
        </FlexBox>
      )}

      {/* 상태 카드 2-컬럼 */}
      <FlexBox className="RagSection__cards">
        <RagStatusCard
          label="스키마"
          status={schemaHistory?.status}
          updatedAt={schemaHistory?.updatedAt}
          onRun={onRunSingle ? () => onRunSingle(RAG_TYPE.SCHEMA) : undefined}
          isRunning={isRunDisabled}
          errorMessage={schemaErrorMessage}
        />
        <RagStatusCard
          label="데이터"
          status={dataHistory?.status}
          updatedAt={dataHistory?.updatedAt}
          onRun={onRunSingle ? () => onRunSingle(RAG_TYPE.DATA) : undefined}
          isRunning={isRunDisabled}
          errorMessage={dataErrorMessage}
        />
      </FlexBox>

      {/* 하단 경고 — READY 상태에서만 표시 */}
      <Typography className="RagSection__warning">
        <Icon size="small">warning</Icon>전처리가 계속 실패하면 고객센터에 문의하세요!
      </Typography>
    </FlexBox>
  );
}
