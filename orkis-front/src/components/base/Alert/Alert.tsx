// ============================================
// base/Alert — MUI Alert + Convenience Props
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import MuiAlert, {
  type AlertProps as MuiAlertProps,
  type AlertColor,
} from "@mui/material/Alert";
export type { AlertColor };
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
import "./Alert.scss";

// --- Alert ---

export interface AlertProps extends ConvenienceProps, MuiAlertProps {
  size?: ComponentSize;
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  function Alert(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, ...muiProps }] =
      splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiAlertProps["sx"]);

    return (
      <MuiAlert
        ref={ref}
        className={clsx(
          "Alert__base",
          "ok-alert",
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
