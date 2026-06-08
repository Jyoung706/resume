// ============================================
// GradePanel - 등급관리 패널 (사이드바 탭용)
// Design Layer: props 기반 (로직 없음)
// 원본 참조: orkis-front/src/pages/sidebar-page/GradePanel.tsx
// ============================================

import { useMemo } from "react";
import { FlexBox, Typography } from "@/components";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { GradeSelector } from "@/components/domain/GradeSelector";
import type { GradeOption } from "@/logic/common/grade/types";
import "./GradePanel.scss";

// ============================================
// Props
// ============================================

export interface GradePanelProps {
  /** 전체 등급 옵션 목록 */
  options: GradeOption[];
  /** 현재 선택된 등급 */
  selectedGrade: string;
  /** 프로 사용자 여부 (false이면 프로모드 옵션 숨김) */
  isProUser: boolean;
  /** 등급 선택 콜백 */
  onGradeSelect: (gradeId: string) => void;
  /** 프로모드 안내 문구 */
  helperText?: string;
}

// ============================================
// Component
// ============================================

export function GradePanel({
  options,
  selectedGrade,
  isProUser,
  onGradeSelect,
  helperText
}: GradePanelProps) {
  // 일반 사용자에게는 프로모드 옵션 숨김
  const visibleOptions = useMemo(
    () => (isProUser ? options : options.filter((o) => o.id !== "pro")),
    [options, isProUser]
  );

  return (
    <FlexBox
      className="GradePanel__root ok-grade-panel"
      direction="column"
      gap={1.75}
    >
      <GradeSelector
        options={visibleOptions}
        selectedId={selectedGrade}
        onSelect={onGradeSelect}
      />

      {/* 프로 사용자 안내 메시지 */}
      {isProUser && helperText && (
        <FlexBox className="GradePanel__helper" align="flex-start" gap={0.5}>
          <HelpOutlineIcon className="GradePanel__helper-icon" />
          <Typography className="GradePanel__helper-text">
            {helperText}
          </Typography>
        </FlexBox>
      )}
    </FlexBox>
  );
}
