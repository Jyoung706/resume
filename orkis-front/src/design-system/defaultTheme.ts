// ============================================
// design-system/defaultTheme.ts
// 정적 MUI 테마 (CSS 변수 모드) — 최소 설정
// ============================================
// cssVariables: true → MUI 컴포넌트가 --mui-palette-* CSS 변수 직접 참조
// SCSS가 CSS 변수의 유일한 소스 (palette.ts 브릿지 제거)
// StyledEngineProvider injectFirst로 SCSS가 MUI 기본값 오버라이드
//
// 컴포넌트별 Tier 2 CSS 변수(--btn-*, --input-*, --card-* 등)는
// 각 base 컴포넌트의 SCSS 모듈에서 적용합니다.
// 이 파일은 전역 타이포그래피와 최소한의 기본 설정만 담당합니다.
// ============================================

import { createTheme } from "@mui/material/styles";

export const appTheme = createTheme({
  cssVariables: true,
  typography: {
    fontFamily: "var(--font-family)"
    // button: {
    //   textTransform: "none" as const,
    //   fontWeight: 500,
    //   fontSize: "var(--text-sm)"
    // }
    // h1: {
    //   fontSize: "var(--text-4xl)",
    //   fontWeight: 700,
    //   lineHeight: "var(--leading-tight)"
    // },
    // h2: {
    //   fontSize: "var(--text-3xl)",
    //   fontWeight: 700,
    //   lineHeight: "var(--leading-tight)"
    // },
    // h3: {
    //   fontSize: "var(--text-2xl)",
    //   fontWeight: 600,
    //   lineHeight: "var(--leading-tight)"
    // },
    // h4: {
    //   fontSize: "var(--text-xl)",
    //   fontWeight: 600,
    //   lineHeight: "var(--leading-tight)"
    // },
    // h5: {
    //   fontSize: "var(--text-lg)",
    //   fontWeight: 600,
    //   lineHeight: "var(--leading-normal)"
    // },
    // h6: {
    //   fontSize: "var(--text-md)",
    //   fontWeight: 600,
    //   lineHeight: "var(--leading-normal)"
    // },
    // body1: { fontSize: "var(--text-sm)", lineHeight: "var(--leading-normal)" },
    // body2: { fontSize: "var(--text-xs)", lineHeight: "var(--leading-normal)" },
    // caption: { fontSize: "var(--text-xs)", lineHeight: "var(--leading-normal)" }
  },
});
