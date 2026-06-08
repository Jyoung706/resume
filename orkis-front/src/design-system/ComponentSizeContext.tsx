// ============================================
// design-system/ComponentSizeContext.tsx
// CSS→JS 브릿지: Config 토큰 → React Context
// ============================================

import { createContext, useContext, useMemo, type ReactNode } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useThemeModeContext } from "./ThemeModeContext";

export type ComponentSize =
  | "xsmall"
  | "small"
  | "medium"
  | "large"
  | "xlarge";

const ComponentSizeContext = createContext<ComponentSize>("small");

export function ComponentSizeProvider({ children }: { children: ReactNode }) {
  const isMobile = useMediaQuery("(max-width:599px)");
  const { mode } = useThemeModeContext();

  const size = useMemo<ComponentSize>(() => {
    const varName = isMobile
      ? "--config-default-size-mobile"
      : "--config-default-size-pc";
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
    return isValidSize(value) ? value : "small";
  }, [isMobile, mode]);

  return (
    <ComponentSizeContext.Provider value={size}>
      {children}
    </ComponentSizeContext.Provider>
  );
}

export function useDefaultComponentSize(): ComponentSize {
  return useContext(ComponentSizeContext);
}

/** 하위 트리에 특정 ComponentSize를 강제 주입하는 경량 Provider */
export function ComponentSizeOverride({
  size,
  children
}: {
  size: ComponentSize;
  children: ReactNode;
}) {
  return (
    <ComponentSizeContext.Provider value={size}>
      {children}
    </ComponentSizeContext.Provider>
  );
}

function isValidSize(value: string): value is ComponentSize {
  return (
    value === "xsmall" ||
    value === "small" ||
    value === "medium" ||
    value === "large" ||
    value === "xlarge"
  );
}
