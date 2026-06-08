// ============================================
// base/Typography — MUI Typography + Visual Convenience Props
// ============================================
// Typography는 MUI system props(m, p 등)를 이미 지원하므로
// visual convenience(rounded, shadow 등)만 추가

import { forwardRef } from "react";
import clsx from "clsx";
import MuiTypography, { type TypographyProps as MuiTypographyProps } from "@mui/material/Typography";
import {
  useDefaultComponentSize,
  sizeClass,
  type ComponentSize,
} from "@/design-system";
import {
  type VisualConvenienceProps,
  splitVisualConvenienceProps,
  visualConvenienceToSx,
  mergeSx,
  sizeConvenienceClassNames,
} from "../types";
import "./Typography.scss";


export interface TypographyProps extends VisualConvenienceProps, MuiTypographyProps {
  size?: ComponentSize;
}

export const Typography = forwardRef<HTMLSpanElement, TypographyProps>(
  function Typography(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const { size = defaultSize, ...rest } = props;
    const [convProps, { sx, className, ...muiProps }] = splitVisualConvenienceProps(rest);
    const convSx = visualConvenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiTypographyProps["sx"]);

    return (
      <MuiTypography
        ref={ref}
        className={clsx(
          "Typography__base",
          "ok-typography",
          sizeClass(size),
          sizeConvenienceClassNames(rest as Record<string, unknown>),
          className,
        )}
        sx={mergedSx}
        {...muiProps}
      />
    );
  },
);
