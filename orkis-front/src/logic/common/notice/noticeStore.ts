/**
 * Notice Store — 공지사항 Zustand 스토어
 * orkis-front noticeStore 이식
 */
import { create } from "zustand";
import {
  noticeService,
  type Notice,
  type NoticeListParams,
} from "./noticeService";
import { getLogger } from "@/logic/shared/utils/logger";

const logger = getLogger("NoticeStore");

// --- 타입 ---

interface NoticePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface NoticeState {
  notices: Notice[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  pagination: NoticePagination;

  loadNotices: (params?: NoticeListParams) => Promise<void>;
  loadUnreadCount: () => Promise<void>;
  markAsRead: (noticeId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotices: () => Promise<void>;
  reset: () => void;
}

// --- 초기값 ---

const initialPagination: NoticePagination = {
  page: 1,
  limit: 50,
  total: 0,
  totalPages: 0,
};

// --- 스토어 ---

export const useNoticeStore = create<NoticeState>((set, get) => ({
  notices: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  pagination: initialPagination,

  /** 공지사항 목록 로드 */
  loadNotices: async (params: NoticeListParams = {}) => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });

    try {
      const response = await noticeService.getNotices(params);
      set({
        notices: response.notices || [],
        pagination: response.pagination,
        isLoading: false,
      });
    } catch (error) {
      logger.error("loadNotices 오류:", error);
      set({
        error:
          error instanceof Error
            ? error.message
            : "공지사항을 불러오는데 실패했습니다.",
        isLoading: false,
      });
    }
  },

  /** 읽지 않은 공지사항 개수 로드 */
  loadUnreadCount: async () => {
    try {
      const count = await noticeService.getUnreadCount();
      set({ unreadCount: count });
    } catch (error) {
      logger.error("loadUnreadCount 오류:", error);
    }
  },

  /** 공지사항 읽음 처리 (낙관적 UI) */
  markAsRead: async (noticeId: string) => {
    try {
      await noticeService.markAsRead(noticeId);

      const { notices, unreadCount } = get();
      const wasUnread = notices.find(
        (n) => n.notice_id === noticeId && !n.is_read
      );
      const updatedNotices = notices.map((notice) =>
        notice.notice_id === noticeId
          ? { ...notice, is_read: true }
          : notice
      );

      set({
        notices: updatedNotices,
        unreadCount: wasUnread ? Math.max(0, unreadCount - 1) : unreadCount,
      });
    } catch (error) {
      logger.error("markAsRead 오류:", error);
      throw error;
    }
  },

  /** 모든 공지사항 읽음 처리 */
  markAllAsRead: async () => {
    try {
      await noticeService.markAllAsRead();

      const { notices } = get();
      set({
        notices: notices.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
      });
    } catch (error) {
      logger.error("markAllAsRead 오류:", error);
      throw error;
    }
  },

  /** 공지사항 새로고침 */
  refreshNotices: async () => {
    const { pagination } = get();
    await get().loadNotices({
      page: pagination.page,
      limit: pagination.limit,
    });
    await get().loadUnreadCount();
  },

  /** 상태 초기화 */
  reset: () => {
    set({
      notices: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
      pagination: initialPagination,
    });
  },
}));

// --- 셀렉터 ---

export const useNotices = () => useNoticeStore((s) => s.notices);
export const useUnreadCount = () => useNoticeStore((s) => s.unreadCount);
export const useNoticeLoading = () => useNoticeStore((s) => s.isLoading);
