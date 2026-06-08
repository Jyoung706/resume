// ============================================
// ui/Modal — 프리셋 크기별 모달
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "../../base/Dialog";
import type { DialogProps } from "../../base/Dialog";
import type { ComponentSize } from "@/design-system";
import { CloseIcon } from "../../base/MuiIcon";
import { IconButton } from "../../base/IconButton";
import "./Modal.scss";


export interface ModalProps extends Omit<DialogProps, "maxWidth" | "title" | "size"> {
  title?: React.ReactNode;
  size?: ComponentSize;
  actions?: React.ReactNode;
  showClose?: boolean;
}

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  function Modal(
    { title, size = "medium", actions, showClose = true, children, className, ...dialogProps },
    ref,
  ) {
    return (
      <Dialog
        ref={ref}
        className={clsx("Modal__base", "ok-modal", className)}
        size={size}
        maxWidth={false}
        slotProps={{
          paper: {
            className: "Dialog__base ok-modal-paper",
          },
        }}
        {...dialogProps}
      >
        {title && (
          <DialogTitle className="Dialog__title ok-modal-title">
            {title}
            {showClose && (
              <IconButton
                size="small"
                onClick={(e) =>
                  dialogProps.onClose?.(e, "escapeKeyDown")
                }
                aria-label="닫기"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </DialogTitle>
        )}
        <DialogContent>{children}</DialogContent>
        {actions && <DialogActions>{actions}</DialogActions>}
      </Dialog>
    );
  },
);
