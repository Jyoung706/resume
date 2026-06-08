// ============================================
// base/Badge — MUI Badge 1:1 래핑
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import MuiBadge, { type BadgeProps as MuiBadgeProps } from "@mui/material/Badge";

export interface BadgeProps extends MuiBadgeProps {}

export const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  function Badge({ className, ...props }, ref) {
    return (
      <MuiBadge
        ref={ref}
        className={clsx("Badge__base", "ok-badge", className)}
        {...props}
      />
    );
  },
);
