// ============================================
// base/Dialog — MUI Dialog 관련 래퍼
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import MuiDialog, {
  type DialogProps as MuiDialogProps,
} from "@mui/material/Dialog";
import MuiDialogTitle, {
  type DialogTitleProps as MuiDialogTitleProps,
} from "@mui/material/DialogTitle";
import MuiDialogContent, {
  type DialogContentProps as MuiDialogContentProps,
} from "@mui/material/DialogContent";
import MuiDialogActions, {
  type DialogActionsProps as MuiDialogActionsProps,
} from "@mui/material/DialogActions";
import {
  useDefaultComponentSize,
  sizeClass,
  type ComponentSize,
} from "@/design-system";
import {
  type ConvenienceProps,
  type VisualConvenienceProps,
  splitConvenienceProps,
  splitVisualConvenienceProps,
  convenienceToSx,
  visualConvenienceToSx,
  mergeSx,
  sizeConvenienceClassNames,
} from "../types";
import "./Dialog.scss";

// --- Dialog ---
export interface DialogProps
  extends Omit<ConvenienceProps, "maxWidth">,
  Omit<MuiDialogProps, "color"> {
  size?: ComponentSize;
}

export const Dialog = forwardRef<HTMLDivElement, DialogProps>(
  function Dialog(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, ...muiProps }] =
      splitConvenienceProps(props, ["maxWidth"]);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiDialogProps["sx"]);

    return (
      <MuiDialog
        ref={ref}
        className={clsx(
          "Dialog__base",
          "ok-dialog",
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

// --- DialogTitle ---
export interface DialogTitleProps
  extends VisualConvenienceProps,
  MuiDialogTitleProps {
  size?: ComponentSize;
}

export const DialogTitle = forwardRef<HTMLDivElement, DialogTitleProps>(
  function DialogTitle(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const { size = defaultSize, ...rest } = props;
    const [convProps, { sx, className, ...muiProps }] =
      splitVisualConvenienceProps(rest);
    const convSx = visualConvenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiDialogTitleProps["sx"]);

    return (
      <MuiDialogTitle
        ref={ref}
        className={clsx(
          "Dialog__title",
          "ok-dialog-title",
          sizeClass(size),
          sizeConvenienceClassNames(rest as Record<string, unknown>),
          className,
        )}
        sx={mergedSx}
        {...muiProps}
      />
    );
  }
);

// --- DialogContent ---
export interface DialogContentProps
  extends VisualConvenienceProps,
  MuiDialogContentProps {
  size?: ComponentSize;
}

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  function DialogContent(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const { size = defaultSize, ...rest } = props;
    const [convProps, { sx, className, ...muiProps }] =
      splitVisualConvenienceProps(rest);
    const convSx = visualConvenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiDialogContentProps["sx"]);

    return (
      <MuiDialogContent
        ref={ref}
        className={clsx(
          "Dialog__content",
          "ok-dialog-content",
          sizeClass(size),
          sizeConvenienceClassNames(rest as Record<string, unknown>),
          className,
        )}
        sx={mergedSx}
        {...muiProps}
      />
    );
  }
);

// --- DialogActions ---
export interface DialogActionsProps
  extends VisualConvenienceProps,
  MuiDialogActionsProps {
  size?: ComponentSize;
}

export const DialogActions = forwardRef<HTMLDivElement, DialogActionsProps>(
  function DialogActions(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const { size = defaultSize, ...rest } = props;
    const [convProps, { sx, className, ...muiProps }] =
      splitVisualConvenienceProps(rest);
    const convSx = visualConvenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiDialogActionsProps["sx"]);

    return (
      <MuiDialogActions
        ref={ref}
        className={clsx(
          "Dialog__actions",
          "ok-dialog-actions",
          sizeClass(size),
          sizeConvenienceClassNames(rest as Record<string, unknown>),
          className,
        )}
        sx={mergedSx}
        {...muiProps}
      />
    );
  }
);
