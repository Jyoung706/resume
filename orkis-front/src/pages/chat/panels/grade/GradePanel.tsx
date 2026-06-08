// ============================================
// GradePanel — 사용자 등급 및 권한 관리
// Design Layer: props 기반 (로직 없음)
// ============================================
// 등급 옵션 카드 목록 + 설명 메시지
// ============================================

import { FlexBox, Icon, Typography } from "@/components";
import "../panels.scss";
import { GradeOptionCard, type GradeOption } from "./GradeOptionCard";
import "./GradePanel.scss";

// ============================================
// Props
// ============================================

export interface GradePanelProps {
  /** 등급 옵션 목록 */
  options: GradeOption[];
  /** 선택된 등급 ID */
  selectedGrade: string | null;
  /** 등급 선택 핸들러 */
  onSelectGrade: (id: string) => void;
  /** 하단 설명 메시지 */
  helpMessage?: string;
}

// ============================================
// GradePanel
// ============================================

export function GradePanel({
  options,
  selectedGrade,
  onSelectGrade,
  helpMessage
}: GradePanelProps) {
  // if (options.length === 0) {
  //   return (
  //     <FlexBox className="Panel__placeholder">
  //       <Typography className="Panel__placeholder-title">등급 관리</Typography>
  //       <Typography className="Panel__placeholder-text">준비 중</Typography>
  //     </FlexBox>
  //   );
  // }

  return (
    <FlexBox
      direction="column"
      className="ChatPage__grade-panel Panel__container"
    >
      {/* 헤더 */}
      {/* <FlexBox align="center" className="GradePanel__header">
        <Typography className="Panel__section-header">등급 관리</Typography>
      </FlexBox> */}

      {/* 등급 옵션 목록 */}
      <FlexBox direction="column" className="GradePanel__options">
        {options.map((option) => (
          <GradeOptionCard
            key={option.id}
            option={option}
            isSelected={selectedGrade === option.id}
            onSelect={onSelectGrade}
          />
        ))}
      </FlexBox>

      {/* 설명 메시지 */}
      {helpMessage && (
        <FlexBox align="flex-start" className="GradePanel__help">
          <Icon mui className="GradePanel__help-icon">Help</Icon>
          <Typography className="GradePanel__help-text">
            {helpMessage}
          </Typography>
        </FlexBox>
      )}
    </FlexBox>
  );
}
