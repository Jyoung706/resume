// ============================================
// base/InputAdornment — MUI InputAdornment + Convenience Props
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import MuiInputAdornment, {
  type InputAdornmentProps as MuiInputAdornmentProps,
} from "@mui/material/InputAdornment";
import { useFormControl } from "@mui/material/FormControl";
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
import "./InputAdornment.scss";

export interface InputAdornmentProps
  extends ConvenienceProps,
    Omit<MuiInputAdornmentProps, "color"> {
  size?: ComponentSize;
}

export const InputAdornment = forwardRef<HTMLDivElement, InputAdornmentProps>(
  function InputAdornment(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const formControl = useFormControl();
    const [convProps, { sx, className, size, ...muiProps }] =
      splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiInputAdornmentProps["sx"]);
    const effectiveSize: ComponentSize =
      (size as ComponentSize | undefined) ??
      (formControl?.size as ComponentSize | undefined) ??
      defaultSize;

    return (
      <MuiInputAdornment
        ref={ref}
        className={clsx(
          "InputAdornment__base",
          "ok-input-adornment",
          sizeClass(effectiveSize),
          sizeConvenienceClassNames(convProps),
          className,
        )}
        sx={mergedSx}
        {...muiProps}
      />
    );
  }
);
