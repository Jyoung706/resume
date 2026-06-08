// ============================================
// SchemaSelectionMenu — 스키마 선택 Popper
// Design Layer: props 기반 (로직 없음)
// ============================================
// [선택 초기화] [X]
// ── 테이블 (N개) ──
// [T USERS ✕] [T ORDERS ✕]
// ── 개별 컬럼 (N개) ──
// [C PROD.name ✕] [C PROD.price ✕]
// [+ 스키마 추가]
// ============================================

import {
  Button,
  Chip,
  ClickAwayListener,
  Divider,
  FlexBox,
  Icon,
  CancelIcon,
  IconButton,
  Paper,
  Popper,
  Typography
} from "@/components";
import type { SelectedSchemaItem } from "@/logic/chat/main/useSchemaSelectionMenu";
import "./SchemaSelectionMenu.scss";

// ============================================
// Props
// ============================================

export interface SchemaSelectionMenuProps {
  /** Popper 열림 여부 */
  open: boolean;
  /** Popper 앵커 엘리먼트 */
  anchorEl: HTMLElement | null;
  /** 닫기 핸들러 */
  onClose: () => void;
  /** 선택된 스키마 항목 */
  selectedItems: SelectedSchemaItem[];
  /** 선택된 테이블 수 */
  selectedTableCount: number;
  /** 선택된 컬럼 수 */
  selectedColumnCount: number;
  /** 로딩 */
  loading?: boolean;
  /** 항목 삭제 */
  onRemoveItem: (item: SelectedSchemaItem) => void;
  /** 선택 초기화 */
  onClearAll: () => void;
  /** 스키마 추가 (우측 패널 열기) */
  onAddSchema?: () => void;
}

// ============================================
// SchemaSelectionMenu
// ============================================

export function SchemaSelectionMenu({
  open,
  anchorEl,
  onClose,
  selectedItems,
  selectedTableCount,
  selectedColumnCount,
  loading,
  onRemoveItem,
  onClearAll,
  onAddSchema
}: SchemaSelectionMenuProps) {
  if (!open || !anchorEl) return null;

  const tableItems = selectedItems.filter((i) => i.type === "table");
  const columnItems = selectedItems.filter((i) => i.type === "column");

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
      className="SchemaSelectionMenu__popper"
    >
      <ClickAwayListener onClickAway={onClose}>
        <Paper className="SchemaSelectionMenu__paper">
          {/* 헤더: 선택 초기화 + 닫기 */}
          <FlexBox className="SchemaSelectionMenu__header">
            {selectedItems.length > 0 && (
              <Button
                className="SchemaSelectionMenu__reset-btn"
                size="small"
                startIcon={<Icon mui>AutorenewIcon</Icon>}
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
              <Icon mui className="SchemaSelectionMenu__close-icon">CloseIcon</Icon>
            </IconButton>
          </FlexBox>

          {/* 본문 */}
          {!loading && (
            <FlexBox direction="column" className="SchemaSelectionMenu__body">
              {/* 테이블 섹션 */}
              <FlexBox direction="column" className="SchemaSelectionMenu__section">
                <FlexBox
                  justify="space-between"
                  align="center"
                  className="SchemaSelectionMenu__section-header"
                >
                  <Typography className="SchemaSelectionMenu__section-label">
                    테이블
                  </Typography>
                  <Typography className="SchemaSelectionMenu__section-count">
                    {selectedTableCount}
                  </Typography>
                </FlexBox>

                {tableItems.length > 0 ? (
                  <FlexBox className="SchemaSelectionMenu__chips">
                    {tableItems.map((item) => (
                      <Chip
                        key={item.id}
                        label={item.label}
                        variant="outlined"
                        onDelete={() => onRemoveItem(item)}
                        deleteIcon={<CancelIcon fontSize="small" className="SchemaSelectionMenu__chip-delete" />}
                        className="SchemaSelectionMenu__chip SchemaSelectionMenu__chip-table"
                      />
                    ))}
                  </FlexBox>
                ) : (
                  <Typography className="SchemaSelectionMenu__empty">
                    선택된 테이블 없음
                  </Typography>
                )}
              </FlexBox>

              <Divider />

              {/* 컬럼 섹션 */}
              <FlexBox direction="column" className="SchemaSelectionMenu__section">
                <FlexBox
                  justify="space-between"
                  align="center"
                  className="SchemaSelectionMenu__section-header"
                >
                  <Typography className="SchemaSelectionMenu__section-label SchemaSelectionMenu__count">
                    개별 컬럼
                  </Typography>
                  <Typography className="SchemaSelectionMenu__section-count">
                    {selectedColumnCount}
                  </Typography>
                </FlexBox>

                {columnItems.length > 0 ? (
                  <FlexBox className="SchemaSelectionMenu__chips">
                    {columnItems.map((item) => (
                      <Chip
                        key={item.id}
                        label={item.label}
                        variant="outlined"
                        onDelete={() => onRemoveItem(item)}
                        deleteIcon={<CancelIcon fontSize="small" className="SchemaSelectionMenu__chip-delete" />}
                        className="SchemaSelectionMenu__chip SchemaSelectionMenu__chip-column"
                      />
                    ))}
                  </FlexBox>
                ) : (
                  <Typography className="SchemaSelectionMenu__empty">
                    개별 선택된 컬럼 없음
                  </Typography>
                )}
              </FlexBox>
            </FlexBox>
          )}

          {/* 푸터: 스키마 추가 */}
          <FlexBox className="SchemaSelectionMenu__footer">
            <Button
              className="SchemaSelectionMenu__add-btn"
              size="small"
              variant="outlined"
              startIcon={<Icon mui>AddIcon</Icon>}
              onClick={onAddSchema}
            >
              스키마 추가
            </Button>
          </FlexBox>
        </Paper>
      </ClickAwayListener>
    </Popper>
  );
}
