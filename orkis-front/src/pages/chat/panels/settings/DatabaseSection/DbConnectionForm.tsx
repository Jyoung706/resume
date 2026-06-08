// ============================================
// DbConnectionForm — DB 연결 정보 입력 폼
// Design Layer: props 기반 (로직 없음)
// 위자드 Step 2 / 수정 다이얼로그 공용
// ============================================

import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  FlexBox,
  Input,
  Typography,
  CheckIcon,
  Icon,
} from "@/components";
import { FormField, PasswordInput, RadioButtonGroup } from "@/components";
import type { TestDbConnectionResponse } from "@/logic/common/db/types/dbConnection";

// ============================================
// Props
// ============================================

export interface DbConnectionFormProps {
  mode: "create" | "edit";
  dbTypeName: string;
  formData: {
    connectionName: string;
    description: string;
    host: string;
    port: string;
    username: string;
    password: string;
    databaseName: string;
    filePath: string;
    sqliteOption: string;
    sqliteFile: File | null;
  };
  onChange: (field: string, value: string | File | null) => void;
  fieldErrors: Record<string, string>;
  testResult: TestDbConnectionResponse | null;
  testing: boolean;
  onTest: () => void;
  readonlyFields?: string[];
  /** SQLite DB 생성/업로드 핸들러 (create 모드 전용) */
  onCreateSqlite?: () => void;
  /** SQLite 생성/업로드 진행 중 */
  sqliteCreating?: boolean;
  /** SQLite 생성/업로드 완료 여부 */
  sqliteCreated?: boolean;
}

// ============================================
// SQLite 옵션
// ============================================

const SQLITE_OPTIONS = [
  { label: "샘플 DB", value: "sample" },
  { label: "새로 생성", value: "create" },
  { label: "파일 업로드", value: "upload" },
];

const SQLITE_ACTION_LABELS: Record<string, string> = {
  sample: "샘플 DB 생성",
  create: "DB 생성",
  upload: "파일 업로드",
};

// ============================================
// 헬퍼
// ============================================

function isReadonly(field: string, readonlyFields?: string[]): boolean {
  return readonlyFields?.includes(field) ?? false;
}

function isSqlite(typeName: string): boolean {
  return typeName.toLowerCase() === "sqlite";
}

// ============================================
// DbConnectionForm
// ============================================

export function DbConnectionForm({
  mode,
  dbTypeName,
  formData,
  onChange,
  fieldErrors,
  testResult,
  testing,
  onTest,
  readonlyFields,
  onCreateSqlite,
  sqliteCreating,
  sqliteCreated,
}: DbConnectionFormProps) {
  const sqlite = isSqlite(dbTypeName);

  // SQLite create 모드: 생성 후 폼 필드 잠금
  const sqliteFieldsLocked = sqlite && mode === "create" && sqliteCreated === true;

  // 접속 테스트 버튼 활성화 조건
  // - 네트워크 DB: 항상 가능
  // - SQLite create 모드: DB 생성 후에만 가능
  // - SQLite edit 모드: 항상 가능
  const canTest = sqlite && mode === "create" ? sqliteCreated === true : true;

  return (
    <FlexBox direction="column" className="DbConnectionForm">
      {/* 연결 이름 */}
      <FormField label="연결 이름" required error={fieldErrors.connectionName}>
        <Input
          value={formData.connectionName}
          onChange={(e) => onChange("connectionName", e.target.value)}
          placeholder="연결 이름 입력"
          size="small"
          fullWidth
          disabled={isReadonly("connectionName", readonlyFields) || sqliteFieldsLocked}
        />
      </FormField>

      {/* 설명 */}
      <FormField label="설명">
        <Input
          value={formData.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="설명 (선택)"
          size="small"
          fullWidth
          disabled={sqliteFieldsLocked}
        />
      </FormField>

      {/* ── 네트워크 DB 필드 ── */}
      {!sqlite && (
        <>
          <FormField label="호스트/IP" required error={fieldErrors.host}>
            <Input
              value={formData.host}
              onChange={(e) => onChange("host", e.target.value)}
              placeholder="localhost"
              size="small"
              fullWidth
              disabled={isReadonly("host", readonlyFields)}
            />
          </FormField>

          <FormField label="포트" required error={fieldErrors.port}>
            <Input
              value={formData.port}
              onChange={(e) => onChange("port", e.target.value)}
              placeholder="5432"
              size="small"
              fullWidth
              type="number"
              disabled={isReadonly("port", readonlyFields)}
            />
          </FormField>

          <FormField label="사용자명" required error={fieldErrors.username}>
            <Input
              value={formData.username}
              onChange={(e) => onChange("username", e.target.value)}
              placeholder="사용자명"
              size="small"
              fullWidth
              disabled={isReadonly("username", readonlyFields)}
            />
          </FormField>

          <FormField
            label="비밀번호"
            required={mode === "create"}
            error={fieldErrors.password}
            helpText={mode === "edit" ? "비워두면 기존 비밀번호가 유지됩니다" : undefined}
          >
            <PasswordInput
              value={formData.password}
              onChange={(e) => onChange("password", e.target.value)}
              placeholder={mode === "edit" ? "변경 시 입력" : "비밀번호"}
              size="small"
              fullWidth
            />
          </FormField>

          <FormField
            label="데이터베이스"
            required
            error={fieldErrors.databaseName}
          >
            <Input
              value={formData.databaseName}
              onChange={(e) => onChange("databaseName", e.target.value)}
              placeholder="데이터베이스 이름"
              size="small"
              fullWidth
              disabled={isReadonly("databaseName", readonlyFields)}
            />
          </FormField>
        </>
      )}

      {/* ── SQLite 필드 (create 모드) ── */}
      {sqlite && mode === "create" && (
        <>
          <FormField label="SQLite 옵션" required>
            <RadioButtonGroup
              options={SQLITE_OPTIONS}
              value={formData.sqliteOption}
              onChange={(e) => onChange("sqliteOption", e.target.value)}
              row
              disabled={sqliteFieldsLocked}
            />
          </FormField>

          {formData.sqliteOption === "create" && (
            <FormField
              label="데이터베이스"
              required
              error={fieldErrors.databaseName}
            >
              <Input
                value={formData.databaseName}
                onChange={(e) => onChange("databaseName", e.target.value)}
                placeholder="데이터베이스 이름"
                size="small"
                fullWidth
                disabled={sqliteFieldsLocked}
              />
            </FormField>
          )}

          {formData.sqliteOption === "upload" && (
            <>
              <FormField
                label="데이터베이스"
                required
                error={fieldErrors.databaseName}
              >
                <Input
                  value={formData.databaseName}
                  onChange={(e) => onChange("databaseName", e.target.value)}
                  placeholder="데이터베이스 이름"
                  size="small"
                  fullWidth
                  disabled={sqliteFieldsLocked}
                />
              </FormField>
              <FormField label="파일" required error={fieldErrors.sqliteFile}>
                <input
                  type="file"
                  accept=".db,.sqlite,.sqlite3"
                  disabled={sqliteFieldsLocked}
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    onChange("sqliteFile", file);
                    if (file) {
                      onChange("databaseName", file.name.replace(/\.(db|sqlite|sqlite3)$/i, ""));
                    }
                  }}
                />
              </FormField>
            </>
          )}

          {/* SQLite 생성/업로드 액션 */}
          {onCreateSqlite && (
            <FlexBox align="center" gap={2}>
              {sqliteCreated ? (
                <Chip
                  icon={<CheckIcon fontSize="xsmall" />}
                  label="생성 완료"
                  color="success"
                  size="xsmall"
                  variant="outlined"
                />
              ) : (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={onCreateSqlite}
                  disabled={sqliteCreating}
                >
                  {sqliteCreating ? (
                    <CircularProgress size="xsmall" />
                  ) : (
                    SQLITE_ACTION_LABELS[formData.sqliteOption] || "DB 생성"
                  )}
                </Button>
              )}
            </FlexBox>
          )}
        </>
      )}

      {/* ── SQLite 필드 (edit 모드) ── */}
      {sqlite && mode === "edit" && (
        <FormField label="데이터베이스">
          <Input
            value={formData.databaseName}
            size="small"
            fullWidth
            disabled
          />
        </FormField>
      )}

      {/* ── 접속 테스트 ── */}
      <FlexBox direction="column" className="DbConnectionForm__test-area">
        <Button
          variant="contained"
          size="small"
          color="primary"
          onClick={onTest}
          disabled={testing || !canTest}
          className="DbConnectionForm__test-btn"
        >
          {testing ? <CircularProgress size="xsmall" /> : "접속 테스트"}
        </Button>

        {testResult && (
          <Alert
            severity={testResult.success ? "success" : "error"}
            icon={testResult.success ? <Icon size="xsmall">check_circle</Icon> : <Icon size="xsmall">error</Icon>}
            className="DbConnectionForm__test-result"
          >
            <Typography className="DbConnectionForm__test-message">
              {testResult.message}
            </Typography>
            {testResult.serverVersion && (
              <Typography className="DbConnectionForm__test-version">
                서버 버전: {testResult.serverVersion}
              </Typography>
            )}
          </Alert>
        )}
      </FlexBox>
    </FlexBox>
  );
}
