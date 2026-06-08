// ============================================
// DockviewCustomTab — Outer dockview 탭 커스텀 렌더러 (Design)
// 더블클릭 인라인 편집 + 닫기 버튼. props-only.
// ============================================

import { useEffect, useRef, useState } from "react";
import { IconButton, Input, Typography, Icon, FlexBox } from "@/components";
import "./DockviewCustomTab.scss";

export interface DockviewCustomTabProps {
  title: string;
  onClose: () => void;
  onRename?: (next: string) => void;
  maxLength?: number;
}

export function DockviewCustomTab({
  title,
  onClose,
  onRename,
  maxLength = 50,
}: DockviewCustomTabProps) {
  const [editing, setEditing] = useState(false);
  const inputWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editing) return;
    const input = inputWrapperRef.current?.querySelector("input");
    if (input) {
      input.focus();
      input.select();
    }
  }, [editing]);

  const commit = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== title) {
      onRename?.(trimmed);
    }
    setEditing(false);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit((e.target as HTMLInputElement).value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditing(false);
    }
    e.stopPropagation();
  };

  return (
    <FlexBox className="DockviewCustomTab" align="center">
      <Icon className="InnerDockviewTab__drag">drag_indicator</Icon>
      {editing && onRename ? (
        <Input
          ref={inputWrapperRef}
          className="DockviewCustomTab__input"
          defaultValue={title}
          size="small"
          onKeyDown={handleKeyDown}
          onBlur={(e) => commit(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          slotProps={{
            input: {
              inputProps: { maxLength },
            },
          }}
        />
      ) : (
        <Typography
          className="DockviewCustomTab__title"
          variant="body2"
          component="span"
          onDoubleClick={(e) => {
            if (!onRename) return;
            e.stopPropagation();
            setEditing(true);
          }}
          title={onRename ? "더블클릭하여 이름 변경" : undefined}
        >
          {title}
        </Typography>
      )}
      <IconButton
        className="DockviewCustomTab__close"
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        title="탭 닫기"
        aria-label="탭 닫기"
      >
        <Icon>close</Icon>
      </IconButton>
    </FlexBox>
  );
}
