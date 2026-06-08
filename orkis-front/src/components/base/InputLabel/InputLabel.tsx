// ============================================
// base/InputLabel — MUI InputLabel + Convenience Props
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import MuiInputLabel, {
  type InputLabelProps as MuiInputLabelProps,
} from "@mui/material/InputLabel";
import { useFormControl } from "@mui/material/FormControl";
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
import "./InputLabel.scss";


export interface InputLabelProps
  extends ConvenienceProps,
    Omit<MuiInputLabelProps, "size"> {
  size?: ComponentSize;
}

export const InputLabel = forwardRef<HTMLLabelElement, InputLabelProps>(
  function InputLabel(props, ref) {
    const [convProps, { sx, className, size, ...muiProps }] =
      splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiInputLabelProps["sx"]);
    const defaultSize = useDefaultComponentSize();
    const formControl = useFormControl();
    // size는 MUI InputLabel 타입('small' | 'normal')이지만, 본 디자인 시스템에서는
    // ComponentSize('small' | 'medium' | 'large')로 취급한다.
    const effectiveSize: ComponentSize =
      (size as ComponentSize | undefined) ??
      (formControl?.size as ComponentSize | undefined) ??
      defaultSize;

    return (
      <MuiInputLabel
        ref={ref}
        className={clsx(
          "InputLabel__base",
          "ok-input-label",
          sizeClass(effectiveSize),
          sizeConvenienceClassNames(convProps),
          className,
        )}
        sx={mergedSx}
        size={toMuiSmallMedium(effectiveSize)}
        {...muiProps}
      />
    );
  }
);
