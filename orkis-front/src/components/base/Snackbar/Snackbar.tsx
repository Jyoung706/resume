// ============================================
// base/Snackbar — MUI Snackbar + Convenience Props
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import MuiSnackbar, {
  type SnackbarProps as MuiSnackbarProps,
} from "@mui/material/Snackbar";
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
import "./Snackbar.scss";

// --- Snackbar ---

export interface SnackbarProps extends ConvenienceProps, Omit<MuiSnackbarProps, "color"> {
  size?: ComponentSize;
}

export const Snackbar = forwardRef<HTMLDivElement, SnackbarProps>(
  function Snackbar(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, ...muiProps }] =
      splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiSnackbarProps["sx"]);

    return (
      <MuiSnackbar
        ref={ref}
        className={clsx(
          "Snackbar__base",
          "ok-snackbar",
          sizeClass(size),
          sizeConvenienceClassNames(convProps),
          className,
        )}
        sx={mergedSx}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        {...muiProps}
      />
    );
  }
);
