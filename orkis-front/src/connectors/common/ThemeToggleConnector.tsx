// ============================================
// ThemeToggleConnector — useThemeModeContext → ThemeToggle 매핑
// 헤더 (ChatHeader / Pro Mode TopBar) 의 themeToggleSlot 으로 주입
// 토글 매핑: 라이트 ↔ dark 2단. 라이트 복귀는 DEFAULT_THEME(=orkis) 로 표준화.
// ============================================

import { DEFAULT_THEME, useThemeModeContext } from "@/design-system";
import { ThemeToggle } from "@/components";

export function ThemeToggleConnector() {
  const { resolvedMode, setMode } = useThemeModeContext();
  const handleToggle = () => {
    setMode(resolvedMode === "dark" ? DEFAULT_THEME : "dark");
  };
  return <ThemeToggle resolvedMode={resolvedMode} onToggle={handleToggle} />;
}
