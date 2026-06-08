// ============================================
// base/Chip — MUI Chip + Convenience Props
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import MuiChip, { type ChipProps as MuiChipProps } from "@mui/material/Chip";
import {
  useDefaultComponentSize,
  sizeClass,
  toMuiSmallMedium,
  type ComponentSize,
} from "@/design-system";
import {
  type ConvenienceProps,
  splitConvenienceProps,
  convenienceToSx,
  mergeSx,
  sizeConvenienceClassNames,
} from "../types";
import "./Chip.scss";

// --- Chip ---

export interface ChipProps
  extends ConvenienceProps,
    Omit<MuiChipProps, "size"> {
  size?: ComponentSize;
}

export const Chip = forwardRef<HTMLDivElement, ChipProps>(
  function Chip(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, ...muiProps }] = splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiChipProps["sx"]);

    return <MuiChip ref={ref} className={clsx("Chip__base", "ok-chip", sizeClass(size), sizeConvenienceClassNames(convProps), className)} sx={mergedSx} size={toMuiSmallMedium(size)} {...muiProps} />;
  },
);
