// ============================================
// base/CircularProgress — MUI CircularProgress + Convenience Props
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import MuiCircularProgress, {
  type CircularProgressProps as MuiCircularProgressProps,
} from "@mui/material/CircularProgress";
import {
  useDefaultComponentSize,
  sizeClass,
  type ComponentSize,
} from "@/design-system";
import "./CircularProgress.scss";

export type CircularProgressProps = MuiCircularProgressProps & {
  size?: ComponentSize | number | string;
};

export const CircularProgress = forwardRef<HTMLSpanElement, CircularProgressProps>(
  function CircularProgress({ className, size, ...muiProps }, ref) {
    const defaultSize = useDefaultComponentSize();
    // size가 ComponentSize 문자열일 때만 sizeClass 적용.
    // 숫자/기타 문자열(예: "3rem")은 MUI에 그대로 전달.
    const isComponentSize =
      size === "small" || size === "medium" || size === "large";
    const effectiveSize: ComponentSize = isComponentSize
      ? (size as ComponentSize)
      : defaultSize;
    const muiSize = isComponentSize ? undefined : (size as number | string | undefined);

    return (
      <MuiCircularProgress
        ref={ref}
        className={clsx(
          "CircularProgress__base",
          "ok-circular-progress",
          sizeClass(effectiveSize),
          className,
        )}
        size={muiSize}
        {...muiProps}
      />
    );
  },
);
