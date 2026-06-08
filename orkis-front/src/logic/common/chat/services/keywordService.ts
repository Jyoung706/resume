import { apiPost } from "@/logic/shared/services/request";
import type {
  Keyword,
  CreateKeywordRequest
} from "@/logic/common/chat/types/recommendation";

interface GetKeywordsRequest {
  limit?: number;
  offset?: number;
}

interface GetKeywordsResponse {
  keywords: Keyword[];
  total: number;
  limit: number;
  offset: number;
}

export const keywordService = {
  getKeywords: (request: GetKeywordsRequest) =>
    apiPost<GetKeywordsResponse>("/keywords/list", request),

  useKeyword: async (id: string) => {
    try {
      await apiPost(`/keywords/${id}/use`);
    } catch {
      /* silent */
    }
  },

  toggleFavorite: (keywordId: string) =>
    apiPost<{ success: boolean; isFavorite: boolean }>(
      `/keywords/${keywordId}/favorite/toggle`
    ),

  createKeyword: (request: CreateKeywordRequest) =>
    apiPost<Keyword>("/keywords", request)
};
