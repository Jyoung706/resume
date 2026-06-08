// ============================================
// base/Stack — MUI Stack + Visual Convenience Props
// ============================================
// Stack은 MUI system props(m, p 등)를 이미 지원하므로
// visual convenience(rounded, shadow 등)만 추가

import { forwardRef } from "react";
import clsx from "clsx";
import MuiStack, {
  type StackProps as MuiStackProps,
} from "@mui/material/Stack";
import {
  type VisualConvenienceProps,
  splitVisualConvenienceProps,
  visualConvenienceToSx,
  mergeSx,
  sizeConvenienceClassNames,
} from "../types";
import "./Stack.scss";


export interface StackProps extends VisualConvenienceProps, MuiStackProps {}

export const Stack = forwardRef<HTMLDivElement, StackProps>(
  function Stack(props, ref) {
    const [convProps, { sx, className, ...muiProps }] =
      splitVisualConvenienceProps(props);
    const convSx = visualConvenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiStackProps["sx"]);

    return (
      <MuiStack
        ref={ref}
        className={clsx(
          "Stack__base",
          "ok-stack",
          sizeConvenienceClassNames(props as Record<string, unknown>),
          className,
        )}
        sx={mergedSx}
        {...muiProps}
      />
    );
  }
);
