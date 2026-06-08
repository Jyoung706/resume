// ============================================
// ui/AlertModal — 표준 알림 모달
//
// 디자인 패턴 (orkis 표준 alert):
//   ┌──────────────────────[X]┐   ← 우상단 닫기, 제목 없음
//   │                         │
//   │           ⓘ             │   ← severity별 중앙 아이콘
//   │                         │
//   │   메시지 본문 (centered)  │
//   │                         │
//   │      [액션 링크]          │   ← 하단 텍스트 링크 (선택)
//   │                         │
//   │      ┌──────┐           │
//   │      │ 확인  │           │   ← severity 색상 확인 버튼 (기본 표시)
//   │      └──────┘           │
//   └─────────────────────────┘
//
// CLAUDE.md Modal 시맨틱 (alert/경고/위험 - 결정 강제) 분류에 해당.
// ============================================

import { Dialog } from "@/components/base/Dialog";
import {
  Button,
  DialogActions,
  DialogContent,
  IconButton,
  Typography,
} from "@/components/base";
import { Icon } from "@/components/ui/Icon";
import { FlexBox } from "@/components/layout";
import "./AlertModal.scss";

export type AlertSeverity = "info" | "warning" | "error" | "success";

/** severity → 아이콘 매핑 (Material Symbols) */
const ICON_BY_SEVERITY: Record<AlertSeverity, string> = {
  info: "info",            // ⓘ 원형 i
  warning: "warning",      // ⚠️ 삼각형 (전통적 warning)
  error: "error",          // ⊗ 원형 ! (위험/오류)
  success: "check_circle", // ✓ 원형 체크
};

/** severity → MUI Button color 매핑 */
const BUTTON_COLOR_BY_SEVERITY: Record<
  AlertSeverity,
  "info" | "warning" | "error" | "success"
> = {
  info: "info",
  warning: "warning",
  error: "error",
  success: "success",
};

export interface AlertModalProps {
  open: boolean;
  onClose: () => void;
  /** 시맨틱 — 아이콘/색상 결정. 기본 "info" */
  severity?: AlertSeverity;
  /** 본문 메시지 (줄바꿈 \n 지원) */
  message: string;

  /** 확인 버튼 텍스트. 기본 "확인". null로 명시하면 버튼 미표시 (X 닫기만) */
  confirmText?: string | null;
  /** 확인 버튼 클릭 — 미지정 시 onClose 호출 */
  onConfirm?: () => void;

  /** 보조 액션 링크 텍스트 (선택) — 예: "오류 확인하기", "DB 설정으로 이동" */
  actionText?: string;
  /** 보조 액션 링크 클릭 — actionText와 함께 지정 */
  onAction?: () => void;
}

export function AlertModal({
  open,
  onClose,
  severity = "info",
  message,
  confirmText = "확인",
  onConfirm,
  actionText,
  onAction,
}: AlertModalProps) {
  const iconName = ICON_BY_SEVERITY[severity];
  const buttonColor = BUTTON_COLOR_BY_SEVERITY[severity];
  const handleConfirm = onConfirm ?? onClose;

  return (
    <Dialog
      className={`AlertModal AlertModal__base AlertModal--${severity}`}
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
    >
      {/* 우상단 X 닫기 (제목 없는 alert 패턴) */}
      <IconButton
        className="AlertModal__close-btn"
        onClick={onClose}
        size="small"
        aria-label="닫기"
      >
        <Icon>close</Icon>
      </IconButton>

      <DialogContent className="AlertModal__content">
        <FlexBox direction="column" align="center" gap={1.5}>
          <Icon className={`AlertModal__icon AlertModal__icon--${severity}`}>
            {iconName}
          </Icon>
          <Typography
            className="AlertModal__message"
            component="div"
            variant="body2"
          >
            {message.split("\n").map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </Typography>
          {actionText && onAction && (
            <button
              type="button"
              className="AlertModal__action-link"
              onClick={onAction}
            >
              {actionText}
            </button>
          )}
        </FlexBox>
      </DialogContent>

      {confirmText && (
        <DialogActions className="AlertModal__actions">
          <Button
            variant="outlined"
            color={buttonColor}
            onClick={handleConfirm}
            className="AlertModal__confirm-btn"
          >
            {confirmText}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
