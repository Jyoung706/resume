// ============================================
// SchemaColumnItem — 컬럼 행
// Design Layer: props 기반 (로직 없음)
// ============================================

import {
  FlexBox,
  Typography,
  Checkbox,
  Chip
} from "@/components";

// ============================================
// Types
// ============================================

export interface SchemaColumn {
  name: string;
  dataType: string;
  isPK: boolean;
  isFK: boolean;
  isNullable?: boolean;
  ordinal?: number;
  comment?: string;
  isSelected: boolean;
  isHighlighted?: boolean;
}

// ============================================
// Props
// ============================================

export interface SchemaColumnItemProps {
  column: SchemaColumn;
  tableName: string;
  onToggle?: (tableName: string, columnName: string) => void;
}

// ============================================
// SchemaColumnItem
// ============================================

export function SchemaColumnItem({
  column,
  tableName,
  onToggle
}: SchemaColumnItemProps) {
  const classNames = [
    "SchemaColumnItem",
    column.isSelected && "SchemaColumnItem--selected",
    column.isHighlighted && "SchemaColumnItem--highlighted",
  ].filter(Boolean).join(" ");

  return (
    <FlexBox
      align="center"
      className={classNames}
      onClick={() => onToggle?.(tableName, column.name)}
      role="checkbox"
      aria-checked={column.isSelected}
      aria-label={`${column.name} 컬럼 선택`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle?.(tableName, column.name);
        }
      }}
    >
      <Checkbox
        size="small"
        checked={column.isSelected}
        tabIndex={-1}
        className="SchemaColumnItem__checkbox"
      />
      <FlexBox direction="column" className="SchemaColumnItem__info">
        <Typography className="SchemaColumnItem__name">
          {column.name}
        </Typography>
        <FlexBox align="center" className="SchemaColumnItem__meta">
          <Typography className="SchemaColumnItem__type">
            {column.dataType}
          </Typography>
          {column.isPK && (
            <Chip
              label="PK"
              size="xsmall"
              variant="outlined"
              className="SchemaColumnItem__badge SchemaColumnItem__badge--pk"
            />
          )}
          {column.isFK && (
            <Chip
              label="FK"
              size="small"
              variant="outlined"
              className="SchemaColumnItem__badge SchemaColumnItem__badge--fk"
            />
          )}
        </FlexBox>
      </FlexBox>
    </FlexBox>
  );
}
