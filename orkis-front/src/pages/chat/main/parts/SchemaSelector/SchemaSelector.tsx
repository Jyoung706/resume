// ============================================
// SchemaSelector — 입력창 상단 스키마 선택 바
// Design Layer: props 기반 (로직 없음)
// ============================================
// [🔗] 스키마 [▼] [T USERS ✕] [C ORDERS.id ✕] ... [전체취소]
// ============================================

import {
  ArrowDropDownIcon,
  Chip,
  CancelIcon,
  Icon,
  FlexBox,
  IconButton,
  Typography
} from "@/components";
import type { SelectedSchemaItem } from "@/logic/chat/main/useSchemaSelectionMenu";
import "./SchemaSelector.scss";

// ============================================
// Props
// ============================================

export interface SchemaSelectorProps {
  /** 선택된 스키마 항목 목록 */
  selectedItems: SelectedSchemaItem[];
  /** 표시 여부 (선택된 항목이 있을 때만) */
  visible: boolean;
  /** 비활성화 */
  disabled?: boolean;
  /** 항목 삭제 */
  onRemoveItem: (item: SelectedSchemaItem) => void;
  /** 전체 해제 */
  onClearAll: () => void;
  /** 드롭다운 버튼 클릭 (SchemaSelectionMenu 열기) */
  onDropdownClick: (event: React.MouseEvent<HTMLElement>) => void;
}

// ============================================
// SchemaSelector
// ============================================

export function SchemaSelector({
  selectedItems,
  visible,
  disabled,
  onRemoveItem,
  onClearAll,
  onDropdownClick
}: SchemaSelectorProps) {
  if (!visible) return null;

  return (
    <FlexBox align="center" className="SchemaSelector__container">
      {/* 라벨 */}
      <Icon size="small" className="SchemaSelector__label-icon">network_node</Icon>
      <Typography className="SchemaSelector__label">스키마</Typography>

      {/* 드롭다운 버튼 */}
      <IconButton
        size="small"
        className="SchemaSelector__dropdown-btn"
        onClick={onDropdownClick}
        disabled={disabled}
        aria-label="스키마 선택 패널 열기"
      >
        <ArrowDropDownIcon />
      </IconButton>

      {/* Chip 컨테이너 (수평 스크롤) */}
      <FlexBox className="SchemaSelector__chips">
        {selectedItems.map((item) => (
          <Chip
            key={item.id}
            label={item.type === "table" ? `T ${item.label}` : `C ${item.label}`}
            size="small"
            deleteIcon={<CancelIcon fontSize="small" className="SchemaSelector__chip-delete" />}
            onDelete={disabled ? undefined : () => onRemoveItem(item)}
            className={`SchemaSelector__chip SchemaSelector__chip--${item.type}`}
            disabled={disabled}
          />
        ))}
      </FlexBox>

      {/* 전체취소 */}
      {selectedItems.length > 0 && (
        <Typography
          component="span"
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="모든 스키마 선택 제거"
          className="SchemaSelector__clear-all"
          onClick={disabled ? undefined : onClearAll}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (!disabled && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              onClearAll();
            }
          }}
        >
          전체취소
        </Typography>
      )}
    </FlexBox>
  );
}
