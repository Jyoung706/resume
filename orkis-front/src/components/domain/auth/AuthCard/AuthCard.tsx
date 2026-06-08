// ============================================
// domain/auth/AuthCard — Auth 페이지 공용 카드 컨테이너
// ============================================
// CSS 보존 정책: 시각은 pages/auth/_auth.mixin.scss(auth.card / auth.card-title /
// auth.card-subtitle)가 100% 책임. AuthCard.scss 는 mixin을 @include 호출만.
// 페이지 className(예: "LoginPage__card")을 위임받아 페이지 SCSS의 modifier가
// 적용 후에도 그대로 동작.
//
// 적용 매트릭스 (Phase 2 T2-3 적용 예정):
//   - LoginPage / SignupPage / EmailVerificationPage : title + subtitle + form children
//   - ForgotPasswordPage (2단계) : title + subtitle + form/완료 children
//   - ResetPasswordPage (4상태):
//       - validating : 미적용 (title 없음)
//       - success : leadingIcon + title + subtitle + button
//       - error/expired : leadingIcon + title + subtitle + btn-group
//       - default(form) : title + subtitle + Form
// ============================================

import { type ReactNode } from "react";
import clsx from "clsx";
import { Paper } from "../../../base/Paper";
import { Typography } from "../../../base/Typography";
import "./AuthCard.scss";

export interface AuthCardProps {
  /** 카드 타이틀 (validating 상태 등 미사용 케이스 위해 optional) */
  title?: string;
  /** 부제목 */
  subtitle?: string | ReactNode;
  /** title 앞쪽 상태 아이콘 슬롯 (success/error 아이콘 등) */
  leadingIcon?: ReactNode;
  /** 카드 본문 */
  children: ReactNode;
  /** 하단 보조 영역 (비밀번호 찾기 링크 등) */
  footer?: ReactNode;
  /** 페이지 SCSS 위임용 className (예: "LoginPage__card") */
  className?: string;
}

/**
 * Auth 페이지(login/signup/forgot/reset/email-verify) 공용 카드 컨테이너.
 * 시각은 `auth.mixin` + 페이지별 `__card` SCSS가 책임.
 * ResetPasswordPage의 `validating` 상태는 미적용 — 별도 처리.
 *
 * @since 2026-05-14 (UI uniformity plan r3)
 * @see docs/2026-05-14/orkis-front-ui-uniformity-improvement-plan.md §5.2
 */
export function AuthCard({
  title,
  subtitle,
  leadingIcon,
  children,
  footer,
  className,
}: AuthCardProps) {
  return (
    <Paper className={clsx("AuthCard", className)} elevation={0}>
      {leadingIcon && (
        <div className="AuthCard__leading-icon">{leadingIcon}</div>
      )}
      {title && (
        <Typography variant="h3" className="AuthCard__title">
          {title}
        </Typography>
      )}
      {subtitle && (
        <Typography
          variant="body2"
          color="text.secondary"
          className="AuthCard__subtitle"
        >
          {subtitle}
        </Typography>
      )}
      {children}
      {footer && <div className="AuthCard__footer">{footer}</div>}
    </Paper>
  );
}
