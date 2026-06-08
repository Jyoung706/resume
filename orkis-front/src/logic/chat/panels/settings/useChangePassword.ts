/**
 * useChangePassword — 비밀번호 변경 + 이메일 인증 재발송 Hook
 * SettingsPanelConnector에서 apiPost 직접 호출을 분리
 */
import { useState } from "react";
import { apiPost } from "@/logic/shared/services/request";

export function useChangePassword() {

  // ── 비밀번호 변경 ──
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);

  const changePassword = async (currentPassword: string, newPassword: string) => {
    setPasswordChangeLoading(true);
    try {
      await apiPost("/auth/change-password", {
        currentPassword,
        newPassword,
        confirmPassword: newPassword,
      });
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  // ── 이메일 인증 재발송 ──
  const [resendVerificationLoading, setResendVerificationLoading] =
    useState(false);

  const resendVerification = async () => {
    setResendVerificationLoading(true);
    try {
      await apiPost("/email-verification/send", {});
    } finally {
      setResendVerificationLoading(false);
    }
  };

  return {
    changePassword,
    passwordChangeLoading,
    resendVerification,
    resendVerificationLoading,
  };
}
