// ============================================
// base/FormControlLabel — MUI FormControlLabel + Convenience Props
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import MuiFormControlLabel, {
  type FormControlLabelProps as MuiFormControlLabelProps,
} from "@mui/material/FormControlLabel";
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
import "./FormControlLabel.scss";


export interface FormControlLabelProps
  extends ConvenienceProps,
    MuiFormControlLabelProps {
  size?: ComponentSize;
}

export const FormControlLabel = forwardRef<HTMLLabelElement, FormControlLabelProps>(
  function FormControlLabel(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const formControl = useFormControl();
    const [convProps, { sx, className, size, ...muiProps }] =
      splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiFormControlLabelProps["sx"]);
    const effectiveSize: ComponentSize =
      (size as ComponentSize | undefined) ??
      (formControl?.size as ComponentSize | undefined) ??
      defaultSize;

    return (
      <MuiFormControlLabel
        ref={ref}
        className={clsx(
          "FormControlLabel__base",
          "ok-form-control-label",
          sizeClass(effectiveSize),
          sizeConvenienceClassNames(convProps),
          className,
        )}
        sx={mergedSx}
        {...muiProps}
      />
    );
  },
);
