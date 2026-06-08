// ============================================
// KeywordSelectionMenu — 키워드 선택 Popper (심플 버전)
// Design Layer: props 기반 (로직 없음)
// ============================================
// [선택 초기화] [X]
// 선택된 키워드 수 N
// [chip ✕] [chip ✕] ...
// [+ 키워드 추가]
// ============================================

import {
  Button,
  Chip,
  CircularProgress,
  ClickAwayListener,
  FlexBox,
  CancelIcon,
  Icon,
  IconButton,
  Paper,
  Popper,
  Typography
} from "@/components";
import "./KeywordSelectionMenu.scss";

// ============================================
// Types
// ============================================

export interface SelectedKeywordItem {
  id: string;
  name: string;
}

// ============================================
// Props
// ============================================

export interface KeywordSelectionMenuProps {
  /** Popper 열림 여부 */
  open: boolean;
  /** Popper 앵커 엘리먼트 */
  anchorEl: HTMLElement | null;
  /** 닫기 핸들러 */
  onClose: () => void;
  /** 선택된 키워드 목록 */
  selectedKeywords: SelectedKeywordItem[];
  /** 로딩 */
  loading?: boolean;
  /** 키워드 삭제 (선택 해제) */
  onRemoveKeyword: (id: string) => void;
  /** 선택 초기화 (전체 해제) */
  onClearAll: () => void;
  /** 키워드 추가 (우측 패널 열기) */
  onAddKeyword?: () => void;
}

// ============================================
// KeywordSelectionMenu
// ============================================

export function KeywordSelectionMenu({
  open,
  anchorEl,
  onClose,
  selectedKeywords,
  loading,
  onRemoveKeyword,
  onClearAll,
  onAddKeyword
}: KeywordSelectionMenuProps) {
  if (!open || !anchorEl) return null;

  const popperModifiers = [
    { name: "preventOverflow", options: { padding: 8 } },
    { name: "flip", options: { fallbackPlacements: ["bottom-end", "top-start"] } },
    { name: "offset", options: { offset: [0, 4] } }
  ];

  return (
    <Popper
      open={open}
      anchorEl={anchorEl}
      placement="top-end"
      modifiers={popperModifiers}
      className="KeywordSelectionMenu__popper"
    >
      <ClickAwayListener onClickAway={onClose}>
        <Paper className="KeywordSelectionMenu__paper">
          {/* 헤더: 선택 초기화 + 닫기 */}
          <FlexBox className="KeywordSelectionMenu__header">
            {selectedKeywords.length > 0 && (
              <Button
                className="KeywordSelectionMenu__reset-btn"
                size="small"
                startIcon={<Icon mui size="small">refresh</Icon>}
                onClick={onClearAll}
              >
                선택 초기화
              </Button>
            )}
            <IconButton
              size="small"
              onClick={onClose}
              aria-label="닫기"
            >
              <Icon mui className="KeywordSelectionMenu__close-icon">CloseIcon</Icon>
            </IconButton>
          </FlexBox>

          {/* 로딩 */}
          {loading && (
            <FlexBox className="KeywordSelectionMenu__loading">
              <CircularProgress size="medium" />
            </FlexBox>
          )}

          {/* 본문 */}
          {!loading && (
            <FlexBox direction="column" className="KeywordSelectionMenu__body">
              {/* 선택 수 */}
              <Typography className="KeywordSelectionMenu__count">
                선택된 키워드 수 <strong>{selectedKeywords.length}</strong>
              </Typography>

              {/* 선택된 키워드 Chips */}
              {selectedKeywords.length > 0 && (
                <FlexBox className="KeywordSelectionMenu__chips">
                  {selectedKeywords.map((keyword) => (
                    <Chip
                      key={keyword.id}
                      label={keyword.name}
                      variant="outlined"
                      onDelete={() => onRemoveKeyword(keyword.id)}
                      deleteIcon={<CancelIcon fontSize="small" className="KeywordSelector__chip-delete" />}
                      className="KeywordSelectionMenu__chip"
                    />
                  ))}
                </FlexBox>
              )}

              {/* 빈 상태 */}
              {selectedKeywords.length === 0 && (
                <Typography className="KeywordSelectionMenu__empty">
                  선택된 키워드가 없습니다
                </Typography>
              )}
            </FlexBox>
          )}

          {/* 푸터: 키워드 추가 */}
          <FlexBox className="KeywordSelectionMenu__footer">
            <Button
              className="KeywordSelectionMenu__add-btn"
              variant="outlined"
              size="small"
              startIcon={<Icon mui>add_2</Icon>}
              onClick={onAddKeyword}
            >
              키워드 추가
            </Button>
          </FlexBox>
        </Paper>
      </ClickAwayListener>
    </Popper>
  );
}
