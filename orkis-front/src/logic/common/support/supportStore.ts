/**
 * Support Store -- 고객지원 문의 Zustand 스토어
 */
import { create } from "zustand";
import { supportService } from "./supportService";
import { getLogger } from "@/logic/shared/utils/logger";
import type {
  SupportTicket,
  SupportCommonCode,
  CreateTicketRequest,
  GetTicketsParams,
  SupportPagination,
} from "./types/support";

const logger = getLogger("SupportStore");

// --- 타입 ---

interface SupportState {
  tickets: SupportTicket[];
  categories: SupportCommonCode[];
  statuses: SupportCommonCode[];
  isLoading: boolean;
  error: string | null;
  pagination: SupportPagination;

  loadTickets: (params?: GetTicketsParams) => Promise<void>;
  createTicket: (data: CreateTicketRequest) => Promise<void>;
  deleteTicket: (id: string) => Promise<void>;
  loadCategories: () => Promise<void>;
  loadStatuses: () => Promise<void>;
  reset: () => void;
}

// --- 초기값 ---

const initialPagination: SupportPagination = {
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  itemsPerPage: 10,
  hasMore: false,
};

// --- 스토어 ---

export const useSupportStore = create<SupportState>((set, get) => ({
  tickets: [],
  categories: [],
  statuses: [],
  isLoading: false,
  error: null,
  pagination: initialPagination,

  /** 문의 목록 로드 */
  loadTickets: async (params?: GetTicketsParams) => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });

    try {
      const response = await supportService.getTickets(params);
      set({
        tickets: response.tickets || [],
        pagination: response.pagination || initialPagination,
        isLoading: false,
      });
    } catch (error) {
      logger.error("loadTickets 오류:", error);
      set({
        error:
          error instanceof Error
            ? error.message
            : "문의 목록을 불러오는데 실패했습니다.",
        isLoading: false,
      });
    }
  },

  /** 문의 생성 (성공 시 목록 자동 새로고침) */
  createTicket: async (data: CreateTicketRequest) => {
    set({ isLoading: true, error: null });

    try {
      await supportService.createTicket(data);
      set({ isLoading: false });

      // 목록 갱신
      await get().loadTickets();
    } catch (error) {
      logger.error("createTicket 오류:", error);
      set({
        error:
          error instanceof Error
            ? error.message
            : "문의 등록에 실패했습니다.",
        isLoading: false,
      });
      throw error;
    }
  },

  /** 문의 삭제 (성공 시 목록 자동 새로고침) */
  deleteTicket: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      await supportService.deleteTicket(id);
      set({ isLoading: false });

      // 목록 갱신
      await get().loadTickets();
    } catch (error) {
      logger.error("deleteTicket 오류:", error);
      set({
        error:
          error instanceof Error
            ? error.message
            : "문의 삭제에 실패했습니다.",
        isLoading: false,
      });
      throw error;
    }
  },

  /** 카테고리 목록 로드 */
  loadCategories: async () => {
    try {
      const categories = await supportService.getCategories();
      set({ categories });
    } catch (error) {
      logger.error("loadCategories 오류:", error);
    }
  },

  /** 상태 목록 로드 */
  loadStatuses: async () => {
    try {
      const statuses = await supportService.getStatuses();
      set({ statuses });
    } catch (error) {
      logger.error("loadStatuses 오류:", error);
    }
  },

  /** 상태 초기화 */
  reset: () => {
    set({
      tickets: [],
      categories: [],
      statuses: [],
      isLoading: false,
      error: null,
      pagination: initialPagination,
    });
  },
}));

// --- 셀렉터 ---

export const useSupportTickets = () => useSupportStore((s) => s.tickets);
export const useSupportCategories = () => useSupportStore((s) => s.categories);
export const useSupportLoading = () => useSupportStore((s) => s.isLoading);
