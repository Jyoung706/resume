// ============================================
// EmptyState — 빈/안내 상태 표시
// Design 컴포넌트: props-only
// 사용처: 데이터 없음 / 조건 미충족 등 안내 화면 일관화
// ============================================

import clsx from "clsx";
import { FlexBox } from "@/components/layout";
import "./EmptyState.scss";

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** CTA 버튼 등 추가 액션 영역 */
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <FlexBox
      className={clsx("EmptyState", className)}
      direction="column"
      align="center"
      justify="center"
      gap={0.5}
    >
      <span className="EmptyState__title">{title}</span>
      {description && (
        <span className="EmptyState__description">{description}</span>
      )}
      {action && <div className="EmptyState__action">{action}</div>}
    </FlexBox>
  );
}
