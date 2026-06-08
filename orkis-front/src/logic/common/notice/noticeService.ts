/**
 * Notice Service — 공지사항 API 통신 계층
 * orkis-front noticeService 이식
 */
import { apiGet, apiPost } from "@/logic/shared/services/request";
import { getLogger } from "@/logic/shared/utils/logger";

const logger = getLogger("NoticeService");

// --- 타입 ---

export type NoticeType = "notice" | "alarm";

export interface Notice {
  notice_id: string;
  title: string;
  content: string;
  type: NoticeType;
  author_id: string;
  author_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  display_order: number;
  is_read?: boolean;
}

export interface NoticeListParams {
  page?: number;
  limit?: number;
  type?: NoticeType;
  is_active?: boolean;
}

export interface NoticeListResponse {
  notices: Notice[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// --- 쿼리 빌더 ---

const buildQuery = (params?: NoticeListParams): string => {
  if (!params) return "";
  const qs = new URLSearchParams();
  if (params.page) qs.append("page", params.page.toString());
  if (params.limit) qs.append("limit", params.limit.toString());
  if (params.type) qs.append("type", params.type);
  if (params.is_active !== undefined)
    qs.append("is_active", params.is_active.toString());
  const s = qs.toString();
  return s ? `?${s}` : "";
};

// --- Service ---

export const noticeService = {
  /** 공지사항 목록 조회 */
  getNotices: async (params?: NoticeListParams): Promise<NoticeListResponse> => {
    try {
      return await apiGet<NoticeListResponse>(
        `/notices${buildQuery(params)}`
      );
    } catch (error) {
      logger.error("getNotices 오류", error);
      throw error;
    }
  },

  /** 공지사항 읽음 처리 */
  markAsRead: async (noticeId: string): Promise<void> => {
    try {
      await apiPost(`/notices/${noticeId}/read`, {});
    } catch (error) {
      logger.error("markAsRead 오류", error);
      throw error;
    }
  },

  /** 읽지 않은 공지사항 개수 조회 */
  getUnreadCount: async (): Promise<number> => {
    try {
      const response = await apiPost<{ unread_count: number }>(
        "/notices/unread/count",
        {}
      );
      return response.unread_count;
    } catch (error) {
      logger.error("getUnreadCount 오류", error);
      throw error;
    }
  },

  /** 모든 공지사항 읽음 처리 */
  markAllAsRead: async (): Promise<void> => {
    try {
      await apiPost("/notices/read/all", {});
    } catch (error) {
      logger.error("markAllAsRead 오류", error);
      throw error;
    }
  },
};
