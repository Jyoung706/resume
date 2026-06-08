// ============================================
// base/FormLabel — MUI FormLabel + Convenience Props
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import MuiFormLabel, {
  type FormLabelProps as MuiFormLabelProps,
} from "@mui/material/FormLabel";
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
import "./FormLabel.scss";

// --- FormLabel ---

export interface FormLabelProps
  extends ConvenienceProps,
    MuiFormLabelProps {
  size?: ComponentSize;
}

export const FormLabel = forwardRef<HTMLLabelElement, FormLabelProps>(
  function FormLabel(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const formControl = useFormControl();
    const [convProps, { sx, className, size, ...muiProps }] =
      splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiFormLabelProps["sx"]);
    const effectiveSize: ComponentSize =
      (size as ComponentSize | undefined) ??
      (formControl?.size as ComponentSize | undefined) ??
      defaultSize;

    return (
      <MuiFormLabel
        ref={ref}
        className={clsx(
          "FormLabel__base",
          "ok-form-label",
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
