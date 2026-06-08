// ============================================
// UserSectionConnector — 사용자 정보 섹션 커넥터
// 소유 훅: useAuthStore, useProfileImage, useBackgroundImage, useChangePassword
// ============================================

import { FlexBox, Typography } from "@/components";
import { UserProfileSection } from "@/components/domain/UserProfileSection";
import { useAuthStore } from "@/logic/common/auth/authStore";
import { useProfileImage } from "@/logic/common/profile/useProfileImage";
import { useBackgroundImage } from "@/logic/common/background/useBackgroundImage";
import { useChangePassword } from "@/logic/chat/panels/settings/useChangePassword";

export function UserSectionConnector() {
  const user = useAuthStore((s) => s.user);
  const { profileImageUrl, isLoading: profileImageLoading, uploadImage, deleteImage } = useProfileImage();
  const {
    backgroundImageUrl,
    isLoading: backgroundImageLoading,
    uploadImage: uploadBgImage,
    deleteImage: deleteBgImage,
  } = useBackgroundImage();
  const {
    changePassword: handlePasswordChange,
    passwordChangeLoading,
    resendVerification: handleResendVerification,
    resendVerificationLoading,
  } = useChangePassword();

  if (!user) {
    return (
      <FlexBox className="Panel__placeholder">
        <Typography className="Panel__placeholder-text">
          로그인 정보 없음
        </Typography>
      </FlexBox>
    );
  }

  return (
    <UserProfileSection
      name={user.name || "사용자"}
      email={user.email}
      userId={user.id}
      profileImage={profileImageUrl ?? user.profileImage}
      loginType={user.LOGIN_TYPE || user.provider}
      emailVerified={
        user.EMAIL_VERIFIED != null
          ? Boolean(user.EMAIL_VERIFIED)
          : undefined
      }
      onProfileImageUpload={uploadImage}
      onProfileImageDelete={deleteImage}
      profileImageLoading={profileImageLoading}
      backgroundImage={backgroundImageUrl}
      onBackgroundImageUpload={uploadBgImage}
      onBackgroundImageDelete={deleteBgImage}
      backgroundImageLoading={backgroundImageLoading}
      onPasswordChange={handlePasswordChange}
      passwordChangeLoading={passwordChangeLoading}
      onResendVerification={handleResendVerification}
      resendVerificationLoading={resendVerificationLoading}
    />
  );
}
