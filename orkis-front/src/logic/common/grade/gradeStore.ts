/**
 * 등급 상태 스토어 (Zustand)
 * 선택된 등급 모드를 persist하여 새로고침 후에도 유지
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GradeType } from "./types";

interface GradeStoreState {
  selectedGrade: GradeType;
  setGrade: (grade: GradeType) => void;
  resetGrade: () => void;
}

const initialState = {
  selectedGrade: "general" as GradeType
};

export const useGradeStore = create<GradeStoreState>()(
  persist(
    (set) => ({
      ...initialState,
      setGrade: (grade) => set({ selectedGrade: grade }),
      resetGrade: () => set(initialState)
    }),
    {
      name: "orkis-grade",
      partialize: (state) => ({
        selectedGrade: state.selectedGrade
      })
    }
  )
);
