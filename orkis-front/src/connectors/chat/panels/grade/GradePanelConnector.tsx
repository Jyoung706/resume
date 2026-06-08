// ============================================
// GradePanelConnector — 등급 관리 커넥터
// useGradePanel 훅의 상태/액션을 GradePanel props로 매핑
// ============================================

import { useNavigate } from "react-router-dom";
import { GradePanel } from "@/pages/chat/panels/grade/GradePanel";
import type { GradeOption } from "@/pages/chat/panels/grade/GradeOptionCard";
import { useGradePanel } from "@/logic/grade/useGradePanel";

export function GradePanelConnector() {
  const navigate = useNavigate();

  const { gradeOptions, selectedGrade, isProUser, selectGrade } =
    useGradePanel({
      onGradeChange: (grade) => {
        navigate(grade === "pro" ? "/pro" : "/chat");
      }
    });

  // logic/common/grade/types GradeOption -> pages/chat/panels GradeOption 변환
  const panelOptions: GradeOption[] = gradeOptions
    .filter((o) => (isProUser ? true : o.id !== "pro"))
    .map((o) => ({
      id: o.id,
      grade: o.id,
      title: o.id === "general" ? "General" : "Pro",
      description:
        o.id === "general"
          ? "기본 사용자 등급입니다. 일반적인 질의 및 SQL 생성이 가능합니다."
          : "고급 사용자 등급입니다. 복잡한 분석 쿼리 및 최적화 기능을 사용할 수 있습니다.",
      color: o.color
    }));

  return (
    <GradePanel
      options={panelOptions}
      selectedGrade={selectedGrade}
      onSelectGrade={(id) => selectGrade(id as "general" | "pro")}
      helpMessage={
        isProUser
          ? "프로모드에서는 SQL 분석 패널과 확장된 기능을 사용할 수 있습니다."
          : undefined
      }
    />
  );
}
