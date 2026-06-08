// ============================================
// NoticePanel — 공지사항 및 알림
// Design Layer: props 기반 (로직 없음)
// ============================================
// 카드 형태의 공지/알림 목록 (아코디언 펼침)
// ============================================

import {
  FlexBox,
  Typography,
  CircularProgress
} from "@/components";
import { NoticeItem, type NoticeData } from "./NoticeItem";
import "./NoticePanel.scss";
import "../panels.scss";

// ============================================
// Props
// ============================================

export interface NoticePanelProps {
  /** 공지/알림 목록 */
  notices: NoticeData[];
  /** 현재 펼쳐진 항목 ID */
  expandedId: string | null;
  /** 로딩 상태 */
  loading?: boolean;
  /** 항목 펼치기/접기 핸들러 */
  onToggleExpand: (id: string) => void;
}

// ============================================
// NoticePanel
// ============================================

export function NoticePanel({
  notices,
  expandedId,
  loading,
  onToggleExpand
}: NoticePanelProps) {
  if (notices.length === 0 && !loading) {
    return (
      <FlexBox className="Panel__placeholder">
        <Typography className="Panel__placeholder-title">공지사항</Typography>
        <Typography className="Panel__placeholder-text">준비 중</Typography>
      </FlexBox>
    );
  }

  return (
    <FlexBox
      direction="column"
      className="ChatPage__notice-panel Panel__container"
    >
      {/* 로딩 */}
      {loading && (
        <FlexBox className="Panel__loading">
          <CircularProgress size="medium" />
        </FlexBox>
      )}

      {/* 공지 목록 */}
      {!loading && (
        <FlexBox direction="column" className="NoticePanel__list">
          {notices.map((notice) => (
            <NoticeItem
              key={notice.id}
              notice={notice}
              isExpanded={expandedId === notice.id}
              onToggle={onToggleExpand}
            />
          ))}
        </FlexBox>
      )}
    </FlexBox>
  );
}
