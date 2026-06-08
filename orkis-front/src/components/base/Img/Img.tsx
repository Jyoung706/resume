// ============================================
// base/Img — Native <img> + Convenience Props
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import type { SxProps, Theme } from "@mui/material/styles";
import MuiBox from "@mui/material/Box";
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
import "./Img.scss";


export interface ImgProps
  extends ConvenienceProps,
    Omit<React.ImgHTMLAttributes<HTMLImageElement>, "width" | "height" | "color"> {
  /** object-fit shorthand */
  fit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  /** object-position shorthand (기본 "center") */
  position?: string;
  sx?: SxProps<Theme>;
  size?: ComponentSize;
}

export const Img = forwardRef<HTMLImageElement, ImgProps>(
  function Img(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, fit, position, size = defaultSize, ...imgProps }] =
      splitConvenienceProps(props as Record<string, unknown>) as [
        ConvenienceProps,
        Omit<ImgProps, keyof ConvenienceProps> & {
          sx?: SxProps<Theme>;
          className?: string;
          size?: ComponentSize;
        },
      ];

    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx);

    return (
      <MuiBox
        ref={ref}
        component="img"
        className={clsx(
          "Img__base",
          "ok-img",
          sizeClass(size as ComponentSize),
          sizeConvenienceClassNames(convProps),
          className,
        )}
        sx={[
          {
            // display: "block",
            // objectFit: fit,
            objectPosition: position ?? (fit ? "center" : undefined),
          },
          ...(Array.isArray(mergedSx) ? mergedSx : mergedSx ? [mergedSx] : []),
        ]}
        {...imgProps}
      />
    );
  },
);
