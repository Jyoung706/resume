// ============================================
// SchemaPanel — 데이터베이스 스키마 선택
// Design Layer: props 기반 (로직 없음)
// ============================================
// 헤더 + 선택 요약 + 검색 + 테이블/컬럼 트리
// ============================================

import {
  FlexBox,
  Typography,
  Button,
  Collapse,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Img,
  ExpandMoreIcon,
  ExpandLessIcon
} from "@/components";
import { SearchInput } from "@/components";
import { getDbLogo } from "@/logic/shared/utils/dbLogos";
import { SchemaTableItem, type SchemaTable } from "./SchemaTableItem";
import "./SchemaPanel.scss";
import "../panels.scss";

// ============================================
// Props
// ============================================

export interface SchemaPanelProps {
  /** DB 연결 이름 */
  dbName?: string;
  /** DB 타입 (mysql, oracle 등) */
  dbType?: string;
  /** 테이블 목록 */
  tables: SchemaTable[];
  /** 선택된 테이블 수 */
  selectedTableCount: number;
  /** 선택된 컬럼 수 */
  selectedColumnCount: number;
  /** 검색어 */
  searchTerm: string;
  /** 로딩 상태 */
  loading?: boolean;
  /** 에러 메시지 */
  error?: string;
  /** 패널 접기/펼치기 상태 */
  isExpanded?: boolean;
  /** 검색어 변경 */
  onSearch: (term: string) => void;
  /** 테이블 선택 토글 */
  onToggleTable: (tableName: string) => void;
  /** 컬럼 선택 토글 */
  onToggleColumn: (tableName: string, columnName: string) => void;
  /** 테이블 확장/축소 */
  onExpandTable: (tableName: string) => void;
  /** 전체 컬럼 선택 */
  onSelectAllColumns: (tableName: string) => void;
  /** 전체 선택 해제 */
  onClearSelection?: () => void;
  /** 패널 접기/펼치기 핸들러 */
  onToggleExpand?: () => void;
}

// ============================================
// SchemaPanel
// ============================================

export function SchemaPanel({
  dbName,
  dbType,
  tables,
  selectedTableCount,
  selectedColumnCount,
  searchTerm,
  loading,
  error,
  isExpanded = true,
  onSearch,
  onToggleTable,
  onToggleColumn,
  onExpandTable,
  onSelectAllColumns,
  onClearSelection,
  onToggleExpand
}: SchemaPanelProps) {
  // DB 미선택 상태
  if (!dbName && !loading) {
    return (
      <FlexBox className="Panel__placeholder">
        <Typography className="Panel__placeholder-title">스키마 선택</Typography>
        <Typography className="Panel__placeholder-text">
          먼저 데이터베이스를 선택해주세요
        </Typography>
      </FlexBox>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <FlexBox
        direction="column"
        className="ChatPage__schema-panel SchemaPanel Panel__container"
      >
        <Alert severity="error">
          스키마 정보를 불러오는데 실패했습니다: {error}
        </Alert>
      </FlexBox>
    );
  }

  // 로딩 상태
  if (loading) {
    return (
      <FlexBox
        direction="column"
        className="ChatPage__schema-panel SchemaPanel Panel__container"
      >
        <FlexBox className="Panel__loading">
          <CircularProgress size="medium" />
        </FlexBox>
      </FlexBox>
    );
  }

  return (
    <FlexBox
      direction="column"
      className="ChatPage__schema-panel SchemaPanel Panel__container"
    >
      {/* 헤더 */}
      <FlexBox
        justify="space-between"
        align="center"
        className="SchemaPanel__header"
      >
        <Typography className="SchemaPanel__title">스키마 선택</Typography>
        <FlexBox direction="column" className="SchemaPanel__header-info">
          {dbName && (
            <FlexBox align="center" className="SchemaPanel__db-meta">
              {dbType && (
                <Img
                  src={getDbLogo(dbType)}
                  className="SchemaPanel__db-icon"
                />
              )}
              <Typography className="SchemaPanel__db-info">
                {dbName}
              </Typography>
            </FlexBox>
          )}
          {onToggleExpand && (
            <IconButton
              size="small"
              onClick={onToggleExpand}
              aria-label={isExpanded ? "패널 접기" : "패널 펼치기"}
              className="SchemaPanel__toggle-btn"
            >
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )}
        </FlexBox>
      </FlexBox>

      <Collapse in={isExpanded} className="SchemaPanel__content">
        {/* 선택 요약 */}
        <FlexBox
          justify="space-between"
          align="center"
          className="SchemaPanel__summary"
        >
          <FlexBox direction="column" className="SchemaPanel__summary-rows">
            <FlexBox justify="space-between" align="center" className="SchemaPanel__summary-row">
              <Typography className="SchemaPanel__summary-label">선택된 스키마 TABLE</Typography>
              <Typography className="SchemaPanel__summary-count">{selectedTableCount}</Typography>
            </FlexBox>
            <FlexBox justify="space-between" align="center" className="SchemaPanel__summary-row">
              <Typography className="SchemaPanel__summary-label">선택된 스키마 COLUMN</Typography>
              <Typography className="SchemaPanel__summary-count">{selectedColumnCount}</Typography>
            </FlexBox>
          </FlexBox>
          {selectedTableCount > 0 && onClearSelection && (
            <Button
              size="xsmall"
              variant="outlined"
              className="SchemaPanel__clear-btn"
              onClick={onClearSelection}
            >
              전체 해제
            </Button>
          )}
        </FlexBox>

        {/* 검색 */}
        <SearchInput
          className="Panel__search-bar"
          placeholder="테이블 검색..."
          value={searchTerm}
          onChange={(e) => onSearch(e.target.value)}
          onSearch={onSearch}
        />

        <Divider />

        {/* 테이블 목록 */}
        <FlexBox direction="column" className="SchemaPanel__table-list">
          {tables.length === 0 ? (
            <Alert severity="info">
              {searchTerm ? "검색 결과가 없습니다." : "테이블이 없습니다."}
            </Alert>
          ) : (
            tables.map((table) => (
              <SchemaTableItem
                key={table.name}
                table={table}
                onExpand={onExpandTable}
                onToggleTable={onToggleTable}
                onToggleColumn={onToggleColumn}
                onSelectAllColumns={onSelectAllColumns}
              />
            ))
          )}
        </FlexBox>

        {/* 안내 메시지 */}
        {selectedTableCount === 0 && tables.length > 0 && (
          <Alert severity="info" className="SchemaPanel__hint">
            테이블을 선택하면 AI가 해당 스키마 정보를 참고하여 더 정확한 답변을
            제공합니다.
          </Alert>
        )}
      </Collapse>
    </FlexBox>
  );
}
