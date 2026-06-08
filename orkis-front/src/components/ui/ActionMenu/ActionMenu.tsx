// ============================================
// ui/ActionMenu — MoreVert 3-dot 컨텍스트 메뉴
// anchorEl 상태 캡슐화, 일관된 MenuItem 구조
// ============================================

import { useState } from "react";
import clsx from "clsx";
import { IconButton } from "../../base/IconButton";
import { ListItemIcon, ListItemText } from "../../base/List";
import { Menu, type MenuProps } from "../../base/Menu";
import { MenuItem } from "../../base/MenuItem";
import { MoreVertIcon } from "../../base/MuiIcon";
import "./ActionMenu.scss";

// ============================================
// Types
// ============================================

export interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}

export interface ActionMenuProps {
  items: ActionMenuItem[];
  iconButtonSize?: "small" | "medium";
  iconFontSize?: "small" | "inherit";
  zIndex?: string | number;
  disabled?: boolean;
  className?: string;
  /** IconButton 클릭 시 stopPropagation (리스트 아이템 내부 사용 시) */
  stopPropagation?: boolean;
  /** Menu에 전달할 추가 props (positioning, slotProps 등) */
  menuProps?: Partial<Omit<MenuProps, "anchorEl" | "open" | "onClose">>;
}

// ============================================
// ActionMenu
// ============================================

export function ActionMenu({
  items,
  iconButtonSize = "small",
  iconFontSize = "small",
  zIndex,
  disabled,
  className,
  stopPropagation,
  menuProps,
}: ActionMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  if (items.length === 0) return null;

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (stopPropagation) event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleItemClick = (item: ActionMenuItem) => {
    handleClose();
    item.onClick();
  };

  return (
    <>
      <IconButton
        size={iconButtonSize}
        onClick={handleOpen}
        disabled={disabled}
        className={clsx("ActionMenu__trigger", className)}
      >
        <MoreVertIcon fontSize={iconFontSize} />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        sx={zIndex != null ? { zIndex } : undefined}
        {...menuProps}
      >
        {items.map((item) => (
          <MenuItem
            key={item.label}
            onClick={() => handleItemClick(item)}
            className={clsx(
              "ActionMenu__item",
              item.danger && "ActionMenu__item--danger",
            )}
          >
            {item.icon && (
              <ListItemIcon
                className={clsx(
                  "ActionMenu__item-icon",
                  item.danger && "ActionMenu__item-icon--danger",
                )}
              >
                {item.icon}
              </ListItemIcon>
            )}
            <ListItemText>{item.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
