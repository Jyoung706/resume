// ============================================
// ui/Dialog — 정보 입력/조회 팝업 (Header/Content/Footer 슬롯)
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import {
  Dialog as BaseDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "../../base/Dialog";
import type { DialogProps as BaseDialogProps } from "../../base/Dialog";
import type { ComponentSize } from "@/design-system";
import { Box } from "../../base/Box";
import { Typography } from "../../base/Typography";
import { CloseIcon } from "../../base/MuiIcon";
import { IconButton } from "../../base/IconButton";
import "./Dialog.scss";

export interface DialogProps extends Omit<BaseDialogProps, "maxWidth" | "title" | "size"> {
  /** 팝업 제목 */
  title: string;
  /** 팝업 부제목 (선택) */
  subtitle?: string;
  /** 팝업 크기 프리셋 */
  size?: ComponentSize;
  /** 헤더 닫기(X) 버튼 표시 여부 */
  showClose?: boolean;
  /** Footer 영역 (커스텀 ReactNode) */
  footer?: React.ReactNode;
  /** 컨텐츠 영역 */
  children: React.ReactNode;
}

export const Dialog = forwardRef<HTMLDivElement, DialogProps>(
  function Dialog(
    {
      title,
      subtitle,
      size = "medium",
      showClose = true,
      footer,
      children,
      className,
      ...dialogProps
    },
    ref,
  ) {
    const handleClose = (e: React.MouseEvent | React.KeyboardEvent) => {
      dialogProps.onClose?.(e as any, "escapeKeyDown");
    };

    return (
      <BaseDialog
        ref={ref}
        className={clsx("Dialog", className)}
        size={size}
        maxWidth={false}
        slotProps={{
          paper: {
            className: "Dialog__base Dialog__paper",
          },
        }}
        {...dialogProps}
      >
        {/* ── Header ── */}
        <DialogTitle className="Dialog__header">
          <Box className="Dialog__title-area">
            <Typography className="Dialog__title">{title}</Typography>
            {subtitle && (
              <Typography className="Dialog__subtitle">{subtitle}</Typography>
            )}
          </Box>
          {showClose && (
            <IconButton
              size="small"
              onClick={handleClose}
              aria-label="닫기"
              className="Dialog__close-btn"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </DialogTitle>

        {/* ── Content ── */}
        <DialogContent className="Dialog__content">
          {children}
        </DialogContent>

        {/* ── Footer ── */}
        {footer && (
          <DialogActions className="Dialog__footer">
            {footer}
          </DialogActions>
        )}
      </BaseDialog>
    );
  },
);
