// ============================================
// base/IconButton — MUI IconButton + Convenience Props
// ============================================

import { forwardRef, Children, isValidElement, cloneElement } from "react";
import clsx from "clsx";
import MuiIconButton, { type IconButtonProps as MuiIconButtonProps } from "@mui/material/IconButton";
import { useDefaultComponentSize, sizeClass } from "@/design-system";
import {
  type ConvenienceProps,
  splitConvenienceProps,
  convenienceToSx,
  mergeSx,
  sizeConvenienceClassNames,
} from "../types";
import "./IconButton.scss";

export interface IconButtonProps extends ConvenienceProps, MuiIconButtonProps {}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, children, ...muiProps }] = splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiIconButtonProps["sx"]);

    const enhancedChildren = Children.map(children, (child) => {
      if (isValidElement(child) && !(child.props as Record<string, unknown>).fontSize) {
        return cloneElement(child as React.ReactElement<Record<string, unknown>>, { fontSize: size });
      }
      return child;
    });

    return (
      <MuiIconButton
        ref={ref}
        className={clsx(
          "IconButton__base",
          "ok-icon-button",
          sizeClass(size),
          sizeConvenienceClassNames(convProps),
          className,
        )}
        sx={mergedSx}
        size={size}
        {...muiProps}
      >
        {enhancedChildren}
      </MuiIconButton>
    );
  },
);
