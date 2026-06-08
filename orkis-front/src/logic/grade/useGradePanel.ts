/**
 * 등급관리 패널 비즈니스 로직 훅
 * authStore + gradeStore 조합
 */
import { useMemo, useCallback } from "react";
import { useAuthStore } from "@/logic/common/auth/authStore";
import { useGradeStore } from "@/logic/common/grade/gradeStore";
import { isProUserByAuth } from "@/logic/common/grade/gradeUtils";
import type { GradeOption, GradeType } from "@/logic/common/grade/types";

interface UseGradePanelOptions {
  onGradeChange?: (grade: GradeType) => void;
}

interface UseGradePanelReturn {
  gradeOptions: GradeOption[];
  selectedGrade: GradeType;
  isProUser: boolean;
  selectGrade: (gradeId: GradeType) => void;
}

const GRADE_OPTIONS: GradeOption[] = [
  {
    id: "general",
    grade: "G",
    title: "일반모드",
    description: "일반사용자 권한",
    color: "var(--global-orange-normal, #ec6b1a)",
    isAvailable: true
  },
  {
    id: "pro",
    grade: "P",
    title: "프로모드",
    description: "프로사용자 권한",
    color: "var(--global-purple-700, #b93edc)",
    isAvailable: true
  }
];

export function useGradePanel(
  options?: UseGradePanelOptions
): UseGradePanelReturn {
  const user = useAuthStore((s) => s.user);
  const { selectedGrade, setGrade } = useGradeStore();

  const isProUser = useMemo(() => isProUserByAuth(user), [user]);

  const selectGrade = useCallback(
    (gradeId: GradeType) => {
      setGrade(gradeId);
      options?.onGradeChange?.(gradeId);
    },
    [setGrade, options]
  );

  return {
    gradeOptions: GRADE_OPTIONS,
    selectedGrade,
    isProUser,
    selectGrade
  };
}
