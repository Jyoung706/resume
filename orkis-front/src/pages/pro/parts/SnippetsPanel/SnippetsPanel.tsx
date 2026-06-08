// ============================================
// SnippetsPanel — SQL 스니펫 목록
// Design 컴포넌트: props-only
// ============================================

import {
  Box,
  Button,
  IconButton,
  List,
  ListItemButton,
  Typography,
} from "@/components";
import { EmptyState, Icon, PanelHeader, FlexBox } from "@/components";
import "./SnippetsPanel.scss";

export interface Snippet {
  id: string;
  title: string;
  sqlQuery: string;
  createdAt: string;
}

export interface SnippetsPanelProps {
  /** 저장된 스니펫 목록 */
  items: Snippet[];
  /** 스니펫 클릭 → 에디터에 SQL 로드 */
  onItemClick?: (sqlQuery: string) => void;
  /** 스니펫 삭제 */
  onDelete?: (id: string) => void;
  /** 현재 에디터 SQL을 스니펫으로 저장 */
  onSaveCurrentSql?: () => void;
}

function truncateSql(sql: string, maxLen = 60): string {
  const oneLine = sql.replace(/\s+/g, " ").trim();
  return oneLine.length > maxLen ? oneLine.slice(0, maxLen) + "..." : oneLine;
}

export function SnippetsPanel({
  items,
  onItemClick,
  onDelete,
  onSaveCurrentSql,
}: SnippetsPanelProps) {
  if (items.length === 0) {
    return (
      <Box className="SnippetsPanel SnippetsPanel--empty">
        <EmptyState
          title="저장된 스니펫 없음"
          description="자주 쓰는 쿼리를 저장해 빠르게 재실행할 수 있습니다"
          action={
            onSaveCurrentSql && (
              <Button
                className="SnippetsPanel__save-btn"
                variant="outlined"
                size="small"
                onClick={onSaveCurrentSql}
              >
                현재 SQL 저장
              </Button>
            )
          }
        />
      </Box>
    );
  }

  return (
    <FlexBox className="SnippetsPanel" direction="column">
      <PanelHeader
        className="SnippetsPanel__header"
        title="SQL 스니펫"
        actions={
          onSaveCurrentSql && (
            <Button
              className="SnippetsPanel__save-btn"
              variant="outlined"
              size="small"
              onClick={onSaveCurrentSql}
              startIcon={<Icon size="small">add</Icon>}
            >
              저장
            </Button>
          )
        }
      />
      <List className="SnippetsPanel__list" disablePadding>
        {items.map((item) => (
          <ListItemButton
            key={item.id}
            className="SnippetsPanel__item"
            onClick={() => onItemClick?.(item.sqlQuery)}
            title={item.sqlQuery}
          >
            <FlexBox className="SnippetsPanel__item-content" direction="column">
              <Typography
                className="SnippetsPanel__item-title"
                variant="body2"
                component="span"
              >
                {item.title}
              </Typography>
              <Typography
                className="SnippetsPanel__sql"
                variant="caption"
                component="span"
              >
                {truncateSql(item.sqlQuery)}
              </Typography>
            </FlexBox>
            {onDelete && (
              <IconButton
                className="SnippetsPanel__delete-btn"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
                title="삭제"
                aria-label={`${item.title} 스니펫 삭제`}
              >
                <Icon>close</Icon>
              </IconButton>
            )}
          </ListItemButton>
        ))}
      </List>
    </FlexBox>
  );
}
