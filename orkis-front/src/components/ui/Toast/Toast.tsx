// ============================================
// ui/Toast — Snackbar + Alert 기반 토스트
// ============================================

import clsx from "clsx";
import { forwardRef } from "react";
import type { AlertProps } from "../../base/Alert";
import { Alert } from "../../base/Alert";
import type { SnackbarProps } from "../../base/Snackbar";
import { Snackbar } from "../../base/Snackbar";

export interface ToastProps extends Omit<SnackbarProps, "children"> {
  severity?: AlertProps["severity"];
  message: string;
  onClose?: () => void;
}

export const Toast = forwardRef<HTMLDivElement, ToastProps>(function Toast(
  { severity = "info", message, onClose, className, ...snackbarProps },
  ref
) {
  return (
    <Snackbar
      ref={ref}
      className={clsx("Toast__base", "ok-toast", className)}
      autoHideDuration={4000}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      onClose={onClose}
      {...snackbarProps}
    >
      <Alert
        severity={severity}
        variant="standard"
        onClose={onClose}
        width="100%"
      >
        {message}
      </Alert>
    </Snackbar>
  );
});
