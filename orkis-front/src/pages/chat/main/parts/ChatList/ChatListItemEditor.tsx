// ============================================
// ChatListItemEditor — 채팅 제목 인라인 편집
// Design Layer: ChatList 내부 전용
// ============================================

import { useRef, useEffect } from "react";
import clsx from "clsx";
import { Input } from "@/components";

// ============================================
// Props
// ============================================

export interface ChatListItemEditorProps {
  className?: string;
  value: string;
  maxLength?: number;
  onSave: (value: string) => void;
  onCancel: () => void;
}

// ============================================
// ChatListItemEditor
// ============================================

export function ChatListItemEditor({
  className,
  value,
  maxLength,
  onSave,
  onCancel
}: ChatListItemEditorProps) {
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const input = inputRef.current?.querySelector("input");
    if (input) {
      input.focus();
      input.select();
    }
  }, []);

  const handleSave = (currentValue: string) => {
    const trimmed = currentValue.trim();
    if (trimmed) {
      onSave(trimmed);
    } else {
      onCancel();
    }
  };

  const handleKeyDown: React.KeyboardEventHandler = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave((e.target as HTMLInputElement).value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  const handleBlur: React.FocusEventHandler<HTMLInputElement> = (e) => {
    handleSave(e.target.value);
  };

  return (
    <Input
      ref={inputRef}
      className={clsx("ChatListItemEditor", className)}
      defaultValue={value}
      size="small"
      fullWidth
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      slotProps={{
        input: {
          inputProps: { maxLength }
        }
      }}
    />
  );
}
