// ============================================
// KeywordSection — 키워드 목록 섹션 (재사용)
// Design Layer: props 기반 (로직 없음)
// ============================================

import {
  FlexBox,
  Typography,
  Chip,
  StarIcon,
  StarBorderIcon,
  CloseIcon
} from "@/components";

// ============================================
// Types
// ============================================

export interface KeywordData {
  id: string;
  text: string;
  isFavorite: boolean;
}

// ============================================
// Props
// ============================================

export interface KeywordSectionProps {
  /** 섹션 제목 */
  title: string;
  /** 키워드 목록 */
  keywords: KeywordData[];
  /** 선택된 키워드 ID 목록 */
  selectedIds?: Set<string>;
  /** 삭제 가능 여부 (선택된 키워드 섹션) */
  deletable?: boolean;
  /** 키워드 클릭 핸들러 */
  onToggleKeyword?: (id: string) => void;
  /** 즐겨찾기 토글 핸들러 */
  onToggleFavorite?: (id: string) => void;
  /** 키워드 삭제 핸들러 */
  onRemoveKeyword?: (id: string) => void;
}

// ============================================
// KeywordSection
// ============================================

export function KeywordSection({
  title,
  keywords,
  selectedIds,
  deletable,
  onToggleKeyword,
  onToggleFavorite,
  onRemoveKeyword
}: KeywordSectionProps) {
  if (keywords.length === 0) return null;

  return (
    <FlexBox direction="column" className="KeywordSection">
      <Typography className="KeywordSection__title">{title}</Typography>
      <FlexBox className="KeywordSection__chips">
        {keywords.map((keyword) => {
          const isSelected = selectedIds?.has(keyword.id) ?? false;

          return (
            <Chip
              key={keyword.id}
              label={keyword.text}
              icon={
                keyword.isFavorite ? (
                  <StarIcon
                    className="KeywordSection__star-icon KeywordSection__star-icon--active"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite?.(keyword.id);
                    }}
                  />
                ) : (
                  <StarBorderIcon
                    className="KeywordSection__star-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite?.(keyword.id);
                    }}
                  />
                )
              }
              deleteIcon={
                deletable ? (
                  <CloseIcon className="KeywordSection__delete-icon" />
                ) : undefined
              }
              onDelete={
                deletable && onRemoveKeyword
                  ? () => onRemoveKeyword(keyword.id)
                  : undefined
              }
              onClick={() => onToggleKeyword?.(keyword.id)}
              className={`KeywordSection__chip ${isSelected ? "KeywordSection__chip--selected" : ""}`}
            />
          );
        })}
      </FlexBox>
    </FlexBox>
  );
}
