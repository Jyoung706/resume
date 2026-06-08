// ============================================
// base/FormHelperText — MUI FormHelperText + Convenience Props
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import MuiFormHelperText, {
  type FormHelperTextProps as MuiFormHelperTextProps,
} from "@mui/material/FormHelperText";
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
import "./FormHelperText.scss";


export interface FormHelperTextProps
  extends ConvenienceProps,
    MuiFormHelperTextProps {
  size?: ComponentSize;
}

export const FormHelperText = forwardRef<HTMLParagraphElement, FormHelperTextProps>(
  function FormHelperText(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const formControl = useFormControl();
    const [convProps, { sx, className, size, ...muiProps }] =
      splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiFormHelperTextProps["sx"]);
    const effectiveSize: ComponentSize =
      (size as ComponentSize | undefined) ??
      (formControl?.size as ComponentSize | undefined) ??
      defaultSize;

    return (
      <MuiFormHelperText
        ref={ref}
        className={clsx(
          "FormHelperText__base",
          "ok-form-helper-text",
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
