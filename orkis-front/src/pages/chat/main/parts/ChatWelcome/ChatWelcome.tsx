// ============================================
// domain/ChatWelcome — 환영문구 + 추천질문 + 추천키워드 조합
// Design Layer: props-only (상태관리 모름)
// ============================================

import clsx from "clsx";
import { FlexBox, Typography, Divider } from "@/components";
import {
  RecommendedQuestions,
  type RecommendedQuestionItem
} from "../RecommendedQuestions";
import {
  RecommendedKeywords,
  type RecommendedKeywordItem
} from "../RecommendedKeywords";
import "./ChatWelcome.scss";

export interface ChatWelcomeProps {
  // 환영 문구
  title?: string;
  subtitle?: string;
  // 추천 질문
  questions: RecommendedQuestionItem[];
  questionsLoading?: boolean;
  onQuestionClick?: (question: string) => void;
  // 추천 키워드
  keywords: RecommendedKeywordItem[];
  keywordsLoading?: boolean;
  onKeywordClick?: (keyword: RecommendedKeywordItem) => void;
  className?: string;
}

export function ChatWelcome({
  title = "ORKIS AI와 대화를 시작하세요",
  subtitle = "궁금한 것이 있으면 언제든 물어보세요!",
  questions,
  questionsLoading,
  onQuestionClick,
  keywords,
  keywordsLoading,
  onKeywordClick,
  className
}: ChatWelcomeProps) {
  return (
    <FlexBox
      className={clsx("ChatWelcome", className)}
      direction="column"
    >
      {/* 환영 문구 섹션 */}
      <FlexBox className="ChatWelcome__greeting" direction="column">
        <Typography className="ChatWelcome__title">{title}</Typography>
        <Typography className="ChatWelcome__subtitle">{subtitle}</Typography>
        <Divider className="ChatWelcome__divider" />
        <Typography className="ChatWelcome__tagline">
          당신을 꽃피우게 해줄 간편하고 영리한 데이터 시스템
        </Typography>
        <Typography className="ChatWelcome__system-name">
          Orchestrated Retriever Knowledge Information System
        </Typography>
      </FlexBox>

      {/* 추천 질문 */}
      <RecommendedQuestions
        items={questions}
        loading={questionsLoading}
        onQuestionClick={onQuestionClick}
      />

      {/* 추천 키워드 */}
      <RecommendedKeywords
        items={keywords}
        loading={keywordsLoading}
        onKeywordClick={onKeywordClick}
      />
    </FlexBox>
  );
}
