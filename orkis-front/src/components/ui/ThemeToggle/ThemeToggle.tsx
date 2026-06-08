// ============================================
// ui/ThemeToggle — 라이트/다크 2단 아이콘 토글
// Design Layer: props-only (resolvedMode + onToggle 만 받음)
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import { Brightness4Icon, Brightness7Icon, IconButton } from "@/components";

export interface ThemeToggleProps {
  className?: string;
  /** "light" | "dark" — useThemeMode 의 resolvedMode 그대로 전달 */
  resolvedMode: "light" | "dark";
  /** 클릭 시 호출 — 다음 모드로 전환 */
  onToggle: () => void;
  /** 접근성: 다음 상태 설명. 미지정 시 한국어 기본값 */
  ariaLabel?: string;
  disabled?: boolean;
}

export const ThemeToggle = forwardRef<HTMLButtonElement, ThemeToggleProps>(
  function ThemeToggle(
    { className, resolvedMode, onToggle, ariaLabel, disabled },
    ref,
  ) {
    const isDark = resolvedMode === "dark";
    const label =
      ariaLabel ?? (isDark ? "라이트 모드로 전환" : "다크 모드로 전환");
    return (
      <IconButton
        ref={ref}
        disabled={disabled}
        onClick={onToggle}
        aria-label={label}
        className={clsx("ThemeToggle", className)}
      >
        {isDark ? <Brightness7Icon /> : <Brightness4Icon />}
      </IconButton>
    );
  },
);
