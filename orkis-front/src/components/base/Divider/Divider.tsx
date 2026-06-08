// ============================================
// base/Divider — MUI Divider + Convenience Props
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import MuiDivider, { type DividerProps as MuiDividerProps } from "@mui/material/Divider";
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
import "./Divider.scss";

export interface DividerProps extends ConvenienceProps, Omit<MuiDividerProps, "color"> {
  size?: ComponentSize;
}

export const Divider = forwardRef<HTMLHRElement, DividerProps>(
  function Divider(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, ...muiProps }] =
      splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiDividerProps["sx"]);

    return (
      <MuiDivider
        ref={ref}
        className={clsx(
          "Divider__base",
          "ok-divider",
          sizeClass(size),
          sizeConvenienceClassNames(convProps),
          className,
        )}
        sx={mergedSx}
        {...muiProps}
      />
    );
  },
);
