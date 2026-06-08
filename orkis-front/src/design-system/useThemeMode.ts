// ============================================
// design-system/useThemeMode.ts
// 테마 모드 관리 훅
// ============================================

import { useState } from "react";
import {
  type ThemeMode,
  DARK_THEMES,
  DEFAULT_THEME,
  isValidTheme,
} from "../themes/themeConfig";

const STORAGE_KEY = "orkis-theme-mode";

/** 순수 함수 — localStorage에서 읽기만 수행 (DOM 조작은 index.html blocking script에서 처리) */
function getInitialMode(): ThemeMode {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored && isValidTheme(stored) ? stored : DEFAULT_THEME;
}

export function useThemeMode() {
  const [mode, setModeState] = useState<ThemeMode>(getInitialMode);

  // ThemeMode → MUI palette.mode 매핑
  const resolvedMode: "light" | "dark" =
    DARK_THEMES.includes(mode) ? "dark" : "light";

  // 이벤트 핸들러에서 호출 — side effect 허용 (Rules of React 위반 아님)
  const setMode = (newMode: ThemeMode) => {
    // 전환 1프레임 동안 모든 transition/animation 잠금 → 무지개색 깜빡임 차단
    document.documentElement.classList.add("theme-transitioning");
    document.documentElement.setAttribute("data-theme", newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
    setModeState(newMode);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.documentElement.classList.remove("theme-transitioning");
    }));
  };

  return { mode, setMode, resolvedMode };
}
