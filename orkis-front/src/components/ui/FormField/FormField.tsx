// ============================================
// ui/FormField — 라벨 + 입력 영역 + 에러/도움말 복합 컴포넌트
// ============================================

import {
  ComponentSizeOverride,
  sizeClass,
  useDefaultComponentSize,
  type ComponentSize
} from "@/design-system";
import type { SxProps, Theme } from "@mui/material/styles";
import clsx from "clsx";
import { type ReactNode } from "react";
import { FormHelperText } from "../../base/FormHelperText";
import { FormLabel } from "../../base/FormLabel";
import { FlexBox } from "../../layout/FlexBox";
import "./FormField.scss";

export interface FormFieldProps {
  /** 필드 라벨 텍스트 */
  label?: string;
  /** 필수 입력 표시 (*) */
  required?: boolean;
  /** 에러 메시지 (있으면 빨간색으로 표시) */
  error?: string;
  /** 도움말 텍스트 (에러 없을 때 회색으로 표시) */
  helpText?: string;
  /** 컴포넌트 사이즈 (기본: design-system 기본값) */
  size?: ComponentSize;
  /** 라벨 영역 너비 (기본: "7.5rem") */
  labelWidth?: string;
  /** 추가 className */
  className?: string;
  /** 추가 sx */
  sx?: SxProps<Theme>;
  /** 입력 요소 (Input, PasswordInput, FlexBox 등) */
  children: ReactNode;
}

export function FormField({
  label,
  required,
  error,
  helpText,
  size: sizeProp,
  labelWidth = "7.5rem",
  className,
  sx,
  children
}: FormFieldProps) {
  const defaultSize = useDefaultComponentSize();
  const size = sizeProp ?? defaultSize;

  return (
    <FlexBox
      className={clsx(
        "FormField__base",
        "ok-form-field",
        sizeClass(size),
        className
      )}
      sx={sx}
    >
      {/* 라벨 영역 */}
      {label !== undefined && (
        <FlexBox
          className="FormField__label ok-form-field-label"
          style={{ width: labelWidth, minWidth: labelWidth }}
        >
          <FormLabel required={required}>{label}</FormLabel>
        </FlexBox>
      )}

      {/* 입력 + 에러/도움말 영역 */}
      <FlexBox className="FormField__content ok-form-field-content">
        <ComponentSizeOverride size={size}>
          {children}
        </ComponentSizeOverride>

        {error && (
          <FormHelperText
            className="FormField__error ok-form-field-error"
            error
          >
            {error}
          </FormHelperText>
        )}

        {helpText && !error && (
          <FormHelperText className="FormField__help ok-form-field-help">
            {helpText}
          </FormHelperText>
        )}
      </FlexBox>
    </FlexBox>
  );
}
