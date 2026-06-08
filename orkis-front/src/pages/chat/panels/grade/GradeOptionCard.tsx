// ============================================
// GradeOptionCard — 등급 옵션 카드
// Design Layer: props 기반 (로직 없음)
// ============================================

import {
  FlexBox,
  Typography,
  Paper,
  Icon,
  RadioButtonCheckedIcon,
  RadioButtonUncheckedIcon,
  CheckCircleOutlinedIcon
} from "@/components";

// ============================================
// Props
// ============================================

export interface GradeOption {
  id: string;
  grade: "general" | "pro";
  title: string;
  description: string;
  color: string;
}

export interface GradeOptionCardProps {
  option: GradeOption;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

// ============================================
// GradeOptionCard
// ============================================

export function GradeOptionCard({
  option,
  isSelected,
  onSelect
}: GradeOptionCardProps) {
  const gradeLetter = option.grade === "general" ? "G" : "P";

  return (
    <Paper
      variant="outlined"
      className={`GradeOptionCard ${isSelected ? "GradeOptionCard--selected" : ""}`}
      onClick={() => onSelect(option.id)}
    >
      <FlexBox align="center" className="GradeOptionCard__content">
        {/* 등급 문자 */}
        <FlexBox
          align="center"
          justify="center"
          className="GradeOptionCard__letter"
        >
          <Typography className="GradeOptionCard__letter-text">
            {gradeLetter}
          </Typography>
        </FlexBox>

        {/* 제목 + 설명 */}
        <FlexBox direction="column" className="GradeOptionCard__info">
          <Typography className="GradeOptionCard__title">
            {option.title}
          </Typography>
          <Typography className="GradeOptionCard__description">
            {option.description}
          </Typography>
        </FlexBox>

        {/* 라디오 표시 */}
        <FlexBox className="GradeOptionCard__radio">
          {isSelected ? (
            <CheckCircleOutlinedIcon className="GradeOptionCard__radio-icon GradeOptionCard__radio-icon--active" />
            // <Icon className="GradeOptionCard__radio-icon GradeOptionCard__radio-icon--active">task_alt</Icon>
          ) : (
            <CheckCircleOutlinedIcon className="GradeOptionCard__radio-icon" />
            // <Icon className="GradeOptionCard__radio-icon">task_alt</Icon>
          )}
        </FlexBox>
      </FlexBox>
    </Paper>
  );
}
