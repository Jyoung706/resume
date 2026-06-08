// ============================================
// themeConfig.ts — 테마 등록 설정
// ============================================
// 신규 테마 추가 시 이 파일만 수정하세요.
//
// 1. ThemeMode 유니온에 테마명 추가
// 2. THEME_OPTIONS 배열에 항목 추가
// 3. 다크 계열 테마면 DARK_THEMES에도 추가
// ============================================

/** 사용 가능한 테마 식별자 */
export type ThemeMode = "default" | "orkis" | "dark" | "template";

/** UI 표시용 테마 목록 (설정 화면 등) */
export const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "orkis", label: "Orkis" },
  { value: "dark", label: "Dark" },
  { value: "template", label: "Template" }
];

/** 다크 계열 테마 목록 (MUI palette.mode 매핑에 사용) */
export const DARK_THEMES: ThemeMode[] = ["dark"];

/** 기본 테마 (localStorage 값 없을 때) */
export const DEFAULT_THEME: ThemeMode = "orkis";

/** ThemeMode 유효성 검증 */
export function isValidTheme(value: string): value is ThemeMode {
  return THEME_OPTIONS.some((opt) => opt.value === value);
}
