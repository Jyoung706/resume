/**
 * Help Service — 도움말(FAQ) API 통신 계층
 * orkis-front HelpService 이식
 */
import { apiGet, apiPost } from "@/logic/shared/services/request";
import type {
  GetHelpListRequest,
  GetHelpListResponse,
} from "@/logic/common/chat/types/help";

/** 쿼리 스트링 빌더 */
const buildQuery = (params?: GetHelpListRequest): string => {
  if (!params) return "";
  const qs = new URLSearchParams();
  if (params.categoryId) qs.append("categoryId", params.categoryId);
  if (params.search) qs.append("search", params.search);
  if (params.isActive !== undefined)
    qs.append("isActive", String(params.isActive));
  const s = qs.toString();
  return s ? `?${s}` : "";
};

export const helpService = {
  /** 도움말 목록(카테고리 + 항목) 조회 */
  getHelpList: (params?: GetHelpListRequest) =>
    apiGet<GetHelpListResponse>(`/help/list${buildQuery(params)}`),

  /** 도움말 항목 조회수 증가 (silent) */
  incrementViewCount: async (itemId: string) => {
    try {
      await apiPost(`/help/view/${itemId}`, {}, { silent: true });
    } catch {
      /* silent */
    }
  },
};
