// ============================================
// ui/SearchInput — 검색 인풋 (base Input + IconButton 조합)
// ============================================

import { forwardRef, useState } from "react";
import clsx from "clsx";
import { InputAdornment } from "../../base/InputAdornment";
import { SearchIcon, ClearIcon } from "../../base/MuiIcon";
import { Input, type InputProps } from "../../base/Input";
import { IconButton } from "../../base/IconButton";
import "./SearchInput.scss";


export interface SearchInputProps extends Omit<InputProps, "type"> {
  onSearch?: (value: string) => void;
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLDivElement, SearchInputProps>(
  function SearchInput({ onSearch, onClear, value, onChange, className, ...rest }, ref) {
    const [internalValue, setInternalValue] = useState("");
    const currentValue = value !== undefined ? String(value) : internalValue;

    const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
      if (value === undefined) setInternalValue(e.target.value);
      onChange?.(e);
    };

    const handleClear = () => {
      if (value === undefined) {
        // 비제어: 내부 상태 초기화
        setInternalValue("");
      } else if (onChange) {
        // 제어: 빈 값으로 onChange 합성 호출 → 부모 상태도 초기화
        const syntheticEvent = {
          target: { value: "" },
          currentTarget: { value: "" },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
      onClear?.();
    };

    const handleKeyDown: React.KeyboardEventHandler = (e) => {
      if (e.key === "Enter") {
        onSearch?.(currentValue);
      }
    };

    return (
      <Input
        ref={ref}
        className={clsx("SearchInput__base", "ok-search-input", className)}
        value={currentValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="검색..."
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: currentValue ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={handleClear} aria-label="지우기">
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          },
        }}
        {...rest}
      />
    );
  },
);
