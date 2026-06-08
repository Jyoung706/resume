// ============================================
// layout/FlexBox — Flex 레이아웃 유틸리티
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import { Box, type BoxProps } from "../../base/Box";

export interface FlexBoxProps extends BoxProps {
  direction?: "row" | "column" | "row-reverse" | "column-reverse";
  align?: BoxProps["alignItems"];
  justify?: BoxProps["justifyContent"];
  wrap?: "wrap" | "nowrap" | "wrap-reverse";
  gap?: number | string;
  inline?: boolean;
}

export const FlexBox = forwardRef<HTMLDivElement, FlexBoxProps>(
  function FlexBox(
    { direction = "row", align, justify, wrap, gap, inline, sx, className, ...rest },
    ref,
  ) {
    return (
      <Box
        ref={ref}
        className={clsx("ok-flex-box", className)}
        sx={[
          {
            display: inline ? "inline-flex" : "flex",
            flexDirection: direction,
            alignItems: align,
            justifyContent: justify,
            flexWrap: wrap,
            gap,
          },
          ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        ]}
        {...rest}
      />
    );
  },
);
