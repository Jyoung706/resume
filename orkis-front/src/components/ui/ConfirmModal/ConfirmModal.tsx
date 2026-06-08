// ============================================
// ui/ConfirmModal — 확인/취소 모달
// 기존 Modal 컴포넌트를 활용한 표준 확인 패턴
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import { Box } from "../../base/Box";
import { Typography } from "../../base/Typography";
import { Button } from "../../base/Button";
import { Modal, type ModalProps } from "../Modal";
import "./ConfirmModal.scss";


export interface ConfirmModalProps extends Omit<ModalProps, "title" | "actions" | "children"> {
  /** 모달 제목 */
  title: string;
  /** 확인 메시지 (줄바꿈 지원) */
  message: string;
  /** 확인 버튼 클릭 핸들러 */
  onConfirm: () => void;
  /** 확인 버튼 텍스트 */
  confirmText?: string;
  /** 취소 버튼 텍스트 */
  cancelText?: string;
  /** 확인 버튼 색상 */
  confirmColor?: "primary" | "error" | "warning" | "success";
}

export const ConfirmModal = forwardRef<HTMLDivElement, ConfirmModalProps>(
  function ConfirmModal(
    {
      title,
      message,
      onConfirm,
      confirmText = "확인",
      cancelText = "취소",
      confirmColor = "primary",
      size = "small",
      className,
      ...modalProps
    },
    ref,
  ) {
    const handleConfirm = () => {
      onConfirm();
    };

    return (
      <Modal
        ref={ref}
        className={clsx("ConfirmModal__base", "ok-confirm-modal", "AlertModal__base", className)}
        title={title}
        size={size}
        showClose={false}
        actions={
          <>
            <Button
              onClick={(e) => modalProps.onClose?.(e, "escapeKeyDown")}
              variant="outlined"
              color="inherit"
            >
              {cancelText}
            </Button>
            <Button
              onClick={handleConfirm}
              variant="contained"
              color={confirmColor}
            >
              {confirmText}
            </Button>
          </>
        }
        {...modalProps}
      >
        <Box className="ConfirmModal__message ok-confirm-modal-message">
          <Typography variant="body1">{message}</Typography>
        </Box>
      </Modal>
    );
  },
);
