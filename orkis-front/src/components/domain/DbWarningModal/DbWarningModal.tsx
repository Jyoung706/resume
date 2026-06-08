// ============================================
// DbWarningModal — DB 미선택 경고 알림 모달
// orkis 표준 alert UI (중앙 아이콘 + 메시지 + 선택적 액션 링크) 기반.
// 일반 채팅 / Pro 모드 양쪽에서 동일 사용.
// ============================================

import { AlertModal } from "@/components";

export interface DbWarningModalProps {
  open: boolean;
  onClose: () => void;
  /** 본문 메시지. 기본 안내 문구 사용 */
  message?: string;
  /** 액션 링크 텍스트 — 미지정 시 닫기만 노출 (DB 설정으로 이동 등의 진입점으로 활용 가능) */
  actionText?: string;
  /** 액션 링크 클릭 — actionText와 함께 지정 */
  onAction?: () => void;
}

const DEFAULT_MESSAGE =
  "질문을 전송하려면 RAG 전처리가 완료된 DB를 선택해야 합니다.";

export function DbWarningModal({
  open,
  onClose,
  message = DEFAULT_MESSAGE,
  actionText,
  onAction,
}: DbWarningModalProps) {
  return (
    <AlertModal
      open={open}
      onClose={onClose}
      severity="warning"
      message={message}
      actionText={actionText}
      onAction={onAction}
    />
  );
}
