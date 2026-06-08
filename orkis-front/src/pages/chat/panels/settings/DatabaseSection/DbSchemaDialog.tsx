// ============================================
// DbSchemaDialog — DB 스키마 조회/관리 다이얼로그
// Design Layer: props 기반 (로직 없음)
// ============================================

import { useState } from "react";
import {
  Accordion,
  ActionMenu,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  ConfirmModal,
  FlexBox,
  FormControlLabel,
  FormField,
  Dialog,
  Icon,
  AddIcon,
  CreateIcon,
  IconButton,
  Input,
  MenuItem,
  SearchInput,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  CloseIcon,
  SaveIcon
} from "@/components";
import type {
  DbSchemaTable,
  DbSchemaColumn,
  CreateTableColumn,
} from "@/logic/common/db/types/dbSchema";
import "./DbSchemaDialog.scss";

// ============================================
// Props
// ============================================

export interface DbSchemaDialogProps {
  // ── 메인 다이얼로그 ──
  open: boolean;
  onClose: () => void;
  connectionName: string;
  databaseName: string;
  dbTypeName: string;
  loading: boolean;
  error: string | null;
  tables: DbSchemaTable[];
  selectedTable: DbSchemaTable | null;
  columns: DbSchemaColumn[];
  sampleData: Array<Record<string, unknown>>;
  totalRows: number;
  detailLoading: boolean;
  tableSearchTerm: string;
  columnSearchTerm: string;
  onTableClick: (table: DbSchemaTable) => void;
  onTableSearchChange: (term: string) => void;
  onColumnSearchChange: (term: string) => void;

  // ── 테이블 추가 ──
  addTableOpen: boolean;
  newTableName: string;
  newTableComment: string;
  newTableColumns: CreateTableColumn[];
  addTableSaving: boolean;
  onOpenAddTable: () => void;
  onCloseAddTable: () => void;
  onSetNewTableName: (name: string) => void;
  onSetNewTableComment: (comment: string) => void;
  onAddNewTableColumn: () => void;
  onRemoveNewTableColumn: (idx: number) => void;
  onUpdateNewTableColumn: (idx: number, field: keyof CreateTableColumn, value: string | boolean) => void;
  onAddTable: () => void;

  // ── 테이블 수정 ──
  editTableOpen: boolean;
  editTableName: string;
  editTableSaving: boolean;
  onOpenEditTable: (table: DbSchemaTable) => void;
  onCloseEditTable: () => void;
  onSetEditTableName: (name: string) => void;
  onEditTable: () => void;

  // ── 테이블 삭제 ──
  deleteTableOpen: boolean;
  deleteTableName: string;
  deleteTableDeleting: boolean;
  onOpenDeleteTable: (table: DbSchemaTable) => void;
  onCloseDeleteTable: () => void;
  onDeleteTable: () => void;

  // ── 컬럼 추가 ──
  addColumnOpen: boolean;
  newColumnName: string;
  newColumnDataType: string;
  newColumnIsNullable: boolean;
  newColumnIsPrimaryKey: boolean;
  newColumnDefaultValue: string;
  newColumnComment: string;
  addColumnSaving: boolean;
  onOpenAddColumn: () => void;
  onCloseAddColumn: () => void;
  onSetNewColumnName: (name: string) => void;
  onSetNewColumnDataType: (type: string) => void;
  onSetNewColumnIsNullable: (v: boolean) => void;
  onSetNewColumnIsPrimaryKey: (v: boolean) => void;
  onSetNewColumnDefaultValue: (v: string) => void;
  onSetNewColumnComment: (v: string) => void;
  onAddColumn: () => void;

  // ── 컬럼 수정 ──
  editColumnOpen: boolean;
  editColumnName: string;
  editColumnSaving: boolean;
  onOpenEditColumn: (col: DbSchemaColumn) => void;
  onCloseEditColumn: () => void;
  onSetEditColumnName: (name: string) => void;
  onEditColumn: () => void;

  // ── 컬럼 삭제 ──
  deleteColumnOpen: boolean;
  deleteColumnName: string;
  deleteColumnDeleting: boolean;
  onOpenDeleteColumn: (col: DbSchemaColumn) => void;
  onCloseDeleteColumn: () => void;
  onDeleteColumn: () => void;

  // ── 데이터 삽입 ──
  insertDataOpen: boolean;
  insertDataValues: Record<string, string>;
  insertDataSaving: boolean;
  onOpenInsertData: () => void;
  onCloseInsertData: () => void;
  onSetInsertDataValue: (columnName: string, value: string) => void;
  onInsertData: () => void;
}

// ============================================
// 상수
// ============================================

const DATA_TYPES = ["TEXT", "INTEGER", "REAL", "BLOB", "NUMERIC"];

// ============================================
// DbSchemaDialog
// ============================================

export function DbSchemaDialog(props: DbSchemaDialogProps) {
  const {
    open, onClose,
    connectionName, databaseName, dbTypeName,
    loading, error,
    tables, selectedTable, columns, sampleData, totalRows, detailLoading,
    tableSearchTerm, columnSearchTerm,
    onTableClick, onTableSearchChange, onColumnSearchChange,
  } = props;

  const isSqlite = dbTypeName?.toLowerCase() === "sqlite";

  // 아코디언 상태 (UI 전용)
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "db-info", "tables", "columns", "data-preview",
  ]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  // 검색 필터
  const filteredTables = tableSearchTerm
    ? tables.filter((t) => t.tableName.toLowerCase().includes(tableSearchTerm.toLowerCase()))
    : tables;

  const filteredColumns = columnSearchTerm
    ? columns.filter((c) => c.columnName.toLowerCase().includes(columnSearchTerm.toLowerCase()))
    : columns;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title="스키마 관리"
        size="xlarge"
        className="DbSchemaDialog"
      >
        {loading ? (
          <FlexBox justify="center" align="center" className="DbSchema__loading">
            <CircularProgress size={32} />
          </FlexBox>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <FlexBox direction="column" className="DbSchema__content">
            {/* ── DB 정보 ── */}
            <Accordion
              id="db-info"
              title="데이터베이스 정보"
              className="DbSchema__accordion"
              expanded={expandedSections.includes("db-info")}
              onChange={toggleSection}
            >
              <FlexBox direction="column" className="DbSchema__info">
                <FlexBox className="DbSchema__info-row">
                  <Typography className="DbSchema__info-label">연결 이름</Typography>
                  <Typography className="DbSchema__info-value">{connectionName}</Typography>
                </FlexBox>
                <FlexBox className="DbSchema__info-row">
                  <Typography className="DbSchema__info-label">데이터베이스</Typography>
                  <Typography className="DbSchema__info-value">{databaseName}</Typography>
                </FlexBox>
                <FlexBox className="DbSchema__info-row">
                  <Typography className="DbSchema__info-label">테이블 수</Typography>
                  <Typography className="DbSchema__info-value">{tables.length}</Typography>
                </FlexBox>
              </FlexBox>
            </Accordion>

            {/* ── 테이블 목록 ── */}
            <Accordion
              id="tables"
              title={`테이블 목록${selectedTable ? ` — ${selectedTable.tableName}` : ""}`}
              className="DbSchema__accordion"
              expanded={expandedSections.includes("tables")}
              onChange={toggleSection}
            >
              <FlexBox direction="column" className="DbSchema__section">
                <FlexBox align="center" className="DbSchema__toolbar">
                  <SearchInput
                    value={tableSearchTerm}
                    onChange={(e) => onTableSearchChange((e.target as HTMLInputElement).value)}
                    onClear={() => onTableSearchChange("")}
                    placeholder="테이블 검색..."
                    size="small"
                    className="DbSchema__search"
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Icon mui>AddIcon</Icon>}
                    onClick={props.onOpenAddTable}
                  >
                    테이블 추가
                  </Button>
                </FlexBox>

                {filteredTables.length === 0 ? (
                  <Typography className="DbSchema__empty">
                    {tableSearchTerm ? "검색 결과가 없습니다." : "테이블이 없습니다."}
                  </Typography>
                ) : (
                  <Box className="DbSchema__table-wrap">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>테이블 이름</TableCell>
                          <TableCell>타입</TableCell>
                          {!isSqlite && <TableCell>설명</TableCell>}
                          <TableCell align="right" className="DbSchema__action-cell" />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredTables.map((table) => (
                          <TableRow
                            key={table.tableName}
                            hover
                            selected={selectedTable?.tableName === table.tableName}
                            onClick={() => onTableClick(table)}
                            className="DbSchema__clickable-row"
                          >
                            <TableCell>
                              <Typography className="DbSchema__table-name">
                                {table.tableName}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {table.tableType && (
                                <Chip
                                  label={table.tableType}
                                  size="xsmall"
                                  variant="outlined"
                                  className="DbSchema__type-chip"
                                />
                              )}
                            </TableCell>
                            {!isSqlite && (
                              <TableCell>
                                <Typography className="DbSchema__comment" noWrap>
                                  {table.tableComment || "—"}
                                </Typography>
                              </TableCell>
                            )}
                            <TableCell align="right">
                              <ActionMenu
                                items={[
                                  { label: "수정", icon: <Icon mui size="small">EditIcon</Icon>, onClick: () => props.onOpenEditTable(table) },
                                  { label: "삭제", icon: <Icon mui size="small">DeleteIcon</Icon>, onClick: () => props.onOpenDeleteTable(table), danger: true },
                                ]}
                                stopPropagation
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                )}
              </FlexBox>
            </Accordion>

            {/* ── 컬럼 목록 ── */}
            <Accordion
              id="columns"
              title={`컬럼 목록${selectedTable ? ` (${columns.length})` : ""}`}
              className="DbSchema__accordion"
              expanded={expandedSections.includes("columns")}
              onChange={toggleSection}
              disabled={!selectedTable}
            >
              {detailLoading ? (
                <FlexBox justify="center" className="DbSchema__loading-sm">
                  <CircularProgress size="medium" />
                </FlexBox>
              ) : (
                <FlexBox direction="column" className="DbSchema__section">
                  <FlexBox align="center" className="DbSchema__toolbar">
                    <SearchInput
                      value={columnSearchTerm}
                      onChange={(e) => onColumnSearchChange((e.target as HTMLInputElement).value)}
                      onClear={() => onColumnSearchChange("")}
                      placeholder="컬럼 검색..."
                      size="small"
                      className="DbSchema__search"
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Icon mui>AddIcon</Icon>}
                      onClick={props.onOpenAddColumn}
                    >
                      컬럼 추가
                    </Button>
                  </FlexBox>

                  {isSqlite && (
                    <Alert severity="info" className="DbSchema__alert">
                      SQLite는 테이블/컬럼 설명을 지원하지 않습니다.
                    </Alert>
                  )}

                  {filteredColumns.length === 0 ? (
                    <Typography className="DbSchema__empty">
                      {columnSearchTerm ? "검색 결과가 없습니다." : "컬럼이 없습니다."}
                    </Typography>
                  ) : (
                    <Box className="DbSchema__table-wrap">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>컬럼 이름</TableCell>
                            <TableCell>타입</TableCell>
                            <TableCell align="center">PK</TableCell>
                            <TableCell align="center">Nullable</TableCell>
                            <TableCell>기본값</TableCell>
                            {!isSqlite && <TableCell>설명</TableCell>}
                            <TableCell align="right" className="DbSchema__action-cell" />
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredColumns.map((col) => (
                            <TableRow key={col.columnName} hover>
                              <TableCell>
                                <Typography
                                  className={col.isPrimaryKey ? "DbSchema__col-name--pk" : "DbSchema__col-name"}
                                >
                                  {col.columnName}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={col.dataType}
                                  variant="outlined"
                                  size="xsmall"
                                  className="DbSchema__datatype-chip"
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Checkbox size="small" checked={col.isPrimaryKey} disabled />
                              </TableCell>
                              <TableCell align="center">
                                <Checkbox size="small" checked={col.isNullable} disabled />
                              </TableCell>
                              <TableCell>
                                <Typography className="DbSchema__default-value" noWrap>
                                  {col.defaultValue ?? "—"}
                                </Typography>
                              </TableCell>
                              {!isSqlite && (
                                <TableCell>
                                  <Typography className="DbSchema__comment" noWrap>
                                    {col.columnComment || "—"}
                                  </Typography>
                                </TableCell>
                              )}
                              <TableCell align="right">
                                <ActionMenu
                                  items={[
                                    { label: "수정", icon: <Icon mui size="small">EditIcon</Icon>, onClick: () => props.onOpenEditColumn(col) },
                                    { label: "삭제", icon: <Icon mui size="small">DeleteIcon</Icon>, onClick: () => props.onOpenDeleteColumn(col), danger: true },
                                  ]}
                                  stopPropagation
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  )}
                </FlexBox>
              )}
            </Accordion>

            {/* ── 데이터 미리보기 ── */}
            <Accordion
              id="data-preview"
              title={`데이터 미리보기${totalRows > 0 ? ` (${totalRows}행)` : ""}`}
              className="DbSchema__accordion"
              expanded={expandedSections.includes("data-preview")}
              onChange={toggleSection}
              disabled={!selectedTable}
            >
              {detailLoading ? (
                <FlexBox justify="center" className="DbSchema__loading-sm">
                  <CircularProgress size="medium" />
                </FlexBox>
              ) : (
                <FlexBox direction="column" className="DbSchema__section">
                  <FlexBox align="center" className="DbSchema__toolbar">
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Icon mui>AddIcon</Icon>}
                      onClick={props.onOpenInsertData}
                    >
                      데이터 삽입
                    </Button>
                  </FlexBox>

                  {totalRows > 0 && (
                    <Alert severity="info" className="DbSchema__alert">
                      총 {totalRows}행 중 최대 10행을 미리보기합니다.
                    </Alert>
                  )}

                  {sampleData.length === 0 ? (
                    <Typography className="DbSchema__empty">데이터가 없습니다.</Typography>
                  ) : (
                    <Box className="DbSchema__data-preview-wrap">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {columns.map((col) => (
                              <TableCell key={col.columnName} className="DbSchema__data-header">
                                {col.columnName}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sampleData.map((row, idx) => (
                            <TableRow key={idx} hover>
                              {columns.map((col) => (
                                <TableCell key={col.columnName} className="DbSchema__data-cell">
                                  {row[col.columnName] != null ? String(row[col.columnName]) : <Typography component="span" className="DbSchema__null">NULL</Typography>}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  )}
                </FlexBox>
              )}
            </Accordion>
          </FlexBox>
        )}
      </Dialog>

      {/* ======================================== */}
      {/* 서브 다이얼로그들                        */}
      {/* ======================================== */}

      {/* ── 테이블 추가 ── */}
      <Dialog
        open={props.addTableOpen}
        onClose={props.onCloseAddTable}
        title="테이블 추가"
        size="large"
        footer={
          <FlexBox justify="flex-end" gap={1}>
            <Button
              variant="contained"
              onClick={props.onAddTable}
              disabled={props.addTableSaving}
            >
              <CreateIcon fontSize="small" />
              {props.addTableSaving ? <CircularProgress size="xsmall" /> : "생성"}
            </Button>
            <Button variant="text" onClick={props.onCloseAddTable}>
              <CloseIcon fontSize="small" />
              취소
            </Button>
          </FlexBox>
        }
      >
        <FlexBox direction="column" gap={2}>
          <FormField label="테이블 이름 *">
            <Input
              className="DbSchema__input"
              value={props.newTableName}
              onChange={(e) => props.onSetNewTableName(e.target.value)}
              placeholder="테이블 이름"
            />
          </FormField>

          {!isSqlite && (
            <FormField label="설명">
              <Input
                className="DbSchema__input"
                value={props.newTableComment}
                onChange={(e) => props.onSetNewTableComment(e.target.value)}
                placeholder="테이블 설명"
              />
            </FormField>
          )}

          {isSqlite && (
            <Alert severity="info">SQLite는 테이블 설명을 지원하지 않습니다.</Alert>
          )}

          <FlexBox direction="column" gap={1}>
            <FlexBox justify="space-between" align="center">
              <Typography className="DbSchema__sub-title">컬럼 정의</Typography>
              <Button variant="contained" size="small" color="secondary" startIcon={<Icon mui>AddIcon</Icon>} onClick={props.onAddNewTableColumn}>
                컬럼 추가
              </Button>
            </FlexBox>

            <Table size="small" className="DbSchema__table">
              <TableHead>
                <TableRow>
                  <TableCell>이름</TableCell>
                  <TableCell>타입</TableCell>
                  <TableCell align="center">PK</TableCell>
                  <TableCell align="center">Nullable</TableCell>
                  <TableCell className="DbSchema__action-cell" />
                </TableRow>
              </TableHead>
              <TableBody>
                {props.newTableColumns.map((col, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Input
                        className="DbSchema__input DbSchema__input--sm"
                        value={col.columnName}
                        onChange={(e) => props.onUpdateNewTableColumn(idx, "columnName", e.target.value)}
                        placeholder="컬럼 이름"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        className="DbSchema__select"
                        size="small"
                        value={col.dataType}
                        onChange={(e) => props.onUpdateNewTableColumn(idx, "dataType", String(e.target.value))}
                      >
                        {DATA_TYPES.map((dt) => (
                          <MenuItem key={dt} value={dt}>{dt}</MenuItem>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell align="center">
                      <Checkbox
                        size="small"
                        checked={col.isPrimaryKey}
                        onChange={(e) => props.onUpdateNewTableColumn(idx, "isPrimaryKey", (e.target as HTMLInputElement).checked)}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Checkbox
                        size="small"
                        checked={col.isNullable}
                        onChange={(e) => props.onUpdateNewTableColumn(idx, "isNullable", (e.target as HTMLInputElement).checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => props.onRemoveNewTableColumn(idx)}>
                        <Icon mui size="small">DeleteIcon</Icon>
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </FlexBox>
        </FlexBox>
      </Dialog>

      {/* ── 테이블 수정 ── */}
      <Dialog
        open={props.editTableOpen}
        onClose={props.onCloseEditTable}
        title="테이블 이름 변경"
        size="medium"
        footer={
          <FlexBox justify="flex-end" gap={1}>
            <Button
              variant="contained"
              onClick={props.onEditTable}
              disabled={props.editTableSaving}
            >
              <SaveIcon fontSize="small" />
              {props.editTableSaving ? <CircularProgress size="xsmall" /> : "저장"}
            </Button>
            <Button variant="text" onClick={props.onCloseEditTable}>
              <CloseIcon fontSize="small" />
              취소
            </Button>
          </FlexBox>
        }
      >
        <FormField label="테이블 이름">
          <Input
            className="DbSchema__input"
            value={props.editTableName}
            onChange={(e) => props.onSetEditTableName(e.target.value)}
          />
        </FormField>
      </Dialog>

      {/* ── 테이블 삭제 확인 ── */}
      <ConfirmModal
        open={props.deleteTableOpen}
        onClose={props.onCloseDeleteTable}
        title="테이블 삭제"
        message={`"${props.deleteTableName}" 테이블을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        confirmColor="error"
        onConfirm={props.onDeleteTable}
      />

      {/* ── 컬럼 추가 ── */}
      <Dialog
        open={props.addColumnOpen}
        onClose={props.onCloseAddColumn}
        title="컬럼 추가"
        size="medium"
        footer={
          <FlexBox justify="flex-end" gap={1}>
            <Button
              variant="contained"
              onClick={props.onAddColumn}
              disabled={props.addColumnSaving}
            >
              <AddIcon fontSize="small" />
              {props.addColumnSaving ? <CircularProgress size="xsmall" /> : "추가"}
            </Button>
            <Button variant="text" onClick={props.onCloseAddColumn}>
              <CloseIcon fontSize="small" />
              취소
            </Button>
          </FlexBox>
        }
      >
        <FlexBox direction="column" gap={2}>
          <FormField label="컬럼 이름 *">
            <Input
              className="DbSchema__input"
              value={props.newColumnName}
              onChange={(e) => props.onSetNewColumnName(e.target.value)}
              placeholder="컬럼 이름"
            />
          </FormField>

          <FormField label="데이터 타입">
            <Select
              className="DbSchema__select"
              size="small"
              fullWidth
              value={props.newColumnDataType}
              onChange={(e) => props.onSetNewColumnDataType(String(e.target.value))}
            >
              {DATA_TYPES.map((dt) => (
                <MenuItem key={dt} value={dt}>{dt}</MenuItem>
              ))}
            </Select>
          </FormField>

          <FlexBox gap={2}>
            <FormControlLabel
              className="DbSchema__checkbox-label"
              control={
                <Checkbox
                  size="small"
                  checked={props.newColumnIsPrimaryKey}
                  onChange={(e) => props.onSetNewColumnIsPrimaryKey((e.target as HTMLInputElement).checked)}
                />
              }
              label="Primary Key"
            />
            <FormControlLabel
              className="DbSchema__checkbox-label"
              control={
                <Checkbox
                  size="small"
                  checked={props.newColumnIsNullable}
                  onChange={(e) => props.onSetNewColumnIsNullable((e.target as HTMLInputElement).checked)}
                />
              }
              label="Nullable"
            />
          </FlexBox>

          <FormField label="기본값">
            <Input
              className="DbSchema__input"
              value={props.newColumnDefaultValue}
              onChange={(e) => props.onSetNewColumnDefaultValue(e.target.value)}
              placeholder="기본값 (선택)"
            />
          </FormField>

          {!isSqlite && (
            <FormField label="설명">
              <Input
                className="DbSchema__input"
                value={props.newColumnComment}
                onChange={(e) => props.onSetNewColumnComment(e.target.value)}
                placeholder="컬럼 설명 (선택)"
              />
            </FormField>
          )}
        </FlexBox>
      </Dialog>

      {/* ── 컬럼 수정 ── */}
      <Dialog
        open={props.editColumnOpen}
        onClose={props.onCloseEditColumn}
        title="컬럼 이름 변경"
        size="medium"
        footer={
          <FlexBox justify="flex-end" gap={1}>
            <Button
              variant="contained"
              onClick={props.onEditColumn}
              disabled={props.editColumnSaving}
            >
              <SaveIcon fontSize="small" />
              {props.editColumnSaving ? <CircularProgress size="xsmall" /> : "저장"}
            </Button>
            <Button variant="text" onClick={props.onCloseEditColumn}>
              <CloseIcon fontSize="small" />
              취소
            </Button>
          </FlexBox>
        }
      >
        {isSqlite && (
          <Alert severity="warning" className="DbSchema__alert">
            SQLite는 컬럼 이름만 변경할 수 있습니다.
          </Alert>
        )}
        <FormField label="컬럼 이름">
          <Input
            className="DbSchema__input"
            value={props.editColumnName}
            onChange={(e) => props.onSetEditColumnName(e.target.value)}
          />
        </FormField>
      </Dialog>

      {/* ── 컬럼 삭제 확인 ── */}
      <ConfirmModal
        open={props.deleteColumnOpen}
        onClose={props.onCloseDeleteColumn}
        title="컬럼 삭제"
        message={`"${props.deleteColumnName}" 컬럼을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며, 해당 컬럼의 데이터도 삭제됩니다.`}
        confirmText="삭제"
        confirmColor="error"
        onConfirm={props.onDeleteColumn}
      />

      {/* ── 데이터 삽입 ── */}
      <Dialog
        open={props.insertDataOpen}
        onClose={props.onCloseInsertData}
        title="데이터 삽입"
        size="medium"
        footer={
          <FlexBox justify="flex-end" gap={1}>
            <Button
              variant="contained"
              onClick={props.onInsertData}
              disabled={props.insertDataSaving}
            >
              <AddIcon fontSize="small" />
              {props.insertDataSaving ? <CircularProgress size="xsmall" /> : "삽입"}
            </Button>
            <Button variant="text" onClick={props.onCloseInsertData}>
              <CloseIcon fontSize="small" />
              취소
            </Button>
          </FlexBox>
        }
      >
        <FlexBox direction="column" gap={2}>
          <Alert severity="info">빈 값은 NULL로 처리됩니다.</Alert>

          <Table size="small" className="DbSchema__table">
            <TableHead>
              <TableRow>
                <TableCell>컬럼</TableCell>
                <TableCell>타입</TableCell>
                <TableCell>값</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {columns.map((col) => (
                <TableRow key={col.columnName}>
                  <TableCell>
                    <Typography className={col.isPrimaryKey ? "DbSchema__col-name--pk" : ""}>
                      {col.columnName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={col.dataType} variant="outlined" size="xsmall" className="DbSchema__datatype-chip" />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="DbSchema__input DbSchema__input--sm"
                      value={props.insertDataValues[col.columnName] || ""}
                      onChange={(e) => props.onSetInsertDataValue(col.columnName, e.target.value)}
                      placeholder={col.isNullable ? "NULL" : "필수"}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </FlexBox>
      </Dialog>
    </>
  );
}
