// ============================================
// SchemaTableItem — 테이블 행 (아코디언)
// Design Layer: props 기반 (로직 없음)
// ============================================

import {
  FlexBox,
  Typography,
  Button,
  Divider,
  CircularProgress,
  CheckBoxIcon,
  CheckBoxOutlineBlankIcon,
  IndeterminateCheckBoxIcon
} from "@/components";
import { Accordion, EmptyState } from "@/components";
import { SchemaColumnItem, type SchemaColumn } from "./SchemaColumnItem";

// ============================================
// Types
// ============================================

export interface SchemaTable {
  name: string;
  type?: string;
  comment?: string;
  columns: SchemaColumn[];
  selectionState: "all" | "partial" | "none";
  isExpanded: boolean;
  isLoadingColumns?: boolean;
}

// ============================================
// Props
// ============================================

export interface SchemaTableItemProps {
  table: SchemaTable;
  onExpand?: (tableName: string) => void;
  onToggleTable?: (tableName: string) => void;
  onToggleColumn?: (tableName: string, columnName: string) => void;
  onSelectAllColumns?: (tableName: string) => void;
}

// ============================================
// 체크박스 아이콘 선택
// ============================================

function CheckboxIcon({ state }: { state: "all" | "partial" | "none" }) {
  switch (state) {
    case "all":
      return <CheckBoxIcon className="SchemaTableItem__check-icon SchemaTableItem__check-icon--active" />;
    case "partial":
      return <IndeterminateCheckBoxIcon className="SchemaTableItem__check-icon SchemaTableItem__check-icon--active" />;
    default:
      return <CheckBoxOutlineBlankIcon className="SchemaTableItem__check-icon" />;
  }
}

// ============================================
// SchemaTableItem
// ============================================

export function SchemaTableItem({
  table,
  onExpand,
  onToggleTable,
  onToggleColumn,
  onSelectAllColumns
}: SchemaTableItemProps) {
  const isSelected = table.selectionState !== "none";
  const displayComment = table.comment || table.type;

  // 아코디언 타이틀
  const title = (
    <FlexBox align="center" className="SchemaTableItem__header">
      <FlexBox
        align="center"
        className="SchemaTableItem__check"
        role="checkbox"
        aria-checked={
          table.selectionState === "all" ? true
          : table.selectionState === "partial" ? "mixed"
          : false
        }
        aria-label={`${table.name} 테이블 선택`}
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onToggleTable?.(table.name);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            onToggleTable?.(table.name);
          }
        }}
      >
        <CheckboxIcon state={table.selectionState} />
      </FlexBox>
      <FlexBox direction="column" className="SchemaTableItem__info">
        <Typography
          className={`SchemaTableItem__name ${isSelected ? "SchemaTableItem__name--selected" : ""}`}
        >
          {table.name}
        </Typography>
        {displayComment && (
          <Typography className="SchemaTableItem__comment">
            {displayComment}
          </Typography>
        )}
      </FlexBox>
    </FlexBox>
  );

  return (
    <Accordion
      id={table.name}
      title={title}
      expanded={table.isExpanded}
      onChange={() => onExpand?.(table.name)}
      className={`SchemaTableItem ${isSelected ? "SchemaTableItem--selected" : ""}`}
    >
      <FlexBox direction="column" className="SchemaTableItem__details">
        {/* 로딩 상태 */}
        {table.isLoadingColumns && table.columns.length === 0 ? (
          <FlexBox className="SchemaTableItem__loading">
            <CircularProgress size="small" />
          </FlexBox>
        ) : table.columns.length === 0 ? (
          <EmptyState className="SchemaTableItem__empty" title="컬럼 정보 없음" />
        ) : (
          <>
            {/* 전체 선택/해제 버튼 */}
            <FlexBox className="SchemaTableItem__select-all">
              <Button
                size="xsmall"
                variant="outlined"
                className="SchemaTableItem__select-all-btn"
                onClick={() => onSelectAllColumns?.(table.name)}
              >
                {table.selectionState === "all" ? "전체 해제" : "전체 선택"}
              </Button>
            </FlexBox>
            <Divider />

            {/* 컬럼 목록 */}
            {table.columns.map((column) => (
              <SchemaColumnItem
                key={column.name}
                column={column}
                tableName={table.name}
                onToggle={onToggleColumn}
              />
            ))}
          </>
        )}
      </FlexBox>
    </Accordion>
  );
}
