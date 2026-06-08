// ============================================
// base/AppBar — MUI AppBar + Convenience Props
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import MuiAppBar, {
  type AppBarProps as MuiAppBarProps,
} from "@mui/material/AppBar";
import {
  useDefaultComponentSize,
  sizeClass,
  type ComponentSize,
} from "@/design-system";
import {
  type ConvenienceProps,
  splitConvenienceProps,
  convenienceToSx,
  mergeSx,
  sizeConvenienceClassNames,
} from "../types";
import "./AppBar.scss";

// --- AppBar ---

export interface AppBarProps extends ConvenienceProps, MuiAppBarProps {
  size?: ComponentSize;
}

export const AppBar = forwardRef<HTMLDivElement, AppBarProps>(
  function AppBar(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, ...muiProps }] =
      splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiAppBarProps["sx"]);

    return (
      <MuiAppBar
        ref={ref}
        className={clsx(
          "AppBar__base",
          "ok-app-bar",
          sizeClass(size),
          sizeConvenienceClassNames(convProps),
          className,
        )}
        sx={mergedSx}
        {...muiProps}
      />
    );
  }
);
