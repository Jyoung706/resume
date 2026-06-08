// ============================================
// base/CardActionArea — MUI CardActionArea + Convenience Props
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import MuiCardActionArea, {
  type CardActionAreaProps as MuiCardActionAreaProps,
} from "@mui/material/CardActionArea";
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
import "./CardActionArea.scss";

// --- CardActionArea ---

export interface CardActionAreaProps
  extends ConvenienceProps,
    Omit<MuiCardActionAreaProps, "color"> {
  size?: ComponentSize;
}

export const CardActionArea = forwardRef<HTMLButtonElement, CardActionAreaProps>(
  function CardActionArea(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, ...muiProps }] =
      splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiCardActionAreaProps["sx"]);

    return (
      <MuiCardActionArea
        ref={ref}
        className={clsx(
          "CardActionArea__base",
          "ok-card-action-area",
          sizeClass(size),
          sizeConvenienceClassNames(convProps),
          className,
        )}
        sx={mergedSx}
        {...muiProps}
      />
    );
  }
);
