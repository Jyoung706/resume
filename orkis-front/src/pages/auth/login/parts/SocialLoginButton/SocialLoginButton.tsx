// ============================================
// SocialLoginButton — 소셜 로그인 버튼
// ============================================

import { type ButtonProps, Button, Img } from "@/components";
import clsx from "clsx";
import "../login.parts.scss";

export interface SocialLoginButtonProps {
  className?: string;
  icon: string;
  iconAlt: string;
  label: string;
  /** MUI 버튼 테마 색상 (inherit, primary 등) → Button에 전달 */
  color?: ButtonProps["color"];
  /** 배경색 (ConvenienceProps) → Button에 전달 */
  bgcolor?: ButtonProps["bgcolor"];
  /** 보더 색상 (ConvenienceProps) → Button에 전달 */
  borderColor?: ButtonProps["borderColor"];
  onClick: () => void;
}

export function SocialLoginButton({
  className,
  icon,
  iconAlt,
  label,
  color,
  bgcolor,
  borderColor,
  onClick
}: SocialLoginButtonProps) {
  return (
    <Button
      className={clsx("SocialLoginButton__root", className)}
      variant="outlined"
      data-provider={iconAlt}
      {...(color != null && { color })}
      {...(bgcolor != null && { bgcolor })}
      {...(borderColor != null && { borderColor })}
      fullWidth
      size="medium"
      onClick={onClick}
    >
      <Img className="SocialLoginButton__icon" src={icon} alt={iconAlt} />
      {label}
    </Button>
  );
}
