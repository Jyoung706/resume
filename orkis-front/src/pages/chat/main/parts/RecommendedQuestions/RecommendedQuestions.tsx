// ============================================
// domain/RecommendedQuestions — 추천 질문 카드 목록
// Design Layer: props-only (상태관리 모름)
// ============================================

import clsx from "clsx";
import { FlexBox, Icon, Stack, Typography, CircularProgress } from "@/components";
import "./RecommendedQuestions.scss";

export interface RecommendedQuestionItem {
  id: string;
  question: string;
  category: string;
  icon: string;
  iconColor?: string;
}

export interface RecommendedQuestionsProps {
  items: RecommendedQuestionItem[];
  loading?: boolean;
  onQuestionClick?: (question: string) => void;
  className?: string;
}

export function RecommendedQuestions({
  items,
  loading,
  onQuestionClick,
  className
}: RecommendedQuestionsProps) {
  if (!loading && items.length === 0) return null;

  return (
    <FlexBox
      className={clsx("RecommendedQuestions", className)}
      direction="column"
    >
      <Typography className="RecommendedQuestions__title">
        추천 질문
      </Typography>
      <Stack className="RecommendedQuestions__list">
        {loading && (
          <FlexBox className="RecommendedQuestions__loading" justify="center">
            <CircularProgress size="medium" />
          </FlexBox>
        )}
        {!loading &&
          items.map((item) => (
            <FlexBox
              key={item.id}
              className="RecommendedQuestions__item"
              align="center"
              onClick={() => onQuestionClick?.(item.question)}
            >
              <FlexBox
                className="RecommendedQuestions__icon-wrapper"
                align="center"
                justify="center"
              >
                <Icon size="small" color={item.iconColor}>{item.icon}</Icon>
              </FlexBox>
              <Typography className="RecommendedQuestions__text">
                {item.question}
              </Typography>
              <Typography className="RecommendedQuestions__category">
                {item.category}
              </Typography>
            </FlexBox>
          ))}
      </Stack>
    </FlexBox>
  );
}
