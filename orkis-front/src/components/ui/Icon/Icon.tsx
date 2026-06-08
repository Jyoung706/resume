// ============================================
// ui/Icon — 통합 아이콘 컴포넌트
// Material Symbols (웹폰트) + MUI Icons (SVG) 통합
// ============================================
// 사용법:
//   <Icon>send</Icon>                          — Material Symbols (기본)
//   <Icon>CheckCircle</Icon>                   — PascalCase (자동 변환)
//   <Icon size="large" fill>favorite</Icon>    — 크기/채움 설정
//   <Icon mui>SendIcon</Icon>                  — MUI SVG (base/Icon export 이름)
//   <Icon mui size="large">DeleteIcon</Icon>
// ============================================

import type { SxProps, Theme } from "@mui/material/styles";
import MuiIconBase from "@mui/material/Icon";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import clsx from "clsx";
import { forwardRef } from "react";
import { useDefaultComponentSize, type ComponentSize } from "@/design-system/ComponentSizeContext";
import { Box } from "../../base/Box";
import * as MuiIcons from "../../base/MuiIcon";
import "./Icon.scss";

type SvgIconComponent = React.ComponentType<SvgIconProps>;
const muiIconEntries = MuiIcons as Record<string, unknown>;

export interface IconProps {
  /** 아이콘 이름 (children으로 전달) */
  children: string;
  /** true이면 MUI SVG 아이콘으로 렌더링 */
  mui?: boolean;
  /** 사이즈 (테마 토큰 --icon-size-* 기반) */
  size?: ComponentSize;
  /** 가중치 100–700 (Material Symbols 전용) */
  weight?: number;
  /** 채움 여부 (Material Symbols 전용) */
  fill?: boolean;
  /** 색상 */
  color?: string;
  /** 클릭 핸들러 */
  onClick?: (e: React.MouseEvent) => void;
  /** hover 효과 활성화 */
  hoverable?: boolean;
  /** hover 시 색상 */
  hoverColor?: string;
  /** 비활성화 */
  disabled?: boolean;
  /** className */
  className?: string;
  /** 추가 sx */
  sx?: SxProps<Theme>;
  /** 접근성 라벨 */
  "aria-label"?: string;
}

/**
 * PascalCase / camelCase → snake_case 변환
 * "CheckCircle" → "check_circle"
 * "send" → "send" (그대로)
 */
const toSnakeCase = (name: string): string =>
  name
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");

export const Icon = forwardRef<HTMLElement, IconProps>(
  function Icon(
    {
      children,
      mui = false,
      size,
      weight,
      fill = false,
      color,
      onClick,
      hoverable = false,
      hoverColor,
      disabled = false,
      className,
      sx,
      "aria-label": ariaLabel,
    },
    ref,
  ) {
    const defaultSize = useDefaultComponentSize();
    const resolvedSize = size ?? defaultSize;
    const isClickable = !!onClick && !disabled;
    const name = children.trim();

    const stateClassName = clsx(
      "Icon__base",
      hoverable && "Icon__hoverable",
      disabled && "Icon__disabled",
      isClickable && "Icon__clickable",
      className,
    );

    const interactionProps = {
      role: onClick ? ("button" as const) : undefined,
      "aria-label": ariaLabel,
      "aria-disabled": disabled || undefined,
      tabIndex: isClickable ? 0 : undefined,
      onClick: isClickable ? onClick : undefined,
      onKeyDown: isClickable
        ? (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClick!(e as unknown as React.MouseEvent);
            }
          }
        : undefined,
    };

    // MUI SVG 아이콘
    if (mui) {
      const SvgIcon = muiIconEntries[name] as SvgIconComponent | undefined;

      if (SvgIcon) {
        return (
          <Box
            ref={ref as React.Ref<HTMLDivElement>}
            component="span"
            className={stateClassName}
            {...interactionProps}
            style={{
              display: "inline-flex",
              color,
              ...(hoverColor &&
                ({ "--icon-hover-color": hoverColor } as React.CSSProperties)),
            }}
            sx={sx}
          >
            <SvgIcon fontSize={resolvedSize} />
          </Box>
        );
      }
      // MUI에 없으면 Material Symbols로 폴백
    }

    // Material Symbols 웹폰트 — @mui/material/Icon 구조 사용
    const iconName = toSnakeCase(name);

    return (
      <MuiIconBase
        ref={ref}
        baseClassName="material-symbols-outlined"
        fontSize={resolvedSize}
        className={stateClassName}
        {...interactionProps}
        style={{
          ...(fill || weight) && { fontVariationSettings: `"FILL" ${fill ? 1 : 0}${weight != null ? `, "wght" ${weight}` : ""}, "GRAD" 0, "opsz" 24` },
          color,
          ...(hoverColor &&
            ({ "--icon-hover-color": hoverColor } as React.CSSProperties)),
        }}
        sx={sx}
      >
        {iconName}
      </MuiIconBase>
    );
  },
);
