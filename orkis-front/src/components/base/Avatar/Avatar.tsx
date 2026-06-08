// ============================================
// base/Avatar — MUI Avatar + Convenience Props
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import MuiAvatar, { type AvatarProps as MuiAvatarProps } from "@mui/material/Avatar";
import {
  useDefaultComponentSize,
  sizeClass,
  type ComponentSize,
} from "@/design-system";
import {
  type ConvenienceProps,
  splitConvenienceProps,
  convenienceToSx,
  mergeSx,
  sizeConvenienceClassNames,
} from "../types";
import "./Avatar.scss";

// --- Avatar ---

export interface AvatarProps extends ConvenienceProps, Omit<MuiAvatarProps, "color"> {
  size?: ComponentSize;
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  function Avatar(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, ...muiProps }] =
      splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiAvatarProps["sx"]);

    return (
      <MuiAvatar
        ref={ref}
        className={clsx(
          "Avatar__base",
          "ok-avatar",
          sizeClass(size),
          sizeConvenienceClassNames(convProps),
          className,
        )}
        sx={mergedSx}
        {...muiProps}
      />
    );
  },
);
