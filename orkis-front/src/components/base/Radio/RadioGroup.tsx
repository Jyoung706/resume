// ============================================
// base/RadioGroup — MUI RadioGroup wrapper
// ============================================

import clsx from "clsx";
import MuiRadioGroup, {
  type RadioGroupProps as MuiRadioGroupProps,
} from "@mui/material/RadioGroup";

export interface RadioGroupProps extends MuiRadioGroupProps {}

export function RadioGroup({ className, ...rest }: RadioGroupProps) {
  return <MuiRadioGroup className={clsx("ok-radio-group", className)} {...rest} />;
}
