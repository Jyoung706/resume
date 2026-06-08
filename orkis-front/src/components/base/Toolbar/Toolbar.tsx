// ============================================
// base/Toolbar — MUI Toolbar + Convenience Props
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import MuiToolbar, {
  type ToolbarProps as MuiToolbarProps,
} from "@mui/material/Toolbar";
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
import "./Toolbar.scss";

export interface ToolbarProps extends ConvenienceProps, Omit<MuiToolbarProps, "color"> {
  size?: ComponentSize;
}

export const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(
  function Toolbar(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, ...muiProps }] =
      splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiToolbarProps["sx"]);

    return (
      <MuiToolbar
        ref={ref}
        className={clsx(
          "Toolbar__base",
          "ok-toolbar",
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
