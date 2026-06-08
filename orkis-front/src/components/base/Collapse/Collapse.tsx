// ============================================
// base/Collapse — MUI Collapse + Convenience Props
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import MuiCollapse, {
  type CollapseProps as MuiCollapseProps,
} from "@mui/material/Collapse";
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
import "./Collapse.scss";

// --- Collapse ---

export interface CollapseProps extends ConvenienceProps, Omit<MuiCollapseProps, "color"> {
  size?: ComponentSize;
}

export const Collapse = forwardRef<HTMLDivElement, CollapseProps>(
  function Collapse(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, ...muiProps }] =
      splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiCollapseProps["sx"]);

    return (
      <MuiCollapse
        ref={ref}
        className={clsx(
          "Collapse__base",
          "ok-collapse",
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
