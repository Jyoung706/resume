// ============================================
// base/FormControl — MUI FormControl + Convenience Props
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import MuiFormControl, {
  type FormControlProps as MuiFormControlProps,
} from "@mui/material/FormControl";
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
import "./FormControl.scss";

// --- FormControl ---

export interface FormControlProps
  extends ConvenienceProps,
    Omit<MuiFormControlProps, "size"> {
  size?: ComponentSize;
}

export const FormControl = forwardRef<HTMLDivElement, FormControlProps>(
  function FormControl(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, ...muiProps }] =
      splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiFormControlProps["sx"]);

    return (
      <MuiFormControl
        ref={ref}
        className={clsx(
          "FormControl__base",
          "ok-form-control",
          sizeClass(size),
          sizeConvenienceClassNames(convProps),
          className,
        )}
        sx={mergedSx}
        size={toMuiSmallMedium(size)}
        {...muiProps}
      />
    );
  }
);
