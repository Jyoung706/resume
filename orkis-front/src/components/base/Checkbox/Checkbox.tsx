// ============================================
// base/Checkbox — MUI Checkbox + Convenience Props
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import MuiCheckbox, { type CheckboxProps as MuiCheckboxProps } from "@mui/material/Checkbox";
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
import "./Checkbox.scss";

// --- Checkbox ---

export interface CheckboxProps
  extends ConvenienceProps,
    Omit<MuiCheckboxProps, "size"> {
  size?: ComponentSize;
}

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
  function Checkbox(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, ...muiProps }] = splitConvenienceProps(props, ["size"]);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiCheckboxProps["sx"]);

    return <MuiCheckbox ref={ref} className={clsx("Checkbox__base", "ok-checkbox", sizeClass(size), sizeConvenienceClassNames(convProps), className)} sx={mergedSx} size={toMuiSmallMedium(size)} {...muiProps} />;
  },
);
