/**
 * FAQ Store -- 자주 묻는 질문 Zustand 스토어
 */
import { create } from "zustand";
import {
  faqService,
  type FaqItem,
  type FaqCategory,
  type GetFaqListRequest,
} from "./faqService";
import { getLogger } from "@/logic/shared/utils/logger";

const logger = getLogger("FaqStore");

// --- 타입 ---

interface FaqState {
  categories: FaqCategory[];
  items: FaqItem[];
  isLoading: boolean;
  error: string | null;

  loadFaqList: (params?: GetFaqListRequest) => Promise<void>;
  incrementViewCount: (itemId: string) => void;
  reset: () => void;
}

// --- 스토어 ---

export const useFaqStore = create<FaqState>((set, get) => ({
  categories: [],
  items: [],
  isLoading: false,
  error: null,

  /** FAQ 목록 로드 */
  loadFaqList: async (params?: GetFaqListRequest) => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });

    try {
      const response = await faqService.getFaqList(params);
      set({
        categories: response.categories || [],
        items: response.items || [],
        isLoading: false,
      });
    } catch (error) {
      logger.error("loadFaqList 오류:", error);
      set({
        error:
          error instanceof Error
            ? error.message
            : "FAQ를 불러오는데 실패했습니다.",
        isLoading: false,
      });
    }
  },

  /** 조회수 증가 (fire-and-forget) */
  incrementViewCount: (itemId: string) => {
    faqService.incrementViewCount(itemId);
  },

  /** 상태 초기화 */
  reset: () => {
    set({
      categories: [],
      items: [],
      isLoading: false,
      error: null,
    });
  },
}));

// --- 셀렉터 ---

export const useFaqItems = () => useFaqStore((s) => s.items);
export const useFaqCategories = () => useFaqStore((s) => s.categories);
export const useFaqLoading = () => useFaqStore((s) => s.isLoading);
