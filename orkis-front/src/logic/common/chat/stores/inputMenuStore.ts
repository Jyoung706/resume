/**
 * Add 메뉴 선택 상태 Store (Zustand + persist)
 * 키워드/스키마/히스토리 옵션 토글 상태를 localStorage에 영속화
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface InputMenuState {
  /** 각 옵션의 활성화 여부 { keywords: true, schema: false, history: false } */
  selectedOptions: Record<string, boolean>;
  /** 옵션 토글 */
  toggleOption: (id: string) => void;
}

export const useInputMenuStore = create<InputMenuState>()(
  persist(
    (set) => ({
      selectedOptions: {},

      toggleOption: (id) =>
        set((state) => ({
          selectedOptions: {
            ...state.selectedOptions,
            [id]: !state.selectedOptions[id],
          },
        })),
    }),
    {
      name: "orkis-input-menu-selections",
    }
  )
);
