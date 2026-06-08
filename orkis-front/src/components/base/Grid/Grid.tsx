// ============================================
// base/Grid — MUI Grid + Visual Convenience Props
// ============================================
// Grid는 MUI system props를 지원하므로
// VisualConvenienceProps(rounded, shadow)만 추가

import { forwardRef } from "react";
import clsx from "clsx";
import MuiGrid, { type GridProps as MuiGridProps } from "@mui/material/Grid";
import {
  type VisualConvenienceProps,
  splitVisualConvenienceProps,
  visualConvenienceToSx,
  mergeSx,
  sizeConvenienceClassNames,
} from "../types";
import "./Grid.scss";


export interface GridProps extends VisualConvenienceProps, MuiGridProps {}

export const Grid = forwardRef<HTMLDivElement, GridProps>(
  function Grid(props, ref) {
    const [convProps, { sx, className, ...muiProps }] =
      splitVisualConvenienceProps(props);
    const convSx = visualConvenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiGridProps["sx"]);

    return (
      <MuiGrid
        ref={ref}
        className={clsx(
          "Grid__base",
          "ok-grid",
          sizeConvenienceClassNames(props as Record<string, unknown>),
          className,
        )}
        sx={mergedSx}
        {...muiProps}
      />
    );
  }
);
