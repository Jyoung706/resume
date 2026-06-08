// ============================================
// base/Paper — MUI Paper + Convenience Props
// ============================================

import MuiPaper, {
  type PaperProps as MuiPaperProps
} from "@mui/material/Paper";
import clsx from "clsx";
import { forwardRef } from "react";
import {
  useDefaultComponentSize,
  sizeClass,
  type ComponentSize,
} from "@/design-system";
import {
  type ConvenienceProps,
  convenienceToSx,
  mergeSx,
  sizeConvenienceClassNames,
  splitConvenienceProps
} from "../types";
import "./Paper.scss";


export interface PaperProps
  extends ConvenienceProps, Omit<MuiPaperProps, "color"> {
  /** true 이면 backgroundColor: 'transparent' 적용 */
  transparent?: boolean;
  size?: ComponentSize;
}

export const Paper = forwardRef<HTMLDivElement, PaperProps>(
  function Paper(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [
      convProps,
      { sx, className, transparent, elevation, size = defaultSize, ...muiProps },
    ] = splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const transparentSx = transparent ? { backgroundColor: "transparent" } : {};
    const mergedSx = mergeSx(
      mergeSx(convSx, transparentSx),
      sx as MuiPaperProps["sx"]
    );

    return (
      <MuiPaper
        ref={ref}
        className={clsx(
          "Paper__base",
          "ok-paper",
          sizeClass(size),
          sizeConvenienceClassNames(convProps),
          className,
        )}
        elevation={elevation ?? 0}
        sx={mergedSx}
        {...muiProps}
      />
    );
  }
);
