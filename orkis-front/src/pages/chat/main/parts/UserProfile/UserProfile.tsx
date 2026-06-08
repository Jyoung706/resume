// ============================================
// UserProfile — 사용자 프로필 표시
// Design Layer: props 기반 (로직 없음)
// ============================================

import clsx from "clsx";
import { Avatar, FlexBox, Stack, Typography } from "@/components";
import { stringAvatar } from "./avatarColor";
import "../chat.parts.scss";

// ============================================
// Props
// ============================================

export interface UserProfileProps {
  /** 사용자 이름 */
  name: string;
  /** 이메일 (선택) */
  email?: string;
  /** 프로필 이미지 URL (외부에서 로드 완료 후 전달) */
  avatarUrl?: string;
  /** 색상 해시 기준 식별자 (email 또는 id). 미전달 시 name 사용 */
  userIdentifier?: string;
  /** 사이드바 접힘 상태 */
  isCollapsed?: boolean;
  /** 클릭 핸들러 */
  onClick?: () => void;
  /** 하단 확장 슬롯 (질문 횟수 등 외부 주입) */
  children?: React.ReactNode;
}

// ============================================
// Constants
// ============================================

const AVATAR_SIZE_DEFAULT = "3rem";
const AVATAR_SIZE_COLLAPSED = "2.625rem";

// ============================================
// UserProfile
// ============================================

export function UserProfile({
  name,
  email,
  avatarUrl,
  userIdentifier,
  isCollapsed = false,
  onClick,
  children
}: UserProfileProps) {
  const avatarSize = isCollapsed ? AVATAR_SIZE_COLLAPSED : AVATAR_SIZE_DEFAULT;
  const { bgcolor, textColor } = stringAvatar(userIdentifier || name);

  return (
    <FlexBox
      className={clsx(
        "UserProfile__container",
        onClick && "UserProfile__clickable"
      )}
      onClick={onClick}
    >
      {/* 아바타 */}
      {avatarUrl ? (
        <Avatar
          src={avatarUrl}
          alt={name}
          width={avatarSize}
          height={avatarSize}
        />
      ) : (
        <Avatar
          width={avatarSize}
          height={avatarSize}
          bgcolor={bgcolor}
          textColor={textColor}
        >
          {name.charAt(0).toUpperCase()}
        </Avatar>
      )}

      {/* 이름 + 이메일 + children */}
      {!isCollapsed && (
        <Stack className="UserProfile__info">
          <Typography className="UserProfile__name" noWrap>
            {name}
          </Typography>
          {email && (
            <Typography className="UserProfile__email" noWrap>
              {email}
            </Typography>
          )}
          {children}
        </Stack>
      )}
    </FlexBox>
  );
}
