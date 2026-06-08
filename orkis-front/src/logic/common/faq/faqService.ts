/**
 * FAQ Service -- 자주 묻는 질문 API 통신 계층
 */
import { apiGet, apiPost } from "@/logic/shared/services/request";

// --- 타입 ---

export interface FaqItem {
  id: string;
  categoryCode: string;
  categoryName?: string;
  question: string;
  answer: string;
  isPinned: boolean;
  sortOrder: number;
  isActive: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FaqCategory {
  code: string;
  name: string;
  sortOrder: number;
}

export interface GetFaqListRequest {
  categoryCode?: string;
  search?: string;
}

export interface GetFaqListResponse {
  categories: FaqCategory[];
  items: FaqItem[];
}

// --- 쿼리 빌더 ---

const buildQuery = (params?: GetFaqListRequest): string => {
  if (!params) return "";
  const qs = new URLSearchParams();
  if (params.categoryCode) qs.append("categoryCode", params.categoryCode);
  if (params.search) qs.append("search", params.search);
  const s = qs.toString();
  return s ? `?${s}` : "";
};

// --- Service ---

export const faqService = {
  /** FAQ 목록(카테고리 + 항목) 조회 */
  getFaqList: (params?: GetFaqListRequest) =>
    apiGet<GetFaqListResponse>(`/faq/list${buildQuery(params)}`),

  /** FAQ 항목 조회수 증가 (silent) */
  incrementViewCount: async (itemId: string) => {
    try {
      await apiPost(`/faq/view/${itemId}`, {}, { silent: true });
    } catch {
      /* silent */
    }
  },
};
