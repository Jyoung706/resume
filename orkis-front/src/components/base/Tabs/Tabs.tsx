// ============================================
// base/Tabs — MUI Tabs + Tab 래퍼
// variant="scrollable" 스크롤/스와이프 지원
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import MuiTabs, { type TabsProps as MuiTabsProps } from "@mui/material/Tabs";
import MuiTab, { type TabProps as MuiTabProps } from "@mui/material/Tab";
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
import "./Tabs.scss";

// --- Tabs ---
type OmitKeys = "color" | keyof ConvenienceProps;

export interface TabsProps
  extends ConvenienceProps,
    Omit<MuiTabsProps, OmitKeys> {
  size?: ComponentSize;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  function Tabs(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, ...muiProps }] =
      splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiTabsProps["sx"]);

    return (
      <MuiTabs
        ref={ref}
        className={clsx(
          "Tabs__base",
          "ok-tabs",
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

// --- Tab ---
type TabOmitKeys = "color" | keyof ConvenienceProps;

export interface TabProps
  extends ConvenienceProps,
    Omit<MuiTabProps, TabOmitKeys> {
  size?: ComponentSize;
}

export const Tab = forwardRef<HTMLDivElement, TabProps>(
  function Tab(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, ...muiProps }] =
      splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiTabProps["sx"]);

    return (
      <MuiTab
        ref={ref}
        className={clsx(
          "Tabs__tab",
          "ok-tab",
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
