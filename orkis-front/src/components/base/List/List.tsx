// ============================================
// base/List — MUI List 관련 래퍼
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import MuiList, { type ListProps as MuiListProps } from "@mui/material/List";
import MuiListItemButton, {
  type ListItemButtonProps as MuiListItemButtonProps,
} from "@mui/material/ListItemButton";
import MuiListItemIcon, {
  type ListItemIconProps as MuiListItemIconProps,
} from "@mui/material/ListItemIcon";
import MuiListItemText, {
  type ListItemTextProps as MuiListItemTextProps,
} from "@mui/material/ListItemText";
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
import "./List.scss";


// --- List ---
export interface ListProps extends ConvenienceProps, Omit<MuiListProps, "color"> {
  size?: ComponentSize;
}

export const List = forwardRef<HTMLUListElement, ListProps>(
  function List(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, ...muiProps }] =
      splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiListProps["sx"]);

    return (
      <MuiList
        ref={ref}
        className={clsx(
          "List__base",
          "ok-list",
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

// --- ListItemButton ---
export interface ListItemButtonProps
  extends ConvenienceProps,
    Omit<MuiListItemButtonProps, "color"> {
  size?: ComponentSize;
}

export const ListItemButton = forwardRef<HTMLDivElement, ListItemButtonProps>(
  function ListItemButton(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, ...muiProps }] =
      splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiListItemButtonProps["sx"]);

    return (
      <MuiListItemButton
        ref={ref}
        className={clsx(
          "List__item-button",
          "ok-list-item-button",
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

// --- ListItemIcon ---
export interface ListItemIconProps
  extends ConvenienceProps,
    Omit<MuiListItemIconProps, "color"> {
  size?: ComponentSize;
}

export const ListItemIcon = forwardRef<HTMLDivElement, ListItemIconProps>(
  function ListItemIcon(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, ...muiProps }] =
      splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiListItemIconProps["sx"]);

    return (
      <MuiListItemIcon
        ref={ref}
        className={clsx(
          "List__item-icon",
          "ok-list-item-icon",
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

// --- ListItemText ---
export interface ListItemTextProps
  extends ConvenienceProps,
    Omit<MuiListItemTextProps, "color"> {
  size?: ComponentSize;
}

export const ListItemText = forwardRef<HTMLDivElement, ListItemTextProps>(
  function ListItemText(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, ...muiProps }] =
      splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiListItemTextProps["sx"]);

    return (
      <MuiListItemText
        ref={ref}
        className={clsx(
          "List__item-text",
          "ok-list-item-text",
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
