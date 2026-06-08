// ============================================
// ui/RadioButtonGroup — label/value 기반 라디오 버튼 그룹
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import { Radio } from "../../base/Radio";
import {
  RadioGroup,
  type RadioGroupProps,
} from "../../base/Radio";
import { FormControlLabel } from "../../base/FormControlLabel";
import { FormLabel } from "../../base/FormLabel";
import { FormControl } from "../../base/FormControl";
import "./RadioButtonGroup.scss";


export interface RadioOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface RadioButtonGroupProps
  extends Omit<RadioGroupProps, "children"> {
  /** 라디오 옵션 목록 */
  options: RadioOption[];
  /** 그룹 라벨 */
  label?: string;
  /** 라디오 크기 */
  size?: "small" | "medium";
  /** 개별 라디오 비활성화 여부와 별개로 그룹 전체 비활성화 */
  disabled?: boolean;
}

export const RadioButtonGroup = forwardRef<
  HTMLDivElement,
  RadioButtonGroupProps
>(function RadioButtonGroup(
  {
    options,
    label,
    size = "small",
    disabled = false,
    className,
    ...radioGroupProps
  },
  ref,
) {
  return (
    <FormControl
      ref={ref}
      className={clsx("RadioButtonGroup__base", "ok-radio-button-group", className)}
      disabled={disabled}
    >
      {label && <FormLabel>{label}</FormLabel>}
      <RadioGroup {...radioGroupProps}>
        {options.map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            label={option.label}
            disabled={option.disabled}
            control={<Radio size={size} />}
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
});
