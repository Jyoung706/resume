// ============================================
// base/Radio — MUI Radio + Convenience Props
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import MuiRadio, { type RadioProps as MuiRadioProps } from "@mui/material/Radio";
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
import "./Radio.scss";

export interface RadioProps
  extends ConvenienceProps,
    Omit<MuiRadioProps, "size"> {
  size?: ComponentSize;
}

export const Radio = forwardRef<HTMLButtonElement, RadioProps>(
  function Radio(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, ...muiProps }] = splitConvenienceProps(props, ["size"]);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiRadioProps["sx"]);

    return <MuiRadio ref={ref} size={toMuiSmallMedium(size)} className={clsx("Radio__base", "ok-radio", sizeClass(size), sizeConvenienceClassNames(convProps), className)} sx={mergedSx} {...muiProps} />;
  },
);
