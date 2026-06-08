// ============================================
// base/Box — MUI Box + Visual Convenience Props
// ============================================
// Box는 MUI system props(m, p 등)를 이미 지원하므로
// visual convenience(rounded, shadow, w, h 등)만 추가

import { forwardRef } from "react";
import clsx from "clsx";
import MuiBox, { type BoxProps as MuiBoxProps } from "@mui/material/Box";
import {
  type VisualConvenienceProps,
  splitVisualConvenienceProps,
  visualConvenienceToSx,
  mergeSx,
  sizeConvenienceClassNames,
} from "../types";
import "./Box.scss";


export interface BoxProps extends VisualConvenienceProps, MuiBoxProps {}

export const Box = forwardRef<HTMLDivElement, BoxProps>(
  function Box(props, ref) {
    const [convProps, { sx, className, ...muiProps }] = splitVisualConvenienceProps(props);
    const convSx = visualConvenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiBoxProps["sx"]);

    return (
      <MuiBox
        ref={ref}
        className={clsx(
          "Box__base",
          "ok-box",
          sizeConvenienceClassNames(props as Record<string, unknown>),
          className,
        )}
        sx={mergedSx}
        {...muiProps}
      />
    );
  },
);
