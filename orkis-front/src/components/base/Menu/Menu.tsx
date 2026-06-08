// ============================================
// base/Menu — MUI Menu + Convenience Props
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import MuiMenu, { type MenuProps as MuiMenuProps } from "@mui/material/Menu";
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
import "./Menu.scss";


export interface MenuProps extends ConvenienceProps, Omit<MuiMenuProps, "color"> {
  size?: ComponentSize;
}

export const Menu = forwardRef<HTMLDivElement, MenuProps>(
  function Menu(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, ...muiProps }] =
      splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiMenuProps["sx"]);

    return (
      <MuiMenu
        ref={ref}
        className={clsx(
          "Menu__base",
          "ok-menu",
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
