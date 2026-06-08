// ============================================
// UserProfileSection — 환경설정 사용자 정보 (읽기 전용 + 이미지 관리)
// Design Layer: props 기반 (로직 없음)
// ============================================

import { useRef, useState } from "react";
import {
  Avatar,
  Button,
  CircularProgress,
  Collapse,
  Divider,
  EditIcon,
  FlexBox,
  Icon,
  IconButton,
  Menu,
  MenuItem,
  Typography,
} from "@/components";
import { stringAvatar } from "./avatarColor";
import { PasswordChangeForm } from "./PasswordChangeForm";
import "./UserProfileSection.scss";

// ============================================
// Props
// ============================================

export interface UserProfileSectionProps {
  /** 사용자 이름 */
  name: string;
  /** 이메일 */
  email?: string;
  /** 사용자 ID */
  userId?: string;
  /** 프로필 이미지 URL */
  profileImage?: string | null;
  /** 로그인 유형 (예: "ID", "google", "naver", "kakao") */
  loginType?: string;
  /** 이메일 인증 여부 */
  emailVerified?: boolean;

  // ── 프로필 이미지 관리 콜백 (P2 — STEP 3) ──
  /** 프로필 이미지 업로드 콜백 */
  onProfileImageUpload?: (file: File) => void;
  /** 프로필 이미지 삭제 콜백 */
  onProfileImageDelete?: () => void;
  /** 프로필 이미지 로딩 상태 */
  profileImageLoading?: boolean;

  // ── 배경 이미지 관리 콜백 (P2 — STEP 4) ──
  /** 배경 이미지 URL */
  backgroundImage?: string | null;
  /** 배경 이미지 업로드 콜백 */
  onBackgroundImageUpload?: (file: File) => void;
  /** 배경 이미지 삭제 콜백 */
  onBackgroundImageDelete?: () => void;
  /** 배경 이미지 로딩 상태 */
  backgroundImageLoading?: boolean;

  // ── 비밀번호 변경 콜백 (P2 — STEP 5) ──
  /** 비밀번호 변경 콜백 (소셜 로그인이 아닌 경우에만 표시) */
  onPasswordChange?: (currentPassword: string, newPassword: string) => void;
  /** 비밀번호 변경 로딩 상태 */
  passwordChangeLoading?: boolean;

  // ── 이메일 인증 재발송 (P2 — STEP 6) ──
  /** 이메일 인증 재발송 콜백 */
  onResendVerification?: () => void;
  /** 이메일 인증 재발송 로딩 상태 */
  resendVerificationLoading?: boolean;
}

// ============================================
// 로그인 유형 라벨
// ============================================

const LOGIN_TYPE_LABEL: Record<string, string> = {
  password: "ID/PW 로그인",
  google: "Google",
  naver: "Naver",
  kakao: "Kakao",
  apple: "Apple",
  github: "GitHub",
};

const SOCIAL_LOGIN_TYPES = new Set(["google", "naver", "kakao", "apple", "github"]);

function getLoginTypeLabel(type: string | undefined): string {
  if (!type) return "ID/PW 로그인";
  const key = type.toLowerCase();
  return LOGIN_TYPE_LABEL[key] ?? type;
}

function isSocialLogin(type: string | undefined): boolean {
  if (!type) return false;
  return SOCIAL_LOGIN_TYPES.has(type.toLowerCase());
}

// ============================================
// UserProfileSection
// ============================================

export function UserProfileSection({
  name,
  email,
  userId,
  profileImage,
  loginType,
  emailVerified,
  onProfileImageUpload,
  onProfileImageDelete,
  profileImageLoading,
  backgroundImage,
  onBackgroundImageUpload,
  onBackgroundImageDelete,
  backgroundImageLoading,
  onPasswordChange,
  passwordChangeLoading,
  onResendVerification,
  resendVerificationLoading,
}: UserProfileSectionProps) {
  // 좌측 사이드바 UserProfile과 동일한 식별자 사용 (일관된 아바타 색상)
  const { bgcolor, textColor } = stringAvatar(name);

  // ── 프로필 이미지 파일 input ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasImageCallbacks = !!(onProfileImageUpload || onProfileImageDelete);

  // ── 프로필 이미지 메뉴 ──
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<HTMLElement | null>(null);
  const profileMenuOpen = Boolean(profileMenuAnchor);

  const handleAvatarClick = (e: React.MouseEvent<HTMLElement>) => {
    if (hasImageCallbacks) setProfileMenuAnchor(e.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null);
  };

  const handleProfileUploadClick = () => {
    handleProfileMenuClose();
    fileInputRef.current?.click();
  };

  const handleProfileDeleteClick = () => {
    handleProfileMenuClose();
    onProfileImageDelete?.();
  };

  // ── 배경 이미지 파일 input ──
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const hasBgCallbacks = !!(onBackgroundImageUpload || onBackgroundImageDelete);

  // ── 배경 이미지 미리보기 접기/펼치기 ──
  const [bgPreviewOpen, setBgPreviewOpen] = useState(false);

  // ── 비밀번호 변경 폼 접기/펼치기 ──
  const [passwordOpen, setPasswordOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onProfileImageUpload) {
      onProfileImageUpload(file);
    }
    // input 초기화 (같은 파일 재선택 가능)
    e.target.value = "";
  };

  // ── 배경 이미지 핸들러 ──
  const handleBgUploadClick = () => {
    bgFileInputRef.current?.click();
  };

  const handleBgFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onBackgroundImageUpload) {
      onBackgroundImageUpload(file);
    }
    e.target.value = "";
  };

  // ── 아바타 렌더링 ──
  const avatarContent = profileImageLoading ? (
    <Avatar
      bgcolor={bgcolor}
      className="UserProfileSection__avatar"
    >
      <CircularProgress size={20} />
    </Avatar>
  ) : profileImage ? (
    <Avatar
      src={profileImage}
      alt={name}
      className="UserProfileSection__avatar"
    />
  ) : (
    <Avatar
      bgcolor={bgcolor}
      textColor={textColor}
      className="UserProfileSection__avatar"
    >
      {name.charAt(0).toUpperCase()}
    </Avatar>
  );

  return (
    <FlexBox className="UserProfileSection">
      {/* ── 아바타 + 이름/이메일 ──────────── */}
      <FlexBox className="UserProfileSection__header">
        <div
          className={`UserProfileSection__avatar-wrap${hasImageCallbacks ? " UserProfileSection__avatar-wrap--clickable" : ""}`}
          onClick={handleAvatarClick}
        >
          {avatarContent}
          {hasImageCallbacks && (
            <div className="UserProfileSection__avatar-badge">
              {/* <Icon size="small" className="UserProfileSection__edit-icon">EditIcon</Icon> */}
              <EditIcon fontSize="small" className="UserProfileSection__edit-icon" />
            </div>
          )}
        </div>

        <FlexBox className="UserProfileSection__name-block">
          <Typography className="UserProfileSection__name">
            {name}
          </Typography>
          {email && (
            <FlexBox className="UserProfileSection__email-row">
              <Typography className="UserProfileSection__email">
                {email}
              </Typography>
              {/* {emailVerified !== undefined && (
                <Chip
                  label={emailVerified ? "인증됨" : "미인증"}
                  size="xsmall"
                  color={emailVerified ? "success" : "default"}
                  variant="outlined"
                  className="UserProfileSection__verify-chip"
                />
              )} */}
              {emailVerified === false && onResendVerification && (
                <Typography
                  size="xsmall"
                  className="UserProfileSection__resend-link"
                  onClick={resendVerificationLoading ? undefined : onResendVerification}
                >
                  {resendVerificationLoading ? "발송 중..." : "이메일 인증"}
                </Typography>
              )}
            </FlexBox>
          )}
        </FlexBox>
      </FlexBox>

      {/* ── 프로필 이미지 메뉴 (아바타 클릭 시 표출) ── */}
      {hasImageCallbacks && (
        <>
          <Menu
            anchorEl={profileMenuAnchor}
            open={profileMenuOpen}
            onClose={handleProfileMenuClose}
            className="UserProfileSection__menu"
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            transformOrigin={{ vertical: "top", horizontal: "center" }}
          >
            <MenuItem onClick={handleProfileUploadClick}>사진 변경</MenuItem>
            {profileImage && onProfileImageDelete && (
              <MenuItem onClick={handleProfileDeleteClick}>사진 삭제</MenuItem>
            )}
          </Menu>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            hidden
            onChange={handleFileChange}
          />
        </>
      )}

      <Divider className="UserProfileSection__divider" />

      {/* ── 상세 정보 ────────────────────── */}
      <FlexBox className="UserProfileSection__details">
        {userId && (
          <FlexBox className="UserProfileSection__row">
            <Typography className="UserProfileSection__label">
              사용자 ID
            </Typography>
            <Typography className="UserProfileSection__value">
              {userId}
            </Typography>
          </FlexBox>
        )}

        <FlexBox className="UserProfileSection__row">
          <Typography className="UserProfileSection__label">
            로그인 유형
          </Typography>
          <Typography className="UserProfileSection__value">
            {getLoginTypeLabel(loginType)}
          </Typography>
        </FlexBox>
      </FlexBox>

      {/* ── 배경 이미지 관리 (STEP 4) ── */}
      {hasBgCallbacks && (
        <>
          <Divider className="UserProfileSection__divider" />

          <FlexBox className="UserProfileSection__bg-section">
            <FlexBox className="UserProfileSection__bg-header">
              <Typography className="UserProfileSection__label">
                채팅방 배경
              </Typography>
              <FlexBox className="UserProfileSection__bg-actions">
                <FlexBox className="UserProfileSection__bg-buttons">
                  <Button
                    variant="outlined"
                    size="xsmall"
                    onClick={handleBgUploadClick}
                    className="UserProfileSection__action-btn"
                  >
                    {backgroundImage ? "배경 변경" : "배경 등록"}
                  </Button>
                  {backgroundImage && onBackgroundImageDelete && (
                    <Button
                      variant="outlined"
                      size="xsmall"
                      onClick={onBackgroundImageDelete}
                      className="UserProfileSection__action-btn"
                    >
                      배경 삭제
                    </Button>
                  )}
                </FlexBox>
                {backgroundImage && (
                  <IconButton
                    size="xsmall"
                    onClick={() => setBgPreviewOpen((v) => !v)}
                    className={`UserProfileSection__expand-btn${bgPreviewOpen ? " UserProfileSection__expand-btn--open" : ""}`}
                  >
                    <Icon mui className="UserProfileSection__expand-icon">ExpandMoreIcon</Icon>
                  </IconButton>
                )}
              </FlexBox>
            </FlexBox>

            {backgroundImageLoading && (
              <FlexBox className="UserProfileSection__bg-preview">
                <CircularProgress size={24} />
              </FlexBox>
            )}

            {backgroundImage && (
              <Collapse in={bgPreviewOpen}>
                <div className="UserProfileSection__bg-preview">
                  <img
                    src={backgroundImage}
                    alt="배경 이미지"
                    className="UserProfileSection__bg-image"
                  />
                </div>
              </Collapse>
            )}
          </FlexBox>

          <input
            ref={bgFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            hidden
            onChange={handleBgFileChange}
          />
        </>
      )}

      {/* ── 비밀번호 변경 (비소셜 전용, STEP 5) ── */}
      {onPasswordChange && !isSocialLogin(loginType) && (
        <>
          <Divider className="UserProfileSection__divider" />
          <FlexBox className="UserProfileSection__row">
            <Typography className="UserProfileSection__label">
              비밀번호
            </Typography>
            <Typography
              className="UserProfileSection__password-link"
              onClick={() => setPasswordOpen((v) => !v)}
            >
              비밀번호 변경
            </Typography>
          </FlexBox>
          <Collapse in={passwordOpen} unmountOnExit>
            <PasswordChangeForm
              onSubmit={(current, newPw) => {
                onPasswordChange(current, newPw);
                setPasswordOpen(false);
              }}
              isLoading={passwordChangeLoading}
            />
          </Collapse>
        </>
      )}
    </FlexBox>
  );
}
