// ============================================
// base/MenuItem — MUI MenuItem + Convenience Props
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import MuiMenuItem, {
  type MenuItemProps as MuiMenuItemProps,
} from "@mui/material/MenuItem";
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
import "./MenuItem.scss";


export interface MenuItemProps extends ConvenienceProps, Omit<MuiMenuItemProps, "color"> {
  size?: ComponentSize;
}

export const MenuItem = forwardRef<HTMLLIElement, MenuItemProps>(
  function MenuItem(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, ...muiProps }] =
      splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiMenuItemProps["sx"]);

    return (
      <MuiMenuItem
        ref={ref}
        className={clsx(
          "MenuItem__base",
          "ok-menu-item",
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
