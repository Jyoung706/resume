// ============================================
// ChatInput — 채팅 메시지 입력 컴포넌트
// Design Layer: props 기반 (로직 없음)
// ============================================

import { useRef, useLayoutEffect } from "react";
import clsx from "clsx";
import {
  Box,
  FlexBox,
  Icon,
  IconButton,
  Typography
} from "@/components";
import "./ChatInput.scss";

// ============================================
// 아이콘 매핑
// ============================================

const OPTION_ICON_MAP: Record<string, string> = {
  keywords: "sell",
  schema: "network_node",
  history: "history",
};

// ============================================
// Props
// ============================================

export interface ActiveOptionIcon {
  id: string;
  /** 아이콘 키 (keywords, schema, history) */
  icon: string;
}

export interface ChatInputToolbarProps {
  // ── DB 선택 ──
  selectedDbName?: string;
  isDbHighlighted?: boolean;
  onDbSelectorClick?: (event: React.MouseEvent<HTMLElement>) => void;

  // ── 모델 선택 ──
  selectedModelName?: string;
  onModelSelectorClick?: (event: React.MouseEvent<HTMLElement>) => void;

  // ── Add 메뉴 ──
  onAddMenuClick?: (event: React.MouseEvent<HTMLElement>) => void;
  isAddMenuOpen?: boolean;

  // ── 선택된 옵션 아이콘 ──
  activeOptionIcons?: ActiveOptionIcon[];
  onOptionIconClick?: (optionId: string) => void;
}

export interface ChatInputProps extends ChatInputToolbarProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
  disabled?: boolean;
  isSending?: boolean;
  placeholder?: string;
}

// ============================================
// ChatInput
// ============================================

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  disabled,
  isSending,
  placeholder = "메시지를 입력하세요...",
  // toolbar props
  selectedDbName,
  isDbHighlighted,
  onDbSelectorClick,
  selectedModelName,
  onModelSelectorClick,
  onAddMenuClick,
  isAddMenuOpen,
  activeOptionIcons,
  onOptionIconClick,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // textarea 자동 높이 조절 (max-height: 8rem과 동기화)
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const maxPx = parseFloat(getComputedStyle(el).maxHeight);
    el.style.height = "auto";
    el.style.height = maxPx
      ? `${Math.min(el.scrollHeight, maxPx)}px`
      : `${el.scrollHeight}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !isSending && value.trim()) {
        onSend();
      }
    }
  };

  return (
    <FlexBox className="ChatInput__container" direction="column">
      {/* 텍스트 입력 영역 */}
      <Box className="ChatInput__body">
        <textarea
          ref={textareaRef}
          className="ChatInput__textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          rows={1}
        />
      </Box>

      {/* 하단 툴바 */}
      <FlexBox className="ChatInput__toolbar">
        {/* 좌측: Add 버튼 + 선택된 옵션 아이콘들 */}
        <FlexBox className="ChatInput__toolbar-left">
          {onAddMenuClick && (
            <Box
              className={clsx(
                "ChatInput__add-btn",
                isAddMenuOpen && "ChatInput__add-btn--active"
              )}
              onClick={onAddMenuClick}
            >
              <Icon mui className="ChatInput__add-icon">AddIcon</Icon>
            </Box>
          )}

          {activeOptionIcons && activeOptionIcons.length > 0 && (
            <FlexBox className="ChatInput__option-icons">
              {activeOptionIcons.map((opt) => {
                const iconName = OPTION_ICON_MAP[opt.icon];
                if (!iconName) return null;
                return (
                  <Icon
                    key={opt.id}
                    className="ChatInput__option-icon"
                    onClick={() => onOptionIconClick?.(opt.id)}
                  >
                    {iconName}
                  </Icon>
                );
              })}
            </FlexBox>
          )}
        </FlexBox>

        {/* 우측: DB 셀렉터 + 모델 셀렉터 + 전송 버튼 */}
        <FlexBox className="ChatInput__toolbar-right">
          {/* DB 셀렉터 */}
          {onDbSelectorClick && (
            <Box
              className={clsx(
                "ChatInput__selector",
                isDbHighlighted && "ChatInput__selector--highlighted"
              )}
              onClick={onDbSelectorClick}
            >
              <Typography
                className="ChatInput__selector-text"
                variant="caption"
              >
                {selectedDbName || "DB 선택"}
              </Typography>
              <Icon mui className="ChatInput__selector-arrow">ArrowDropDownIcon</Icon>
            </Box>
          )}

          {/* 모델 셀렉터 */}
          {onModelSelectorClick && (
            <Box
              className="ChatInput__selector"
              onClick={onModelSelectorClick}
            >
              <Typography
                className="ChatInput__selector-text"
                variant="caption"
              >
                {selectedModelName || "LLM 선택"}
              </Typography>
              <Icon mui className="ChatInput__selector-arrow">ArrowDropDownIcon</Icon>
            </Box>
          )}

          {/* 전송/중지 버튼 */}
          {isSending ? (
            <IconButton
              className="ChatInput__send-btn ChatInput__send-btn--streaming"
              onClick={onStop}
              aria-label="스트리밍 중지"
            >
              <Icon mui className="ChatInput__send-icon">StopIcon</Icon>
            </IconButton>
          ) : (
            <IconButton
              className="ChatInput__send-btn"
              onClick={onSend}
              disabled={disabled || !value.trim()}
              aria-label="메시지 전송"
            >
              <Icon mui className="ChatInput__send-icon">ArrowUpwardIcon</Icon>
            </IconButton>
          )}
        </FlexBox>
      </FlexBox>
    </FlexBox>
  );
}
