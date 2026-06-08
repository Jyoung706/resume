// ============================================
// GradeSelector - 등급 옵션 카드 + 선택 UI
// Design Layer: props 기반 (로직 없음)
// 원본 참조: orkis-front/src/components/grade/GradeOption.tsx
// ============================================

import { FlexBox, Typography } from "@/components";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import type { GradeOption } from "@/logic/common/grade/types";
import "./GradeSelector.scss";

// ============================================
// Props
// ============================================

export interface GradeSelectorProps {
  options: GradeOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}

// ============================================
// Component
// ============================================

export function GradeSelector({
  options,
  selectedId,
  onSelect
}: GradeSelectorProps) {
  return (
    <FlexBox
      className="GradeSelector__root ok-grade-selector"
      direction="column"
      gap={1.75}
    >
      {options.map((option) => (
        <GradeSelectorItem
          key={option.id}
          option={option}
          isSelected={selectedId === option.id}
          onSelect={() => onSelect(option.id)}
        />
      ))}
    </FlexBox>
  );
}

// ============================================
// Item (internal)
// ============================================

interface GradeSelectorItemProps {
  option: GradeOption;
  isSelected: boolean;
  onSelect: () => void;
}

function GradeSelectorItem({
  option,
  isSelected,
  onSelect
}: GradeSelectorItemProps) {
  const isDisabled = !option.isAvailable;

  return (
    <FlexBox
      className={[
        "GradeSelector__item",
        isSelected && "GradeSelector__item--selected",
        isDisabled && "GradeSelector__item--disabled"
      ]
        .filter(Boolean)
        .join(" ")}
      align="center"
      gap={1.75}
      onClick={isDisabled ? undefined : onSelect}
    >
      {/* Badge */}
      <FlexBox
        className="GradeSelector__badge"
        align="center"
        justify="center"
        sx={{ background: option.color }}
      >
        <Typography className="GradeSelector__badge-text">
          {option.grade}
        </Typography>
      </FlexBox>

      {/* Text */}
      <FlexBox
        className="GradeSelector__text"
        direction="column"
        gap={0.25}
      >
        <Typography className="GradeSelector__title">
          {option.title}
        </Typography>
        <Typography className="GradeSelector__desc">
          {option.description}
        </Typography>
      </FlexBox>

      {/* Check icon */}
      {isSelected && (
        <CheckCircleIcon className="GradeSelector__check" />
      )}
    </FlexBox>
  );
}
