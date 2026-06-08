// ============================================
// KeywordSelector — 입력창 상단 키워드 바
// Design Layer: props 기반 (로직 없음)
// ============================================
// [키워드] [▼] [#chip1 ✕] [#chip2 ✕] ... [전체취소]
// ============================================

import {
  ArrowDropDownIcon,
  Chip,
  Icon,
  CancelIcon,
  FlexBox,
  IconButton,
  Typography
} from "@/components";
import type { SelectedKeywordItem } from "../KeywordSelectionMenu/KeywordSelectionMenu";
import "./KeywordSelector.scss";

// ============================================
// Props
// ============================================

export interface KeywordSelectorProps {
  /** 선택된 키워드 목록 */
  selectedKeywords: SelectedKeywordItem[];
  /** 표시 여부 (선택된 키워드가 있을 때만) */
  visible: boolean;
  /** 비활성화 */
  disabled?: boolean;
  /** 키워드 삭제 (선택 해제) */
  onRemoveKeyword: (id: string) => void;
  /** 전체 해제 */
  onClearAll: () => void;
  /** 드롭다운 버튼 클릭 (KeywordSelectionMenu 열기) */
  onDropdownClick: (event: React.MouseEvent<HTMLElement>) => void;
}

// ============================================
// KeywordSelector
// ============================================

export function KeywordSelector({
  selectedKeywords,
  
  visible,
  disabled,
  onRemoveKeyword,
  onClearAll,
  onDropdownClick
}: KeywordSelectorProps) {
  if (!visible) return null;

  return (
    <FlexBox align="center" className="KeywordSelector__container">
      {/* 라벨 */}
      {/* <SellOutlinedIcon className="KeywordSelector__label-icon" /> */}
      <Icon size="small" className="KeywordSelector__label-icon">sell</Icon>
      <Typography className="KeywordSelector__label">키워드</Typography>

      {/* 드롭다운 버튼 */}
      <IconButton
        className="KeywordSelector__dropdown-btn"
        onClick={onDropdownClick}
        disabled={disabled}
        aria-label="키워드 패널 열기"
      >
        <ArrowDropDownIcon />
      </IconButton>

      {/* Chip 컨테이너 (수평 스크롤) */}
      <FlexBox className="KeywordSelector__chips">
        {selectedKeywords.map((keyword) => (
          <Chip
            key={keyword.id}
            label={`#${keyword.name}`}
            deleteIcon={<CancelIcon fontSize="small" className="KeywordSelector__chip-delete" />}
            onDelete={disabled ? undefined : () => onRemoveKeyword(keyword.id)}
            className="KeywordSelector__chip"
            disabled={disabled}
          />
        ))}
      </FlexBox>

      {/* 전체취소 */}
      {selectedKeywords.length > 0 && (
        <Typography
          component="span"
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="모든 키워드 제거"
          className="KeywordSelector__clear-all"
          onClick={disabled ? undefined : onClearAll}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (!disabled && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              onClearAll();
            }
          }}
        >
          전체취소
        </Typography>
      )}
    </FlexBox>
  );
}
