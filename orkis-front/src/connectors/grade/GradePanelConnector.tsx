/**
 * GradePanelConnector - Logic <-> GradePanel 접착 계층
 * useGradePanel 훅의 상태/액션을 GradePanel props로 매핑
 */
import { useNavigate } from "react-router-dom";
import { useGradePanel } from "@/logic/grade/useGradePanel";
import { GradePanel } from "@/components/domain/GradePanel";
import type { GradeType } from "@/logic/common/grade/types";

export function GradePanelConnector() {
  const navigate = useNavigate();
  const { gradeOptions, selectedGrade, isProUser, selectGrade } =
    useGradePanel({
      onGradeChange: (grade) => {
        navigate(grade === "pro" ? "/pro" : "/chat");
      }
    });

  return (
    <GradePanel
      options={gradeOptions}
      selectedGrade={selectedGrade}
      isProUser={isProUser}
      onGradeSelect={(id) => selectGrade(id as GradeType)}
      helperText="프로모드에서는 SQL 분석 패널과 확장된 기능을 사용할 수 있습니다."
    />
  );
}
