// ============================================
// design-system/ThemeModeContext.tsx
// 테마 모드 Context Provider
// ============================================
// StyledEngineProvider injectFirst: MUI CSS를 먼저 주입하여
// SCSS가 MUI 기본 CSS 변수를 오버라이드할 수 있도록 함
// ============================================

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  StyledEngineProvider,
  ThemeProvider as MuiThemeProvider,
} from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { useThemeMode } from "./useThemeMode";
import type { ThemeMode } from "../themes/themeConfig";
import { appTheme } from "./defaultTheme";
import { ComponentSizeProvider } from "./ComponentSizeContext";

interface ThemeModeContextValue {
  mode: ThemeMode;
  resolvedMode: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

interface ThemeModeProviderProps {
  children: ReactNode;
}

export function ThemeModeProvider({ children }: ThemeModeProviderProps) {
  const { mode, setMode, resolvedMode } = useThemeMode();

  const contextValue = useMemo<ThemeModeContextValue>(
    () => ({
      mode,
      resolvedMode,
      setMode,
    }),
    [mode, resolvedMode, setMode],
  );

  return (
    <ThemeModeContext.Provider value={contextValue}>
      <StyledEngineProvider injectFirst>
        <MuiThemeProvider theme={appTheme}>
          <CssBaseline />
          <ComponentSizeProvider>
            {children}
          </ComponentSizeProvider>
        </MuiThemeProvider>
      </StyledEngineProvider>
    </ThemeModeContext.Provider>
  );
}

export function useThemeModeContext(): ThemeModeContextValue {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    throw new Error("useThemeModeContext must be used within ThemeModeProvider");
  }
  return ctx;
}
