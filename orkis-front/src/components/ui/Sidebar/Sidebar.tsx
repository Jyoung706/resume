// ============================================
// ui/Sidebar — Drawer 복합 컴포넌트
// ============================================

import type { SxProps, Theme } from "@mui/material/styles";
import clsx from "clsx";
import { forwardRef, type ReactNode } from "react";
import { Divider } from "../../base/Divider";
import { Drawer } from "../../base/Drawer";
import { Toolbar } from "../../base/Toolbar";
import { Typography } from "../../base/Typography";
import styles from "../ui.componets.module.scss";
import "./Sidebar.scss";


export interface SidebarProps {
  className?: string;
  open: boolean;
  width?: number | string;
  title?: ReactNode;
  children: ReactNode;
  variant?: "persistent" | "temporary" | "permanent";
  sx?: SxProps<Theme>;
  onClose?: () => void;
}

// const DEFAULT_WIDTH: number | string = "var(--sidebar-width)";

export const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(
  function Sidebar(
    {
      className,
      open,
      // width = DEFAULT_WIDTH,
      title,
      children,
      variant = "persistent",
      sx,
      onClose
    },
    ref
  ) {
    return (
      <Drawer
        ref={ref}
        className={clsx(
          styles["sidebar"],
          "Sidebar__base",
          "ok-sidebar",
          open && "Sidebar__open ok-sidebar--open",
          className
        )}
        variant={variant}
        open={open}
        onClose={onClose}
        // style={{ "--sidebar-w": typeof width === "number" ? `${width}px` : width } as React.CSSProperties}
        sx={sx}
        // sx={{
        //   width: open ? width : 0,
        //   flexShrink: 0,
        //   "& .MuiDrawer-paper": {
        //     width,
        //     boxSizing: "border-box",
        //   },
        // }}
      >
        {title && (
          <>
            <Toolbar className="Sidebar__header ok-sidebar-header">
              {typeof title === "string" ? (
                <Typography variant="h6" fontWeight={700}>
                  {title}
                </Typography>
              ) : (
                title
              )}
            </Toolbar>
            <Divider />
          </>
        )}
        {children}
      </Drawer>
    );
  }
);
