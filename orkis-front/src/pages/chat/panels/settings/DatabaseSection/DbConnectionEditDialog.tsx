// ============================================
// DbConnectionEditDialog — DB 연결 수정 다이얼로그
// Design Layer: props 기반 (로직 없음)
// ============================================

import {
  Button,
  Chip,
  CircularProgress,
  FlexBox,
  Img,
  DeleteIcon,
  CloseIcon,
  SaveIcon,
} from "@/components";
import { Dialog } from "@/components";
import type { DbConnectionDetail, TestDbConnectionResponse } from "@/logic/common/db/types/dbConnection";
import { DbConnectionForm } from "./DbConnectionForm";
import type { DbConnectionFormData } from "@/logic/chat/panels/settings/useDbConnectionCrud";
import { getDbLogo, DEFAULT_DB_LOGO } from "@/logic/shared/utils/dbLogos";

// ============================================
// Props
// ============================================

export interface DbConnectionEditDialogProps {
  open: boolean;
  onClose: () => void;
  connection: DbConnectionDetail | null;
  formData: DbConnectionFormData;
  onFormChange: (field: string, value: string | File | null) => void;
  fieldErrors: Record<string, string>;
  testResult: TestDbConnectionResponse | null;
  testing: boolean;
  onTest: () => void;
  saving: boolean;
  loadingDetail: boolean;
  onUpdate: () => void;
  onDelete?: () => void;
}

// ============================================
// 읽기 전용 필드
// ============================================

const EDIT_READONLY_FIELDS = ["databaseName", "filePath", "dbTypeId"];

// ============================================
// DbConnectionEditDialog
// ============================================

export function DbConnectionEditDialog({
  open,
  onClose,
  connection,
  formData,
  onFormChange,
  fieldErrors,
  testResult,
  testing,
  onTest,
  saving,
  loadingDetail,
  onUpdate,
  onDelete,
}: DbConnectionEditDialogProps) {
  const footer = (
    <FlexBox justify="space-between" className="DbConnectionEditDialog__footer">
      <FlexBox>
        {onDelete && (
          <Button variant="text" color="error" onClick={onDelete}>
            <DeleteIcon fontSize="small" />
            삭제
          </Button>
        )}
      </FlexBox>
      <FlexBox className="DbConnectionEditDialog__footer-right">
        <Button
          variant="contained"
          disabled={saving}
          onClick={onUpdate}
        >
          <SaveIcon fontSize="small" />
          {saving ? "저장 중..." : "저장"}
        </Button>
        <Button variant="text" onClick={onClose}>
          <CloseIcon fontSize="small" />
          취소
        </Button>
      </FlexBox>
    </FlexBox>
  );

  return (
    <Dialog
      open={open}
      onClose={(_e, reason) => {
        if (reason === "backdropClick") return;
        onClose();
      }}
      title="데이터베이스 연결 수정"
      size="medium"
      footer={footer}
    >
      {loadingDetail ? (
        <FlexBox justify="center" align="center" className="DbConnectionEditDialog__loading">
          <CircularProgress size="medium" />
        </FlexBox>
      ) : connection ? (
        <FlexBox direction="column" className="DbConnectionEditDialog__body">
          <FlexBox align="center" className="DbConnectionEditDialog__type-info">
            <Chip
              icon={
                <Img
                  src={getDbLogo(connection.typeName)}
                  alt={connection.typeName || "DB"}
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_DB_LOGO;
                  }}
                  fit="contain"
                  className="DbConnectionEditDialog__type-logo"
                />
              }
              label={connection.typeName || "Unknown"}
              size="xsmall"
              variant="outlined"
              color="primary"
            />
          </FlexBox>
          <DbConnectionForm
            mode="edit"
            dbTypeName={connection.typeName || ""}
            formData={formData}
            onChange={onFormChange}
            fieldErrors={fieldErrors}
            testResult={testResult}
            testing={testing}
            onTest={onTest}
            readonlyFields={EDIT_READONLY_FIELDS}
          />
        </FlexBox>
      ) : null}
    </Dialog>
  );
}
