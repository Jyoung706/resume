// ============================================
// base/Drawer — MUI Drawer + Convenience Props
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import MuiDrawer, {
  type DrawerProps as MuiDrawerProps,
} from "@mui/material/Drawer";
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
import "./Drawer.scss";

// --- Drawer ---

export interface DrawerProps extends ConvenienceProps, Omit<MuiDrawerProps, "color"> {
  size?: ComponentSize;
}

export const Drawer = forwardRef<HTMLDivElement, DrawerProps>(
  function Drawer(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, ...muiProps }] =
      splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiDrawerProps["sx"]);

    return (
      <MuiDrawer
        ref={ref}
        className={clsx(
          "Drawer__base",
          "ok-drawer",
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
