// ============================================
// ProStatusBar — 하단 상태바
// Design 컴포넌트: props-only
// ============================================

import { Box, Typography, FlexBox } from "@/components";
import type { ProStatusBarInfo } from "@/logic/common/pro/types/proMode.types";
import "./ProStatusBar.scss";

export interface ProStatusBarProps {
  info: ProStatusBarInfo;
}

export function ProStatusBar({ info }: ProStatusBarProps) {
  return (
    <FlexBox className="ProStatusBar" align="center" gap={1}>
      {info.dbName && (
        <Typography
          className="ProStatusBar__item ProStatusBar__db"
          variant="caption"
          component="span"
        >
          ● {info.dbName}
          {info.schemaName && `.${info.schemaName}`}
        </Typography>
      )}
      {info.rowCount != null && (
        <Typography
          className="ProStatusBar__item ProStatusBar__rows"
          variant="caption"
          component="span"
        >
          Rows: {info.rowCount}
        </Typography>
      )}
      {info.executionTime != null && (
        <Typography
          className="ProStatusBar__item ProStatusBar__time"
          variant="caption"
          component="span"
        >
          {(info.executionTime / 1000).toFixed(3)}s
        </Typography>
      )}
      <Box className="ProStatusBar__spacer" />
      <Typography
        className="ProStatusBar__item ProStatusBar__mode"
        variant="caption"
        component="span"
      >
        SQL
      </Typography>
    </FlexBox>
  );
}
