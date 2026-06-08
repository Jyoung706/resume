// ============================================
// base/Popper — MUI Popper + Convenience Props
// ============================================

import clsx from "clsx";
import MuiPopper, {
  type PopperProps as MuiPopperProps
} from "@mui/material/Popper";
import "./Popper.scss";

export interface PopperProps extends MuiPopperProps {
  className?: string;
}

export function Popper({ className, ...muiProps }: PopperProps) {
  return (
    <MuiPopper
      className={clsx("Popper__base", "ok-popper", className)}
      {...muiProps}
    />
  );
}
