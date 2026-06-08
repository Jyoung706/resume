// ============================================
// base/Form — MUI Box(component="form") + Convenience Props
// ============================================
// MUI에 전용 Form 컴포넌트가 없으므로
// Box를 form으로 래핑하여 onSubmit 등 form-specific props 제공

import { forwardRef, type FormEvent } from "react";
import clsx from "clsx";
import MuiBox, { type BoxProps as MuiBoxProps } from "@mui/material/Box";
import {
  useDefaultComponentSize,
  sizeClass,
  type ComponentSize,
} from "@/design-system";
import {
  type VisualConvenienceProps,
  splitVisualConvenienceProps,
  visualConvenienceToSx,
  mergeSx,
  sizeConvenienceClassNames,
} from "../types";
import "./Form.scss";

export interface FormProps
  extends VisualConvenienceProps,
    Omit<MuiBoxProps<"form">, "component" | "onSubmit"> {
  /** submit 핸들러 — e.preventDefault() 자동 호출 */
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  /** HTML5 유효성 검사 비활성화 (기본: true) */
  noValidate?: boolean;
  size?: ComponentSize;
}

export const Form = forwardRef<HTMLFormElement, FormProps>(
  function Form({ onSubmit, noValidate = true, size, ...props }, ref) {
    const defaultSize = useDefaultComponentSize();
    const effectiveSize: ComponentSize = size ?? defaultSize;
    const [convProps, { sx, className, ...muiProps }] = splitVisualConvenienceProps(props);
    const convSx = visualConvenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiBoxProps["sx"]);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      onSubmit?.(e);
    };

    return (
      <MuiBox
        ref={ref}
        component="form"
        className={clsx(
          "Form__base",
          "ok-form",
          sizeClass(effectiveSize),
          sizeConvenienceClassNames(props as Record<string, unknown>),
          className,
        )}
        sx={mergedSx}
        onSubmit={handleSubmit}
        noValidate={noValidate}
        {...muiProps}
      />
    );
  },
);
