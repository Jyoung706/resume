// ============================================
// ui/AppHeader — AppBar + Toolbar 복합 컴포넌트
// ============================================

import { forwardRef, type ReactNode } from "react";
import clsx from "clsx";
import { AppBar } from "../../base/AppBar";
import type { AppBarProps } from "../../base/AppBar";
import { Toolbar } from "../../base/Toolbar";
import "./AppHeader.scss";


export interface AppHeaderProps {
  className?: string;
  leftActions?: ReactNode;
  rightActions?: ReactNode;
  elevation?: number;
  color?: "default" | "primary" | "transparent" | "inherit";
  position?: "fixed" | "absolute" | "sticky" | "static" | "relative";
  sx?: AppBarProps["sx"];
  children?: ReactNode;
}

export const AppHeader = forwardRef<HTMLDivElement, AppHeaderProps>(
  function AppHeader(
    {
      className,
      leftActions,
      rightActions,
      elevation = 1,
      color = "default",
      position = "sticky",
      sx,
      children,
    },
    ref,
  ) {
    return (
      <AppBar
        ref={ref}
        className={clsx("AppHeader__base", "ok-app-header", className)}
        position={position}
        color={color}
        elevation={elevation}
        sx={sx}
      >
        <Toolbar className="AppHeader__toolbar ok-app-header-toolbar">
          {/* sx={{ minHeight: "var(--header-height) !important" }} */}
          {leftActions}
          {children}
          {rightActions}
        </Toolbar>
      </AppBar>
    );
  },
);
