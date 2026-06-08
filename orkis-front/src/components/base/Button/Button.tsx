// ============================================
// base/Button — MUI Button + Convenience Props
// ============================================

import MuiButton, {
  type ButtonProps as MuiButtonProps
} from "@mui/material/Button";
import clsx from "clsx";
import { forwardRef } from "react";
import { useDefaultComponentSize, sizeClass } from "@/design-system";
import {
  type ConvenienceProps,
  convenienceToSx,
  mergeSx,
  sizeConvenienceClassNames,
  splitConvenienceProps
} from "../types";
import "./Button.scss";

// --- Button ---

export interface ButtonProps extends ConvenienceProps, MuiButtonProps {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, color, ...muiProps }] =
      splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiButtonProps["sx"]);

    // MUI 7에서 color="default" 타입 제거됨.
    // 외부에서 color prop 미지정 시 BEM modifier로 "기본(중립)" 색상 표시 → SCSS가 처리.
    // MUI 에는 "inherit" 전달: contained variant 의 contrastText(흰색) 자동 부여를 막아
    // Dialog footer 등 background:transparent 환경에서 텍스트 색이 부모로 inherit 되도록 보장.
    const isDefaultColor = color === undefined || (color as string) === "default";

    return (
      <MuiButton
        ref={ref}
        {...(isDefaultColor ? { color: "inherit" as const } : { color })}
        className={clsx(
          "Button__base",
          "ok-button",
          isDefaultColor && "Button__base--default",
          sizeClass(size),
          sizeConvenienceClassNames(convProps),
          className,
        )}
        sx={mergedSx}
        size={size}
        {...muiProps}
      />
    );
  }
);
