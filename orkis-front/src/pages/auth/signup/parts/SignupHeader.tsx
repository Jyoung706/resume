// ============================================
// SignupHeader — 로고 + 타이틀 + 사용자 유형 Chip
// ============================================

import { Chip, FlexBox, Img, Stack, Typography } from "@/components";
import { useThemeModeContext } from "@/design-system";
import "./signup.parts.scss";

// ============================================
// 사용자 유형별 Chip 설정
// ============================================
const USER_TYPE_CONFIG: Record<string, { label: string }> = {
  free: {
    label: "일반 사용자",
  },
  pro: {
    label: "기업 사용자",
  },
  admin: {
    label: "기업 관리자",
  },
};

export interface SignupHeaderProps {
  /** 사용자 유형 (free / pro / admin) */
  userType: string;
  /** OAuth 사용자 정보 (소셜 로그인 시) */
  oauthUser?: { provider: string } | null;
  /** 로고만 표시 */
  logoOnly?: boolean;
  /** 타이틀 + sub text만 표시 */
  titleOnly?: boolean;
}

export function SignupHeader({
  userType,
  oauthUser,
  logoOnly,
  titleOnly,
}: SignupHeaderProps) {

  const { resolvedMode } = useThemeModeContext();

  const typeConfig = USER_TYPE_CONFIG[userType] ?? USER_TYPE_CONFIG.free;
  const chipLabel = typeConfig.label;

  if (titleOnly) {
    return (
      <Stack className="SignupHeader__title-group">
        <FlexBox className="SignupHeader__title-row">
          <Typography
            className="SignupHeader__title"
            variant="h4"
            color="var(--text-color)"
          >
            {oauthUser ? "회원 정보 입력" : "회원가입"}
          </Typography>
          <Chip
            className="SignupHeader__chip"
            label={chipLabel}
            size="small"
            data-user-type={userType}
          />
        </FlexBox>

        <Typography
          className="SignupHeader__subtitle"
          variant="body2"
          color="var(--text-muted)"
        >
          {oauthUser
            ? `${oauthUser.provider} 계정으로 가입 중입니다. 추가 정보를 입력해주세요.`
            : "회원가입으로 다양한 혜택을 누려보세요!"}
        </Typography>
      </Stack>
    );
  }

  if (logoOnly) {
    return (
      <FlexBox className="SignupHeader__logo">
        <Img className="SignupHeader__logo-symbol" src={resolvedMode === 'dark' ? '/assets/logo/orkis-symbol-dark.png' : '/assets/logo/orkis-symbol.png'} alt="ORKIS Symbol" />
        <Img className="SignupHeader__logo-text" src={resolvedMode === 'dark' ? '/assets/logo/orkis-text-dark.svg' : '/assets/logo/orkis-text.svg'} alt="ORKIS" />
      </FlexBox>
    );
  }

  return (
    <Stack className="SignupHeader__full">
      {/* ORKIS 로고 */}
      <FlexBox className="SignupHeader__logo">
        <Img className="SignupHeader__logo-symbol" src={resolvedMode === 'dark' ? '/assets/logo/orkis-symbol-dark.png' : '/assets/logo/orkis-symbol.png'} alt="ORKIS Symbol" />
        <Img className="SignupHeader__logo-text" src={resolvedMode === 'dark' ? '/assets/logo/orkis-text-dark.svg' : '/assets/logo/orkis-text.svg'} alt="ORKIS" />
      </FlexBox>

      {/* 타이틀 + 사용자 유형 */}
      <Stack className="SignupHeader__title-group">
        <FlexBox className="SignupHeader__title-row">
          <Typography
            className="SignupHeader__title"
            variant="h4"
            color="var(--text-color)"
          >
            {oauthUser ? "회원 정보 입력" : "회원가입"}
          </Typography>
          <Chip
            className="SignupHeader__chip"
            label={chipLabel}
            size="small"
            data-user-type={userType}
          />
        </FlexBox>

        <Typography
          className="SignupHeader__subtitle"
          color="var(--text-muted)"
        >
          {oauthUser
            ? `${oauthUser.provider} 계정으로 가입 중입니다. 추가 정보를 입력해주세요.`
            : "회원가입으로 다양한 혜택을 누려보세요!"}
        </Typography>
      </Stack>
    </Stack>
  );
}
