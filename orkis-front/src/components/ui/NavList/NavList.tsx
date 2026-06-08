// ============================================
// ui/NavList — 네비게이션 리스트 복합 컴포넌트
// ============================================

import { forwardRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import type { SxProps, Theme } from "@mui/material/styles";
import { List, ListItemButton, ListItemIcon, ListItemText } from "../../base/List";
import { Collapse } from "../../base/Collapse";
import { ExpandLess, ExpandMore } from "../../base/MuiIcon";
import "./NavList.scss";


export interface NavItem {
  label: string;
  path: string;
  icon?: ReactNode;
  children?: NavItem[];
}

export interface NavListProps {
  className?: string;
  sx?: SxProps<Theme>;
  items: NavItem[];
  selectedPath?: string;
  onNavigate: (path: string) => void;
}

export const NavList = forwardRef<HTMLUListElement, NavListProps>(
  function NavList({ className, sx, items, selectedPath, onNavigate }, ref) {
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

    const toggleGroup = (path: string) => {
      setOpenGroups((prev) => ({ ...prev, [path]: !prev[path] }));
    };

    const isChildSelected = (children: NavItem[]) =>
      children.some((child) => selectedPath === child.path);

    return (
      <List ref={ref} className={clsx("NavList__base", "ok-nav-list", className)} sx={sx}>
        {items.map((item) => {
          if (item.children) {
            const open = openGroups[item.path] ?? isChildSelected(item.children);
            return (
              <div key={item.path}>
                <ListItemButton onClick={() => toggleGroup(item.path)}>
                  {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
                  <ListItemText primary={item.label} />
                  {open ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                <Collapse in={open} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.children.map((child) => (
                      <ListItemButton
                        key={child.path}
                        className="NavList__child ok-nav-list-child"
                        selected={selectedPath === child.path}
                        onClick={() => onNavigate(child.path)}
                      // sx={{ pl: 4 }}
                      >
                        {child.icon && <ListItemIcon>{child.icon}</ListItemIcon>}
                        <ListItemText primary={child.label} />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              </div>
            );
          }

          return (
            <ListItemButton
              key={item.path}
              selected={selectedPath === item.path}
              onClick={() => onNavigate(item.path)}
            >
              {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
    );
  },
);
