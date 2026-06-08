// ============================================
// AddOptionMenu — 입력창 + 버튼 옵션 드롭다운
// Design Layer: props 기반 (로직 없음)
// ============================================

import clsx from "clsx";
import {
  ListItemText,
  Menu,
  MenuItem,
  Icon,
  CheckCircleOutlinedIcon,
  RadioButtonUncheckedIcon
} from "@/components";
import "./AddOptionMenu.scss";

// ============================================
// Types
// ============================================

export interface AddOptionMenuItem {
  id: string;
  title: string;
  description: string;
}

// ============================================
// Props
// ============================================

export interface AddOptionMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  options: readonly AddOptionMenuItem[];
  selectedOptions: Record<string, boolean>;
  onToggle: (optionId: string) => void;
}

// ============================================
// AddOptionMenu
// ============================================

export function AddOptionMenu({
  anchorEl,
  open,
  onClose,
  options,
  selectedOptions,
  onToggle,
}: AddOptionMenuProps) {
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "left" }}
      transformOrigin={{ vertical: "bottom", horizontal: "left" }}
      className="AddOptionMenu"
    >
      {options.map((option) => {
        const isActive = !!selectedOptions[option.id];
        return (
          <MenuItem
            key={option.id}
            onClick={() => onToggle(option.id)}
            className={clsx(
              "AddOptionMenu__item",
              isActive && "AddOptionMenu__item--active"
            )}
          >
            <ListItemText
              className="AddOptionMenu__item-text"
              primary={option.title}
              secondary={option.description}
            />
            {isActive ? (
              <CheckCircleOutlinedIcon
                className="AddOptionMenu__indicator AddOptionMenu__indicator--active"
              />
              // <Icon size="small" className="AddOptionMenu__indicator AddOptionMenu__indicator--active">task_alt</Icon>
            ) : (
              <CheckCircleOutlinedIcon
                className="AddOptionMenu__indicator AddOptionMenu__indicator--inactive"
              />
              // <Icon size="small" className="AddOptionMenu__indicator AddOptionMenu__indicator--inactive">task_alt</Icon>
            )}
          </MenuItem>
        );
      })}
    </Menu>
  );
}
