// ============================================
// base/Container — MUI Container + Convenience Props
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import MuiContainer, {
  type ContainerProps as MuiContainerProps,
} from "@mui/material/Container";
import {
  type ConvenienceProps,
  splitConvenienceProps,
  convenienceToSx,
  mergeSx,
  sizeConvenienceClassNames,
} from "../types";
import "./Container.scss";

// --- Container ---

export interface ContainerProps
  extends Omit<ConvenienceProps, "maxWidth">,
    Omit<MuiContainerProps, "color"> {}

export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  function Container({ maxWidth, ...rest }, ref) {
    const [convProps, { sx, className, ...muiProps }] =
      splitConvenienceProps(rest);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiContainerProps["sx"]);

    return (
      <MuiContainer
        ref={ref}
        className={clsx(
          "Container__base",
          "ok-container",
          sizeConvenienceClassNames(convProps),
          className,
        )}
        maxWidth={maxWidth}
        sx={mergedSx}
        {...muiProps}
      />
    );
  }
);
