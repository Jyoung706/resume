// ============================================
// design-system/sizeClass.ts
// ComponentSize → className 변환 헬퍼
// ============================================

import type { ComponentSize } from "./ComponentSizeContext";

/**
 * ComponentSize 값을 공통 size 클래스명으로 변환한다.
 * - "small"  → "sizeSmall"
 * - "medium" → "sizeMedium"
 * - "large"  → "sizeLarge"
 *
 * SCSS 측의 `.sizeSmall` / `.sizeMedium` / `.sizeLarge` 클래스 정의는
 * 후속 작업에서 별도 정의됨 (본 시점에는 className만 부여).
 */
export const sizeClass = (size: ComponentSize): string =>
  `size${size.charAt(0).toUpperCase()}${size.slice(1)}`;

/**
 * MUI 컴포넌트 중 `size` prop이 `"small" | "medium"` 만 지원하는 경우(Checkbox,
 * Chip, FormControl, Input(TextField), Radio, Select, Table, InputLabel 등)에
 * `ComponentSize`를 안전하게 전달하기 위한 narrowing 헬퍼.
 *
 * 매핑:
 * - `"xsmall"`, `"small"` → `"small"`
 * - `"medium"`, `"large"`, `"xlarge"` → `"medium"`
 *
 * (className 측 `sizeXsmall` / `sizeLarge` / `sizeXlarge`는 그대로 유지되어
 *  SCSS 에서 후속 처리 가능.)
 */
export const toMuiSmallMedium = (size: ComponentSize): "small" | "medium" => {
  if (size === "xsmall" || size === "small") return "small";
  return "medium";
};
