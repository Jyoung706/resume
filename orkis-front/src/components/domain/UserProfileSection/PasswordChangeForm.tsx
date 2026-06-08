// ============================================
// PasswordChangeForm — 비밀번호 변경 인라인 폼
// Design Layer: props 기반 (로직 없음)
// ============================================

import { useState } from "react";
import { Button, FlexBox, Typography } from "@/components";
import { PasswordInput } from "@/components/ui/PasswordInput";
import "./PasswordChangeForm.scss";

// ============================================
// Props
// ============================================

export interface PasswordChangeFormProps {
  /** 비밀번호 변경 콜백 */
  onSubmit: (current: string, newPassword: string) => void;
  /** 로딩 상태 */
  isLoading?: boolean;
}

// ============================================
// 유효성 검사
// ============================================

const MIN_LENGTH = 8;

interface FormErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

function validate(
  current: string,
  newPw: string,
  confirm: string,
): FormErrors {
  const errors: FormErrors = {};
  if (!current) errors.currentPassword = "현재 비밀번호를 입력하세요.";
  if (!newPw) {
    errors.newPassword = "새 비밀번호를 입력하세요.";
  } else if (newPw.length < MIN_LENGTH) {
    errors.newPassword = `비밀번호는 최소 ${MIN_LENGTH}자 이상이어야 합니다.`;
  }
  if (!confirm) {
    errors.confirmPassword = "비밀번호 확인을 입력하세요.";
  } else if (newPw && confirm !== newPw) {
    errors.confirmPassword = "비밀번호가 일치하지 않습니다.";
  }
  return errors;
}

// ============================================
// PasswordChangeForm
// ============================================

export function PasswordChangeForm({
  onSubmit,
  isLoading,
}: PasswordChangeFormProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const handleSubmit = () => {
    const errs = validate(currentPassword, newPassword, confirmPassword);
    setErrors(errs);

    if (Object.keys(errs).length === 0) {
      onSubmit(currentPassword, newPassword);
      // 폼 초기화
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <FlexBox className="PasswordChangeForm">
      {/* <Typography className="PasswordChangeForm__title">
        비밀번호 변경
      </Typography> */}

      <FlexBox className="PasswordChangeForm__fields">
        <FlexBox className="PasswordChangeForm__field-group">
          {/* <Typography className="PasswordChangeForm__label">
            현재 비밀번호
          </Typography> */}
          <PasswordInput
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="현재 비밀번호"
            fullWidth
            error={!!errors.currentPassword}
          />
          {errors.currentPassword && (
            <Typography className="PasswordChangeForm__error">
              {errors.currentPassword}
            </Typography>
          )}
        </FlexBox>

        <FlexBox className="PasswordChangeForm__field-group">
          {/* <Typography className="PasswordChangeForm__label">
            새 비밀번호
          </Typography> */}
          <PasswordInput
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="새 비밀번호 (최소 8자)"
            fullWidth
            error={!!errors.newPassword}
          />
          {errors.newPassword && (
            <Typography className="PasswordChangeForm__error">
              {errors.newPassword}
            </Typography>
          )}
        </FlexBox>

        <FlexBox className="PasswordChangeForm__field-group">
          {/* <Typography className="PasswordChangeForm__label">
            비밀번호 확인
          </Typography> */}
          <PasswordInput
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="비밀번호 확인"
            fullWidth
            error={!!errors.confirmPassword}
          />
          {errors.confirmPassword && (
            <Typography className="PasswordChangeForm__error">
              {errors.confirmPassword}
            </Typography>
          )}
        </FlexBox>
      </FlexBox>

      <Button
        variant="contained"
        size="small"
        color="primary"
        onClick={handleSubmit}
        disabled={isLoading}
        fullWidth
      >
        {isLoading ? "변경 중..." : "비밀번호 변경"}
      </Button>
    </FlexBox>
  );
}
