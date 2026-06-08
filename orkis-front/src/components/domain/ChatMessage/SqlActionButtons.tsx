// ============================================
// SqlActionButtons — SQL 결과 액션 버튼 그룹
// Design Layer: props 기반 (로직 없음)
//
// orkis-front ActionButtons 기준:
//   - SQL 보기 (sql_icon.svg)
//   - DATA 더보기 (data_icon.svg)
//   - CSV 다운로드 (down_icon.svg)
// ============================================

import clsx from "clsx";
import { Box, FlexBox, Img, Typography } from "@/components";
import { useThemeModeContext } from "@/design-system";
import "./ChatMessage.scss";

// ============================================
// Props
// ============================================

export interface SqlActionButtonsProps {
  /** SQL 보기 버튼 클릭 */
  onSqlView?: () => void;
  /** DATA 더보기 버튼 클릭 */
  onDataMore?: () => void;
  /** CSV 다운로드 버튼 클릭 */
  onCsvDownload?: () => void;
  /** SQL 쿼리가 있는지 (없으면 SQL 보기 버튼 숨김) */
  showSqlButton?: boolean;
}

// ============================================
// 개별 버튼
// ============================================

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Box
      className={clsx(
        "SqlAction__button",
        !onClick && "SqlAction__button-disabled"
      )}
      onClick={onClick}
    >
      <Img
        src={icon}
        alt={label}
        fit="contain"
        className="SqlAction__button-icon"
      />
      <Typography className="SqlAction__label">
        {label}
      </Typography>
    </Box>
  );
}

// ============================================
// SqlActionButtons
// ============================================

export function SqlActionButtons({
  onSqlView,
  onDataMore,
  onCsvDownload,
  showSqlButton = true,
}: SqlActionButtonsProps) {
  const { resolvedMode } = useThemeModeContext();
  
  return (
    <FlexBox className="SqlAction__container">
      {showSqlButton && (
        <ActionButton
          icon={resolvedMode === 'dark' ? '/assets/icons/chat/sql_icon-dark.svg' : '/assets/icons/chat/sql_icon.svg'}  
          // icon="/assets/icons/chat/sql_icon.svg"
          label="SQL 보기"
          onClick={onSqlView}
        />
      )}
      <ActionButton
        icon={resolvedMode === 'dark' ? '/assets/icons/chat/data_icon-dark.svg' : '/assets/icons/chat/data_icon.svg'}  
        // icon="/assets/icons/chat/data_icon.svg"
        label="DATA 더보기"
        onClick={onDataMore}
      />
      <ActionButton
        icon={resolvedMode === 'dark' ? '/assets/icons/chat/down_icon-dark.svg' : '/assets/icons/chat/down_icon.svg'}  
        // icon="/assets/icons/chat/down_icon.svg"
        label="CSV 다운로드"
        onClick={onCsvDownload}
      />
    </FlexBox>
  );
}
