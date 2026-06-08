/**
 * Support Service -- 고객지원 문의 API 통신 계층
 */
import { apiGet, apiPost, apiDelete } from "@/logic/shared/services/request";
import { getLogger } from "@/logic/shared/utils/logger";
import type {
  SupportTicket,
  SupportCommonCode,
  CreateTicketRequest,
  GetTicketsParams,
  GetTicketsResponse,
} from "./types/support";

const logger = getLogger("SupportService");

// --- 쿼리 빌더 ---

const buildQuery = (params?: GetTicketsParams): string => {
  if (!params) return "";
  const qs = new URLSearchParams();
  if (params.statusCode && params.statusCode !== "all")
    qs.append("statusCode", params.statusCode);
  if (params.categoryCode) qs.append("categoryCode", params.categoryCode);
  if (params.page) qs.append("page", params.page.toString());
  if (params.limit) qs.append("limit", params.limit.toString());
  if (params.sortBy) qs.append("sortBy", params.sortBy);
  if (params.sortOrder) qs.append("sortOrder", params.sortOrder);
  const s = qs.toString();
  return s ? `?${s}` : "";
};

// --- Service ---

export const supportService = {
  /** 문의 목록 조회 */
  getTickets: async (params?: GetTicketsParams): Promise<GetTicketsResponse> => {
    try {
      const response = await apiGet<any>(
        `/support/tickets${buildQuery(params)}`
      );
      // StandardResponse 미언래핑 방어
      if (response?.data?.tickets) return response.data;
      return response;
    } catch (error) {
      logger.error("getTickets 오류", error);
      throw error;
    }
  },

  /** 문의 생성 */
  createTicket: async (data: CreateTicketRequest): Promise<SupportTicket> => {
    try {
      return await apiPost<SupportTicket>("/support/tickets", data);
    } catch (error) {
      logger.error("createTicket 오류", error);
      throw error;
    }
  },

  /** 문의 삭제 */
  deleteTicket: async (id: string): Promise<void> => {
    try {
      await apiDelete(`/support/tickets/${id}`);
    } catch (error) {
      logger.error("deleteTicket 오류", error);
      throw error;
    }
  },

  /** 카테고리 목록 조회 (TICKET_CATEGORY 공통코드) */
  getCategories: async (): Promise<SupportCommonCode[]> => {
    try {
      const response = await apiGet<any>("/support/categories");
      // apiGet이 StandardResponse를 언래핑하지 못한 경우 (timestamp 없는 응답)
      // response = { success, data: { categories: [...] } } 형태일 수 있음
      if (Array.isArray(response)) return response;
      if (response && "categories" in response) return response.categories;
      if (response?.data?.categories) return response.data.categories;
      return [];
    } catch (error) {
      logger.error("getCategories 오류", error);
      throw error;
    }
  },

  /** 상태 목록 조회 (TICKET_STATUS 공통코드) */
  getStatuses: async (): Promise<SupportCommonCode[]> => {
    try {
      const response = await apiGet<any>("/support/statuses");
      if (Array.isArray(response)) return response;
      if (response?.data?.statuses) return response.data.statuses;
      if (response?.data && Array.isArray(response.data)) return response.data;
      return [];
    } catch (error) {
      logger.error("getStatuses 오류", error);
      throw error;
    }
  },
};
