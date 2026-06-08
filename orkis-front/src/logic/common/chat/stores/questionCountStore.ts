/**
 * 질문 횟수 스토어 (Zustand)
 * SSE question_count 이벤트로 업데이트, ChatConnector에서 credit prop으로 매핑
 */
import { create } from "zustand";
import { getLogger } from "@/logic/shared/utils/logger";
import { apiPost } from "@/logic/shared/services/request";

const logger = getLogger("questionCountStore");

interface QuestionCountState {
  /** 사용한 횟수 */
  used: number;
  /** 전체 횟수 */
  total: number;
  /** 로딩 상태 */
  isLoading: boolean;

  /** API에서 질문 횟수 조회 */
  fetchQuestionCount: () => Promise<void>;
  /** SSE 이벤트로 횟수 업데이트 */
  updateCount: (used: number, total?: number) => void;
  /** 질문 전송 시 로컬 차감 */
  decrementRemaining: () => void;
  /** 초기화 (로그아웃 시) */
  reset: () => void;
}

const INITIAL_STATE = {
  used: 0,
  total: 50,
  isLoading: false,
};

export const useQuestionCountStore = create<QuestionCountState>((set, get) => ({
  ...INITIAL_STATE,

  fetchQuestionCount: async () => {
    set({ isLoading: true });
    try {
      const response = await apiPost<{ questionCount: number }>(
        "/auth/question-count",
        {},
      );
      const count = response?.questionCount ?? 0;
      set({ used: get().total - count, isLoading: false });
    } catch (error) {
      logger.error("질문 횟수 조회 실패:", error);
      set({ isLoading: false });
    }
  },

  updateCount: (used, total) => {
    set({
      used,
      ...(total !== undefined ? { total } : {}),
    });
  },

  decrementRemaining: () => {
    const state = get();
    if (state.used < state.total) {
      set({ used: state.used + 1 });
    }
  },

  reset: () => {
    set(INITIAL_STATE);
  },
}));
