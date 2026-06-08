// ============================================
// base/Input — MUI TextField + Convenience Props
// ============================================

import {
  sizeClass,
  toMuiSmallMedium,
  useDefaultComponentSize,
  type ComponentSize
} from "@/design-system";
import MuiTextField, {
  type TextFieldProps as MuiTextFieldProps
} from "@mui/material/TextField";
import clsx from "clsx";
import { forwardRef } from "react";
import {
  convenienceToSx,
  mergeSx,
  sizeConvenienceClassNames,
  splitConvenienceProps,
  type ConvenienceProps
} from "../types";
import "./Input.scss";

export type InputProps = ConvenienceProps &
  Omit<MuiTextFieldProps, "size"> & {
    size?: ComponentSize;
    readOnly?: boolean;
  };

export const Input = forwardRef<HTMLDivElement, InputProps>(
  function Input(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [
      convProps,
      { sx, className, size = defaultSize, readOnly, slotProps, ...muiProps }
    ] = splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiTextFieldProps["sx"]);

    // 외부에서 넘긴 slotProps를 존중하면서 readOnly를 input 슬롯에 주입
    const mergedSlotProps: MuiTextFieldProps["slotProps"] = {
      ...slotProps,
      input: {
        ...(typeof slotProps?.input === "object" ? slotProps.input : {}),
        ...(readOnly !== undefined && { readOnly })
      }
    };

    return (
      <MuiTextField
        ref={ref}
        className={clsx(
          "Input__base",
          "ok-input",
          sizeClass(size),
          sizeConvenienceClassNames(convProps),
          className
        )}
        sx={mergedSx}
        size={toMuiSmallMedium(size)}
        slotProps={mergedSlotProps}
        {...muiProps}
        autoComplete="new-password"
      />
    );
  }
);
