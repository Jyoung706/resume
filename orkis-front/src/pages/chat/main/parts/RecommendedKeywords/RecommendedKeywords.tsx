// ============================================
// domain/RecommendedKeywords — 추천 키워드 Chip 목록
// Design Layer: props-only (상태관리 모름)
// ============================================

import clsx from "clsx";
import { FlexBox, Typography, CircularProgress, Chip } from "@/components";
import "./RecommendedKeywords.scss";

export interface RecommendedKeywordItem {
  id: string;
  text: string;
  isSelected?: boolean;
}

export interface RecommendedKeywordsProps {
  items: RecommendedKeywordItem[];
  loading?: boolean;
  onKeywordClick?: (keyword: RecommendedKeywordItem) => void;
  className?: string;
}

export function RecommendedKeywords({
  items,
  loading,
  onKeywordClick,
  className
}: RecommendedKeywordsProps) {
  if (!loading && items.length === 0) return null;

  return (
    <FlexBox
      className={clsx("RecommendedKeywords", className)}
      direction="column"
    >
      <Typography className="RecommendedKeywords__title">
        추천 키워드
      </Typography>
      {loading && (
        <FlexBox className="RecommendedKeywords__loading" justify="center">
          <CircularProgress size="medium" />
        </FlexBox>
      )}
      {!loading && (
        <FlexBox className="RecommendedKeywords__list" wrap="wrap">
          {items.map((item) => (
            <Chip
              key={item.id}
              label={`#${item.text}`}
              variant={item.isSelected ? "filled" : "outlined"}
              onClick={() => onKeywordClick?.(item)}
              className={clsx(
                "RecommendedKeywords__chip",
                item.isSelected && "RecommendedKeywords__chip--selected"
              )}
            />
          ))}
        </FlexBox>
      )}
    </FlexBox>
  );
}
