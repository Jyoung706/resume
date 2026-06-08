// ============================================
// RowLimitMenu — Pro 모드 SQL 결과 행 수 제한 선택 드롭다운
// Design Layer: props 기반 (로직 없음)
// ============================================

import { Icon, ListItemText, Menu, MenuItem } from "@/components";
import type { RowLimitOption } from "@/logic/common/pro/types/proMode.types";

export interface RowLimitMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  options: readonly RowLimitOption[];
  currentLimit: RowLimitOption;
  onSelect: (limit: RowLimitOption) => void;
}

function formatLabel(limit: RowLimitOption): string {
  return limit === "MAX" ? "MAX (5만 행)" : `${limit}행`;
}

export function RowLimitMenu({
  anchorEl,
  open,
  onClose,
  options,
  currentLimit,
  onSelect,
}: RowLimitMenuProps) {
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      className="RowLimitMenu"
    >
      {options.map((limit) => {
        const isSelected = currentLimit === limit;
        return (
          <MenuItem
            key={String(limit)}
            selected={isSelected}
            onClick={() => onSelect(limit)}
            className="RowLimitMenu__item"
          >
            <ListItemText
              className="RowLimitMenu__item-text"
              primary={formatLabel(limit)}
            />
            {isSelected && (
              <Icon size="small" className="RowLimitMenu__check-icon">
                check
              </Icon>
            )}
          </MenuItem>
        );
      })}
    </Menu>
  );
}
