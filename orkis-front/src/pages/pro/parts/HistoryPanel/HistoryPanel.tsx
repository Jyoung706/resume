// ============================================
// HistoryPanel — 쿼리 실행 히스토리 목록
// Design 컴포넌트: props-only
// ============================================

import clsx from "clsx";
import {
  Box,
  Button,
  List,
  ListItemButton,
  Typography,
} from "@/components";
import { EmptyState, PanelHeader, FlexBox } from "@/components";
import type { QueryHistory } from "@/logic/common/pro/types/proMode.types";
import "./HistoryPanel.scss";

export interface HistoryPanelProps {
  /** 전체 탭의 히스토리 (최신순) */
  items: QueryHistory[];
  /** 히스토리 항목 클릭 → 에디터에 SQL 로드 */
  onItemClick?: (sqlQuery: string) => void;
  /** 히스토리 전체 삭제 */
  onClearAll?: () => void;
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function truncateSql(sql: string, maxLen = 80): string {
  const oneLine = sql.replace(/\s+/g, " ").trim();
  return oneLine.length > maxLen ? oneLine.slice(0, maxLen) + "..." : oneLine;
}

export function HistoryPanel({
  items,
  onItemClick,
  onClearAll,
}: HistoryPanelProps) {
  if (items.length === 0) {
    return (
      <Box className="HistoryPanel HistoryPanel--empty">
        <EmptyState
          title="실행 히스토리 없음"
          description="쿼리를 실행하면 자동으로 기록됩니다"
        />
      </Box>
    );
  }

  return (
    <FlexBox className="HistoryPanel" direction="column">
      <PanelHeader
        className="HistoryPanel__header"
        title="실행 히스토리"
        actions={
          onClearAll && (
            <Button
              className="HistoryPanel__clear-btn"
              variant="text"
              size="small"
              onClick={onClearAll}
            >
              전체 삭제
            </Button>
          )
        }
      />
      <List className="HistoryPanel__list" disablePadding>
        {items.map((item) => (
          <ListItemButton
            key={item.id}
            className={clsx(
              "HistoryPanel__item",
              !item.success && "HistoryPanel__item--error",
            )}
            onClick={() => onItemClick?.(item.sqlQuery)}
            title={item.sqlQuery}
          >
            <FlexBox className="HistoryPanel__item-content" direction="column">
              <FlexBox
                className="HistoryPanel__item-top"
                align="center"
                gap={0.5}
              >
                <Typography
                  className={clsx(
                    "HistoryPanel__status",
                    item.success
                      ? "HistoryPanel__status--ok"
                      : "HistoryPanel__status--fail",
                  )}
                  variant="caption"
                  component="span"
                >
                  {item.success ? "OK" : "ERR"}
                </Typography>
                <Typography
                  className="HistoryPanel__time"
                  variant="caption"
                  component="span"
                >
                  {formatTime(item.executedAt)}
                </Typography>
                <Typography
                  className="HistoryPanel__duration"
                  variant="caption"
                  component="span"
                >
                  {formatDuration(item.executionTime)}
                </Typography>
                {item.rowCount != null && (
                  <Typography
                    className="HistoryPanel__rows"
                    variant="caption"
                    component="span"
                  >
                    {item.rowCount}rows
                  </Typography>
                )}
              </FlexBox>
              <Typography
                className="HistoryPanel__sql"
                variant="caption"
                component="div"
              >
                {truncateSql(item.sqlQuery)}
              </Typography>
              {item.error && (
                <Typography
                  className="HistoryPanel__error"
                  variant="caption"
                  component="div"
                >
                  {item.error}
                </Typography>
              )}
            </FlexBox>
          </ListItemButton>
        ))}
      </List>
    </FlexBox>
  );
}
