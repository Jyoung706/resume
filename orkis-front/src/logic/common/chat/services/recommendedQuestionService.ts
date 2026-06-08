import { apiGet } from "@/logic/shared/services/request";
import type { RecommendedQuestion } from "@/logic/common/chat/types/recommendation";

interface GetRecommendedQuestionsParams {
  category?: string;
  questionType?: string;
  isActive?: boolean;
  limit?: number;
}

interface RawQuestion {
  id: string;
  questionNo: string;
  question: string;
  category: string;
  questionType: string;
  iconPath?: string;
  sortOrder: number;
  isActive: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export const recommendedQuestionService = {
  getRecommendedQuestions: async (
    params?: GetRecommendedQuestionsParams
  ): Promise<RecommendedQuestion[]> => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set("category", params.category);
    if (params?.questionType)
      searchParams.set("questionType", params.questionType);
    if (params?.isActive !== undefined)
      searchParams.set("isActive", String(params.isActive));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    searchParams.set("_t", String(Date.now()));

    const query = searchParams.toString();
    const url = `/recommended-questions${query ? `?${query}` : ""}`;
    const data = await apiGet<{ questions: RawQuestion[]; total: number }>(url);

    return (data.questions || []).map((q) => ({
      ...q,
      icon: q.iconPath,
      createdAt: new Date(q.createdAt),
      updatedAt: new Date(q.updatedAt)
    }));
  }
};
