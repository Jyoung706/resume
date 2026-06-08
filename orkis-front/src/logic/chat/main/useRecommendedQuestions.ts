import { useState, useEffect } from "react";
import { recommendedQuestionService } from "@/logic/common/chat/services/recommendedQuestionService";
import { getCategoryIcon } from "@/logic/shared/utils/categoryIcons";
import type { RecommendedQuestionItem } from "@/pages/chat/main/parts";

/**
 * 추천 질문 목록을 로드하는 훅.
 * 마운트 시 활성화된 추천 질문을 최대 3개까지 API에서 조회하고,
 * 카테고리별 아이콘 정보를 매핑하여 UI 표시용 데이터를 제공한다.
 */
export function useRecommendedQuestions() {
  const [questions, setQuestions] = useState<RecommendedQuestionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    recommendedQuestionService
      .getRecommendedQuestions({ isActive: true, limit: 3 })
      .then((data) => {
        if (cancelled) return;
        setQuestions(
          data.map((q, index) => ({
            id: q.id,
            question: q.question,
            category: q.category,
            ...getCategoryIcon(q.category, index)
          }))
        );
      })
      .catch(() => {
        /* 조용히 실패 — 빈 목록 표시 */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { questions, loading };
}
