// ============================================
// ui/ErrorModal — 에러/경고/안내 모달
//
// 내부적으로 표준 AlertModal을 사용 (orkis 표준 alert UI: 중앙 아이콘 + 메시지 + 선택 링크).
// 기존 호출처(ErrorModalProvider) 호환을 위해 동일 API 유지:
//   - type (error/warning/info) → severity
//   - title 제공 시 메시지 본문 첫 줄에 강조 텍스트로 prepend
//   - confirmText/onConfirm 제공 시 하단 액션 링크로 노출 (미지정 시 X 닫기만)
// ============================================

import { AlertModal, type AlertSeverity } from "../AlertModal";

export type ErrorModalType = "error" | "warning" | "info";

export interface ErrorModalProps {
  open: boolean;
  onClose: () => void;
  /** 모달 타입 — AlertModal severity로 매핑 */
  type?: ErrorModalType;
  /** 제목 (제공 시 메시지 본문 첫 줄에 prepend) */
  title?: string;
  /** 본문 메시지 */
  message: string;
  /** 액션 링크 텍스트 (미지정 시 X 닫기만 노출) */
  confirmText?: string;
  /** 액션 링크 클릭 (미지정 시 onClose 호출) */
  onConfirm?: () => void;
}

const SEVERITY_BY_TYPE: Record<ErrorModalType, AlertSeverity> = {
  error: "error",
  warning: "warning",
  info: "info",
};

export function ErrorModal({
  open,
  onClose,
  type = "error",
  title,
  message,
  confirmText,
  onConfirm,
}: ErrorModalProps) {
  const composedMessage = title ? `${title}\n${message}` : message;

  // confirmText/onConfirm이 있으면 액션 링크로 노출, 없으면 X 닫기만
  const action = confirmText
    ? {
        actionText: confirmText,
        onAction: onConfirm ?? onClose,
      }
    : {};

  return (
    <AlertModal
      open={open}
      onClose={onClose}
      severity={SEVERITY_BY_TYPE[type]}
      message={composedMessage}
      {...action}
    />
  );
}
