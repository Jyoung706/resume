// ============================================
// ui/PasswordInput — 비밀번호 표시/숨김 토글 인풋
// ============================================

import { forwardRef, useState } from "react";
import clsx from "clsx";
import { InputAdornment } from "../../base/InputAdornment";
import { VisibilityIcon, VisibilityOffIcon } from "../../base/MuiIcon";
import { Input, type InputProps } from "../../base/Input";
import { IconButton } from "../../base/IconButton";
import "./PasswordInput.scss";


export interface PasswordInputProps extends Omit<InputProps, "type"> {
  showToggle?: boolean;
}

export const PasswordInput = forwardRef<HTMLDivElement, PasswordInputProps>(
  function PasswordInput({ showToggle = true, className, ...rest }, ref) {
    const [visible, setVisible] = useState(false);

    const toggleVisibility = () => {
      setVisible((prev) => !prev);
    };

    return (
      <Input
        ref={ref}
        className={clsx("PasswordInput__base", "ok-password-input", className)}
        type={visible ? "text" : "password"}
        slotProps={{
          input: showToggle
            ? {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={toggleVisibility}
                      aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"}
                    >
                      {visible ? (
                        <VisibilityOffIcon fontSize="small" />
                      ) : (
                        <VisibilityIcon fontSize="small" />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }
            : undefined,
        }}
        {...rest}
      />
    );
  },
);
