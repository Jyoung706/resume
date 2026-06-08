// ============================================
// DbConnectionWizard — 3-Step 등록 위자드
// Design Layer: props 기반 (로직 없음)
// ============================================

import {
  Button,
  FlexBox,
  Typography,
  ArrowForwardIcon,
  ArrowBackIcon,
  CheckIcon,
  SaveIcon,
  CloseIcon,
  Icon
} from "@/components";
import { Dialog, ConfirmModal } from "@/components";
import type { DbConnection, DbType, RagReadiness, TestDbConnectionResponse } from "@/logic/common/db/types/dbConnection";
import { DbTypeSelection } from "./DbTypeSelection";
import { DbConnectionForm } from "./DbConnectionForm";
import type { DbConnectionFormData } from "@/logic/chat/panels/settings/useDbConnectionCrud";

// ============================================
// Props
// ============================================

export interface DbConnectionWizardProps {
  open: boolean;
  onClose: () => void;
  step: number;
  onSetStep: (step: number) => void;

  // Step 1
  dbTypes: DbType[];
  loadingDbTypes: boolean;
  selectedDbType: DbType | null;
  onSelectDbType: (dbType: DbType) => void;

  // Step 2
  formData: DbConnectionFormData;
  onFormChange: (field: string, value: string | File | null) => void;
  fieldErrors: Record<string, string>;
  testResult: TestDbConnectionResponse | null;
  testing: boolean;
  onTest: () => void;
  saving: boolean;
  onSave: () => void;

  // Step 2 — SQLite 생성
  onCreateSqlite: () => void;
  sqliteCreating: boolean;
  sqliteCreated: boolean;

  // Step 3
  createdConnection: DbConnection | null;
  onViewSchema?: () => void;

  // Step 3 — RAG 준비 상태
  ragReadiness?: RagReadiness;

  // Step 3 — RAG 전처리
  ragConfirmOpen?: boolean;
  existingRagInfo?: { connectionName: string; databaseName: string; lastUpdated?: string } | null;
  onComplete?: () => void;
  onRagConfirm?: () => void;
  onRagSkip?: () => void;
  isSampleDb?: boolean;
}

// ============================================
// RAG 메시지 생성
// ============================================

function buildRagMessage(
  isSampleDb: boolean,
  existingRagInfo: DbConnectionWizardProps["existingRagInfo"],
  connectionName?: string,
): string {
  if (isSampleDb && existingRagInfo) {
    return (
      `[기존 RAG 서버 대체 안내]\n\n` +
      `사용자당 1개의 RAG 서버만 설정 가능합니다.\n\n` +
      `[기존 RAG 서버 - 삭제 예정]\n` +
      `- DB: ${existingRagInfo.connectionName} (${existingRagInfo.databaseName})\n` +
      `- 마지막 업데이트: ${existingRagInfo.lastUpdated ? new Date(existingRagInfo.lastUpdated).toLocaleString("ko-KR") : "N/A"}\n\n` +
      `[새로운 RAG 서버]\n` +
      `- DB: ${connectionName || "샘플 데이터베이스"}\n` +
      `- 상태: 샘플 DB (전처리 완료, 즉시 사용 가능)\n\n` +
      `'대체'를 클릭하면 기존 RAG 데이터가 삭제되고 새 DB가 활성화됩니다.`
    );
  }
  if (isSampleDb) {
    return (
      `[새 RAG 서버 설정]\n\n` +
      `현재 설정된 RAG 서버가 없습니다.\n\n` +
      `[새로운 RAG 서버]\n` +
      `- DB: ${connectionName || "샘플 데이터베이스"}\n` +
      `- 상태: 샘플 DB (전처리 완료, 즉시 사용 가능)\n\n` +
      `'실행'을 클릭하면 이 데이터베이스로 대화를 시작할 수 있습니다.`
    );
  }
  if (existingRagInfo) {
    return (
      `[기존 RAG 서버 대체 안내]\n\n` +
      `사용자당 1개의 RAG 서버만 설정 가능합니다.\n\n` +
      `[기존 RAG 서버 - 삭제 예정]\n` +
      `- DB: ${existingRagInfo.connectionName} (${existingRagInfo.databaseName})\n` +
      `- 마지막 업데이트: ${existingRagInfo.lastUpdated ? new Date(existingRagInfo.lastUpdated).toLocaleString("ko-KR") : "N/A"}\n\n` +
      `[새로운 RAG 서버]\n` +
      `- DB: ${connectionName || "데이터베이스"}\n` +
      `- 상태: Schema + Data 전처리 진행 예정\n\n` +
      `'대체'를 클릭하면 기존 RAG 데이터가 삭제되고 새 DB의 전처리가 시작됩니다.\n` +
      `(전처리 완료까지 시간이 소요될 수 있습니다)`
    );
  }
  return (
    `[새 RAG 서버 설정]\n\n` +
    `현재 설정된 RAG 서버가 없습니다.\n\n` +
    `[새로운 RAG 서버]\n` +
    `- DB: ${connectionName || "데이터베이스"}\n` +
    `- 상태: Schema + Data 전처리 진행 예정\n\n` +
    `'실행'을 클릭하면 데이터베이스 전처리가 시작됩니다.\n` +
    `전처리 완료 후 이 데이터베이스로 대화를 시작할 수 있습니다.\n` +
    `(전처리 완료까지 시간이 소요될 수 있습니다)`
  );
}

// ============================================
// Step 제목
// ============================================

const STEP_TITLES: Record<number, string> = {
  1: "Step 1: DB 타입 선택",
  2: "Step 2: 연결 정보 입력",
  3: "Step 3: 등록 완료",
};

// ============================================
// DbConnectionWizard
// ============================================

export function DbConnectionWizard({
  open,
  onClose,
  step,
  onSetStep,
  dbTypes,
  loadingDbTypes,
  selectedDbType,
  onSelectDbType,
  formData,
  onFormChange,
  fieldErrors,
  testResult,
  testing,
  onTest,
  saving,
  onSave,
  onCreateSqlite,
  sqliteCreating,
  sqliteCreated,
  createdConnection,
  onViewSchema,
  ragReadiness,
  ragConfirmOpen,
  existingRagInfo,
  onComplete,
  onRagConfirm,
  onRagSkip,
  isSampleDb,
}: DbConnectionWizardProps) {
  // 접속 테스트 필수 — 모든 DB 타입 동일
  const canSave = testResult?.success === true;

  const footer = (
    <FlexBox justify="flex-end" className="DbConnectionWizard__footer">
      {step === 1 && (
        <>
          <Button
            variant="contained"
            disabled={!selectedDbType}
            onClick={() => onSetStep(2)}
          >
            <ArrowForwardIcon fontSize="small" />
            다음
          </Button>
          <Button variant="text" onClick={onClose}>
            <CloseIcon fontSize="small" />
            취소
          </Button>
        </>
      )}
      {step === 2 && (
        <>
          <Button variant="contained" onClick={() => onSetStep(1)}>
            <ArrowBackIcon fontSize="small" />
            이전
          </Button>
          <Button
            variant="contained"
            disabled={!canSave || saving}
            onClick={onSave}
          >
            <SaveIcon fontSize="small" />
            {saving ? "저장 중..." : "저장"}
          </Button>
        </>
      )}
      {step === 3 && (
        <Button
          variant="contained"
          onClick={onComplete || onClose}
          disabled={ragReadiness?.canPreprocess === false}
        >
          <CheckIcon fontSize="small" />
          완료
        </Button>
      )}
    </FlexBox>
  );

  return (
    <>
      <Dialog
        open={open}
        onClose={(_e, reason) => {
          if (reason === "backdropClick") return;
          onClose();
        }}
        title="데이터베이스 연결 추가"
        subtitle={STEP_TITLES[step]}
        size="xlarge"
        footer={footer}
      >
        {/* Step 1: DB 타입 선택 */}
        {step === 1 && (
          <DbTypeSelection
            dbTypes={dbTypes}
            selectedTypeId={selectedDbType?.dbTypeId ?? null}
            onChange={onSelectDbType}
            loading={loadingDbTypes}
          />
        )}

        {/* Step 2: 연결 정보 입력 */}
        {step === 2 && selectedDbType && (
          <DbConnectionForm
            mode="create"
            dbTypeName={selectedDbType.typeName}
            formData={formData}
            onChange={onFormChange}
            fieldErrors={fieldErrors}
            testResult={testResult}
            testing={testing}
            onTest={onTest}
            onCreateSqlite={onCreateSqlite}
            sqliteCreating={sqliteCreating}
            sqliteCreated={sqliteCreated}
          />
        )}

        {/* Step 3: 등록 완료 */}
        {step === 3 && createdConnection && (
          <FlexBox direction="column" align="center" className="DbConnectionWizard__complete">
            <Icon color="success" className="DbConnectionWizard__complete-icon">check_circle</Icon>
            <Typography className="DbConnectionWizard__complete-title">
              데이터베이스 연결이 추가되었습니다
            </Typography>

            <FlexBox direction="column" className="DbConnectionWizard__summary">
              <FlexBox className="DbConnectionWizard__summary-row">
                <Typography className="DbConnectionWizard__summary-label">연결 이름</Typography>
                <Typography className="DbConnectionWizard__summary-value">
                  {createdConnection.connectionName}
                </Typography>
              </FlexBox>
              <FlexBox className="DbConnectionWizard__summary-row">
                <Typography className="DbConnectionWizard__summary-label">DB 타입</Typography>
                <Typography className="DbConnectionWizard__summary-value">
                  {createdConnection.typeName || createdConnection.dbTypeId}
                </Typography>
              </FlexBox>
              {createdConnection.databaseName && (
                <FlexBox className="DbConnectionWizard__summary-row">
                  <Typography className="DbConnectionWizard__summary-label">데이터베이스</Typography>
                  <Typography className="DbConnectionWizard__summary-value">
                    {createdConnection.databaseName}
                  </Typography>
                </FlexBox>
              )}
              {createdConnection.host && (
                <FlexBox className="DbConnectionWizard__summary-row">
                  <Typography className="DbConnectionWizard__summary-label">호스트</Typography>
                  <Typography className="DbConnectionWizard__summary-value">
                    {createdConnection.host}
                    {createdConnection.port ? `:${createdConnection.port}` : ""}
                  </Typography>
                </FlexBox>
              )}
            </FlexBox>

            {/* RAG 모델 미등록 경고 */}
            {ragReadiness?.canPreprocess === false && (
              <Typography className="DbConnectionWizard__model-warning">
                RAG 인덱싱을 하려면 LLM 모델을 먼저 등록하세요.
              </Typography>
            )}

            {/* 스키마 관리 버튼 */}
            {onViewSchema && (
              <Button
                variant="outlined"
                size="small"
                onClick={onViewSchema}
                className="DbConnectionWizard__schema-btn"
              >
                <Icon size="small">network_node</Icon>
                스키마 관리
              </Button>
            )}
          </FlexBox>
        )}
      </Dialog>

      {/* RAG 전처리 확인 다이얼로그 */}
      <ConfirmModal
        open={ragConfirmOpen ?? false}
        onClose={onRagSkip || onClose}
        title="RAG 서버 설정"
        message={buildRagMessage(
          isSampleDb ?? false,
          existingRagInfo ?? null,
          createdConnection?.connectionName || createdConnection?.databaseName,
        )}
        confirmText={existingRagInfo ? "대체" : "실행"}
        cancelText="건너뛰기"
        confirmColor={existingRagInfo ? "warning" : "primary"}
        onConfirm={onRagConfirm || onClose}
      />
    </>
  );
}
