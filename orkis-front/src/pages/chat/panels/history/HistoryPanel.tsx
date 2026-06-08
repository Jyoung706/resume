// ============================================
// HistoryPanel — 이전 채팅 기록 조회
// Design Layer: props 기반 (로직 없음)
// ============================================
// 아코디언 카드 목록 + SQL 단계 시각화
// ============================================

import {
  FlexBox,
  Typography,
  Button,
  CircularProgress
} from "@/components";
import { EmptyState } from "@/components";
import { HistoryItem, type ChatHistoryItem } from "./HistoryItem";
import "./HistoryPanel.scss";
import "../panels.scss";

// ============================================
// Props
// ============================================

export interface HistoryPanelProps {
  /** 채팅 이력 목록 */
  items: ChatHistoryItem[];
  /** 현재 펼쳐진 항목 ID */
  expandedId: string | null;
  /** 로딩 상태 */
  loading?: boolean;
  /** 항목 펼치기/접기 핸들러 */
  onToggleExpand: (id: string) => void;
  /** SQL 보기 핸들러 */
  onViewSql?: (sql: string) => void;
  /** 추가 로딩 중 상태 */
  loadingMore?: boolean;
  /** "더 보기" 버튼 표시 여부 */
  hasMore?: boolean;
  /** 전체 건수 */
  totalCount?: number;
  /** "더 보기" 클릭 핸들러 */
  onLoadMore?: () => void;
}

// ============================================
// HistoryPanel
// ============================================

export function HistoryPanel({
  items,
  expandedId,
  loading,
  onToggleExpand,
  onViewSql,
  loadingMore,
  hasMore,
  totalCount,
  onLoadMore
}: HistoryPanelProps) {
  if (items.length === 0 && !loading) {
    return (
      <EmptyState className="Panel__placeholder" title="채팅 이력이 없습니다." />
    );
  }

  return (
    <FlexBox
      direction="column"
      className="ChatPage__history-panel Panel__container"
    >
      {loading && (
        <FlexBox className="Panel__loading">
          <CircularProgress size="medium" />
        </FlexBox>
      )}

      {!loading && (
        <FlexBox direction="column" className="HistoryPanel__list">
          {/* 전체 건수 */}
          {totalCount !== undefined && totalCount > 0 && (
            <Typography className="HistoryPanel__count">
              총 {totalCount}건
            </Typography>
          )}

          {items.map((item) => (
            <HistoryItem
              key={item.id}
              item={item}
              isExpanded={expandedId === item.id}
              onToggle={onToggleExpand}
              onViewSql={onViewSql}
            />
          ))}

          {/* 더 보기 */}
          {hasMore && onLoadMore && (
            <FlexBox justify="center" className="HistoryPanel__load-more">
              <Button
                onClick={onLoadMore}
                disabled={loadingMore}
                className="HistoryPanel__load-more-btn"
              >
                {loadingMore ? (
                  <CircularProgress size="xsmall" />
                ) : (
                  "더 보기"
                )}
              </Button>
            </FlexBox>
          )}
        </FlexBox>
      )}
    </FlexBox>
  );
}
