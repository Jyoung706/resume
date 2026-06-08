// ============================================
// base/Select — MUI Select 래퍼
// ============================================
// MUI SelectProps는 variant별 union 타입이므로
// ConvenienceProps intersection 대신 단순 래핑

import { forwardRef } from "react";
import clsx from "clsx";
import MuiSelect, {
  type SelectProps as MuiSelectProps,
} from "@mui/material/Select";
import { useFormControl } from "@mui/material/FormControl";
import {
  useDefaultComponentSize,
  sizeClass,
  toMuiSmallMedium,
  type ComponentSize,
} from "@/design-system";
import "./Select.scss";

export type SelectProps<T = unknown> = Omit<MuiSelectProps<T>, "size"> & {
  size?: ComponentSize;
};

export const Select = forwardRef<HTMLDivElement, SelectProps>(
  function Select({ className, size, ...rest }, ref) {
    const defaultSize = useDefaultComponentSize();
    const formControl = useFormControl();
    const effectiveSize: ComponentSize =
      (size as ComponentSize | undefined) ??
      (formControl?.size as ComponentSize | undefined) ??
      defaultSize;

    return (
      <MuiSelect
        ref={ref}
        className={clsx(
          "Select__base",
          "ok-select",
          sizeClass(effectiveSize),
          className,
        )}
        size={toMuiSmallMedium(effectiveSize)}
        {...rest}
      />
    );
  },
);
