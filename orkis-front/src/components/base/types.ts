// ============================================
// components/base/types.ts
// Convenience Props 타입 및 변환 유틸리티
// ============================================

import type { SxProps, Theme } from "@mui/material/styles";

// ==========================================
// Preset 타입 정의
// ==========================================

/** Spacing 프리셋 토큰 — CSS 변수 --space-* 매핑 */
export type SpacingPreset = "none" | "xs" | "sm" | "md" | "lg" | "xl" | "xxl";

/** Spacing 값: 숫자(MUI spacing 단위) 또는 프리셋 토큰 */
export type SpacingValue = number | SpacingPreset;

/** Color 프리셋 토큰 — 텍스트 색상용 */
export type ColorPreset =
  | "primary"
  | "secondary"
  | "error"
  | "warning"
  | "info"
  | "success"
  | "text.primary"
  | "text.secondary"
  | "text.disabled"
  | "white"
  | "black"
  | "inherit";

/** BgColor 프리셋 토큰 — 배경 색상용 */
export type BgColorPreset =
  | "default"
  | "paper"
  | "surface"
  | "primary"
  | "primary.subtle"
  | "secondary"
  | "error"
  | "warning"
  | "info"
  | "success"
  | "grey.100"
  | "grey.200"
  | "grey.300"
  | "transparent";

// ==========================================
// Convenience Props 인터페이스
// ==========================================

/**
 * Visual 단축 props (MUI system 컴포넌트용: Box, Stack, Typography)
 * - rounded, shadow만 포함
 * - width/height 등 size props는 MUI 네이티브 system props 사용
 */
export interface VisualConvenienceProps {
  rounded?: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "xxl" | "full";
  shadow?: "sm" | "md" | "lg" | "xl" | "card" | "modal" | "dropdown";
  /** flexGrow: 1 단축 prop — Toolbar 등 flex 컨테이너에서 남은 공간 차지 */
  grow?: boolean;
  /** CSS transition 단축 prop (예: "width 0.3s", "all 0.2s ease") */
  transition?: string;
}

/**
 * 전체 Convenience Props (non-system 컴포넌트용: Button, Paper, Alert, Input, IconButton)
 * - MUI system props가 없는 컴포넌트에서 spacing + size + visual + color 제공
 * - spacing: 숫자(MUI spacing) 또는 프리셋 토큰("xs"|"sm"|"md" 등)
 * - textColor/bgcolor: 프리셋 토큰 또는 자유 문자열
 */
export interface ConvenienceProps extends VisualConvenienceProps {
  // Spacing (숫자 + 프리셋 토큰)
  p?: SpacingValue;
  px?: SpacingValue;
  py?: SpacingValue;
  pt?: SpacingValue;
  pb?: SpacingValue;
  pl?: SpacingValue;
  pr?: SpacingValue;
  m?: SpacingValue;
  mx?: SpacingValue;
  my?: SpacingValue;
  mt?: SpacingValue;
  mb?: SpacingValue;
  ml?: SpacingValue;
  mr?: SpacingValue;
  // Size
  width?: number | string;
  height?: number | string;
  minWidth?: number | string;
  minHeight?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
  // Color (프리셋 + 자유 문자열)
  /** 텍스트 색상 (ColorPreset 또는 자유 문자열) */
  textColor?: ColorPreset | (string & {});
  /** 배경 색상 (BgColorPreset 또는 자유 문자열) */
  bgcolor?: BgColorPreset | (string & {});
  /** 보더 색상 (ColorPreset 또는 자유 문자열) */
  borderColor?: ColorPreset | (string & {});
}

/** visual convenience props 키 (MUI system 컴포넌트용) */
export const VISUAL_CONVENIENCE_KEYS: readonly (keyof VisualConvenienceProps)[] =
  ["rounded", "shadow", "grow", "transition"] as const;

/** 전체 convenience props 키 (non-system 컴포넌트용) */
export const CONVENIENCE_KEYS: readonly (keyof ConvenienceProps)[] = [
  "p",
  "px",
  "py",
  "pt",
  "pb",
  "pl",
  "pr",
  "m",
  "mx",
  "my",
  "mt",
  "mb",
  "ml",
  "mr",
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
  "textColor",
  "bgcolor",
  "borderColor",
  ...VISUAL_CONVENIENCE_KEYS
] as const;

// ==========================================
// Preset → CSS 변수 매핑
// ==========================================

const RADIUS_MAP: Record<string, string> = {
  none: "var(--radius-none)",
  xs: "var(--radius-xs)",
  sm: "var(--radius-sm)",
  md: "var(--radius-md)",
  lg: "var(--radius-lg)",
  xl: "var(--radius-xl)",
  xxl: "var(--radius-xxl)",
  full: "var(--radius-full)"
};

const SHADOW_MAP: Record<string, string> = {
  sm: "var(--shadow-sm)",
  card: "var(--shadow-card)",
  md: "var(--shadow-md)",
  dropdown: "var(--shadow-dropdown)",
  lg: "var(--shadow-lg)",
  modal: "var(--shadow-modal)",
  xl: "var(--shadow-lg)"
};

const SPACING_MAP: Record<string, string> = {
  none: "var(--space-0)",
  xs: "var(--space-1)",
  sm: "var(--space-2)",
  md: "var(--space-4)",
  lg: "var(--space-6)",
  xl: "var(--space-8)",
  xxl: "var(--space-12)"
};

const COLOR_MAP: Record<string, string> = {
  primary: "var(--primary)",
  secondary: "var(--secondary)",
  error: "var(--error)",
  warning: "var(--warning)",
  info: "var(--info)",
  success: "var(--success)",
  "text.primary": "var(--text-color)",
  "text.secondary": "var(--text-muted)",
  "text.disabled": "var(--text-faint)",
  white: "var(--common-white)",
  black: "var(--common-black)",
  inherit: "inherit"
};

const BGCOLOR_MAP: Record<string, string> = {
  default: "var(--bg-color)",
  paper: "var(--bg-paper)",
  surface: "var(--bg-surface)",
  primary: "var(--primary)",
  "primary.subtle": "var(--bg-subtle)",
  secondary: "var(--secondary)",
  error: "var(--error)",
  warning: "var(--warning)",
  info: "var(--info)",
  success: "var(--success)",
  "grey.100": "var(--grey-100)",
  "grey.200": "var(--grey-200)",
  "grey.300": "var(--grey-300)",
  transparent: "transparent"
};

// ==========================================
// Resolve 함수
// ==========================================

/** spacing 값을 sx 값으로 변환 (숫자 → 그대로, 프리셋 → CSS 변수) */
function resolveSpacing(value: SpacingValue): number | string {
  if (typeof value === "number") return value;
  if (value in SPACING_MAP) return SPACING_MAP[value];
  return value;
}

/** color/bgcolor 값을 sx 값으로 변환 (프리셋 → CSS 변수, 기타 → 그대로) */
function resolveColor(value: string, map: Record<string, string>): string {
  return map[value] ?? value;
}

// ==========================================
// Convenience Props → SxProps 변환
// ==========================================

/** visual convenience props를 MUI sx 객체로 변환 (MUI system 컴포넌트용) */
export function visualConvenienceToSx(
  props: VisualConvenienceProps
): SxProps<Theme> {
  const sx: Record<string, unknown> = {};
  if (props.rounded) sx.borderRadius = RADIUS_MAP[props.rounded];
  if (props.shadow) sx.boxShadow = SHADOW_MAP[props.shadow];
  if (props.grow) sx.flexGrow = 1;
  if (props.transition) sx.transition = props.transition;
  return sx as SxProps<Theme>;
}

/** visual convenience props를 분리 (MUI system 컴포넌트용) */
export function splitVisualConvenienceProps<T extends Record<string, unknown>>(
  props: T
): [VisualConvenienceProps, Omit<T, keyof VisualConvenienceProps>] {
  const conv: Record<string, unknown> = {};
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if ((VISUAL_CONVENIENCE_KEYS as readonly string[]).includes(key)) {
      conv[key] = value;
    } else {
      rest[key] = value;
    }
  }
  return [
    conv as VisualConvenienceProps,
    rest as Omit<T, keyof VisualConvenienceProps>
  ];
}

/** 전체 convenience props를 MUI sx 객체로 변환 */
export function convenienceToSx(props: ConvenienceProps): SxProps<Theme> {
  const sx: Record<string, unknown> = {};

  // Padding
  if (props.p !== undefined) sx.p = resolveSpacing(props.p);
  if (props.px !== undefined) sx.px = resolveSpacing(props.px);
  if (props.py !== undefined) sx.py = resolveSpacing(props.py);
  if (props.pt !== undefined) sx.pt = resolveSpacing(props.pt);
  if (props.pb !== undefined) sx.pb = resolveSpacing(props.pb);
  if (props.pl !== undefined) sx.pl = resolveSpacing(props.pl);
  if (props.pr !== undefined) sx.pr = resolveSpacing(props.pr);

  // Margin
  if (props.m !== undefined) sx.m = resolveSpacing(props.m);
  if (props.mx !== undefined) sx.mx = resolveSpacing(props.mx);
  if (props.my !== undefined) sx.my = resolveSpacing(props.my);
  if (props.mt !== undefined) sx.mt = resolveSpacing(props.mt);
  if (props.mb !== undefined) sx.mb = resolveSpacing(props.mb);
  if (props.ml !== undefined) sx.ml = resolveSpacing(props.ml);
  if (props.mr !== undefined) sx.mr = resolveSpacing(props.mr);

  // Visual
  if (props.rounded) sx.borderRadius = RADIUS_MAP[props.rounded];
  if (props.shadow) sx.boxShadow = SHADOW_MAP[props.shadow];
  if (props.grow) sx.flexGrow = 1;
  if (props.transition) sx.transition = props.transition;

  // Size
  if (props.width !== undefined) sx.width = props.width;
  if (props.height !== undefined) sx.height = props.height;
  if (props.minWidth !== undefined) sx.minWidth = props.minWidth;
  if (props.minHeight !== undefined) sx.minHeight = props.minHeight;
  if (props.maxWidth !== undefined) sx.maxWidth = props.maxWidth;
  if (props.maxHeight !== undefined) sx.maxHeight = props.maxHeight;

  // Color
  if (props.textColor !== undefined)
    sx.color = resolveColor(props.textColor, COLOR_MAP);
  if (props.bgcolor !== undefined)
    sx.backgroundColor = resolveColor(props.bgcolor, BGCOLOR_MAP);
  if (props.borderColor !== undefined)
    sx.borderColor = resolveColor(props.borderColor, COLOR_MAP);

  return sx as SxProps<Theme>;
}

// ==========================================
// Size → flag className 생성
// ==========================================

/**
 * size 관련 prop이 지정되었을 때 부여할 flag className 매핑.
 * 값 판정은 §3.2 규칙: undefined/null/"" 은 스킵, 그 외(0, "auto", "100%" 포함)는 지정으로 간주.
 */
const SIZE_CLASSNAME_MAP: Record<string, string> = {
  width: "hasWidth",
  height: "hasHeight",
  minWidth: "hasMinWidth",
  minHeight: "hasMinHeight",
  maxWidth: "hasMaxWidth",
  maxHeight: "hasMaxHeight"
};

/**
 * size 관련 값이 의미 있는지 판정.
 * - `undefined`/`null`/`""` → false (클래스 없음)
 * - 그 외 (0, "auto", "100%", 문자열/숫자 등) → true (클래스 부여)
 */
function hasMeaningfulSize(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string" && value === "") return false;
  return true;
}

/**
 * ConvenienceProps/VisualConvenienceProps의 size 관련 값에서 flag className 배열 생성.
 * Non-system 컴포넌트는 `convProps`를, System 컴포넌트는 원본 `props`를 넘긴다.
 *
 * @example
 * // Non-system
 * sizeConvenienceClassNames(convProps) // ["hasWidth", "hasHeight"]
 * // System (Box 등)
 * sizeConvenienceClassNames(props)
 */
export function sizeConvenienceClassNames(props: {
  width?: unknown;
  height?: unknown;
  minWidth?: unknown;
  minHeight?: unknown;
  maxWidth?: unknown;
  maxHeight?: unknown;
}): string[] {
  const classes: string[] = [];
  for (const key of Object.keys(SIZE_CLASSNAME_MAP)) {
    if (hasMeaningfulSize((props as Record<string, unknown>)[key])) {
      classes.push(SIZE_CLASSNAME_MAP[key]);
    }
  }
  return classes;
}

/** sx props 병합 (convenience + 사용자 sx) */
export function mergeSx(
  convSx: SxProps<Theme>,
  userSx?: SxProps<Theme>
): SxProps<Theme> {
  if (!userSx) return convSx;
  return [convSx, userSx].flat() as SxProps<Theme>;
}

/**
 * convenience props를 분리하여 나머지 props만 반환
 * @param excludeKeys - MUI 네이티브 prop과 충돌하여 분리에서 제외할 키 (예: Dialog의 "maxWidth")
 */
export function splitConvenienceProps<T extends Record<string, unknown>>(
  props: T,
  excludeKeys?: readonly string[]
): [ConvenienceProps, Omit<T, keyof ConvenienceProps>] {
  const conv: Record<string, unknown> = {};
  const rest: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(props)) {
    if (
      (CONVENIENCE_KEYS as readonly string[]).includes(key) &&
      !excludeKeys?.includes(key)
    ) {
      conv[key] = value;
    } else {
      rest[key] = value;
    }
  }

  return [conv as ConvenienceProps, rest as Omit<T, keyof ConvenienceProps>];
}
