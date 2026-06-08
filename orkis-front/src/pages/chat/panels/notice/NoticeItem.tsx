// ============================================
// NoticeItem — 공지/알림 개별 항목
// Design Layer: props 기반 (로직 없음)
// ============================================

import type { ReactNode } from "react";
import {
  FlexBox,
  Typography,
  Collapse,
  FiberManualRecordIcon,
  Icon,
  ExpandMoreIcon
} from "@/components";

// ============================================
// Types
// ============================================

export interface NoticeData {
  id: string;
  type: "notice" | "alarm";
  title: string;
  /** sanitize된 ReactNode (Connector에서 처리) */
  content: ReactNode;
  authorName: string;
  createdAt: string;
  isRead: boolean;
}

// ============================================
// Props
// ============================================

export interface NoticeItemProps {
  notice: NoticeData;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}

// ============================================
// NoticeItem
// ============================================

export function NoticeItem({ notice, isExpanded, onToggle }: NoticeItemProps) {
  const TypeIcon =
    notice.type === "notice" ? 'warning' : 'error';

  return (
    <FlexBox
      direction="column"
      className={`NoticeItem ${isExpanded ? "NoticeItem--expanded" : ""}`}
    >
      {/* 헤더 (클릭 → 토글) */}
      <FlexBox
        align="flex-start"
        className="NoticeItem__header"
        onClick={() => onToggle(notice.id)}
      >
        {/* 읽지 않음 표시 */}
        {!notice.isRead && (
          <FiberManualRecordIcon className="NoticeItem__unread-dot" />
        )}

        {/* 타입 아이콘 */}
        {/* <TypeIcon className="NoticeItem__type-icon" /> */}
        <Icon size="small" className="NoticeItem__type-icon">{TypeIcon}</Icon>

        {/* 텍스트 영역 */}
        <FlexBox direction="column" className="NoticeItem__text">
          <Typography
            className={`NoticeItem__title ${!notice.isRead ? "NoticeItem__title--unread" : ""} ${!isExpanded ? "NoticeItem__title--ellipsis" : ""}`}
          >
            {notice.title}
          </Typography>
          <FlexBox align="center" className="NoticeItem__meta NoticeItem__subtitle">
            <Typography className="NoticeItem__meta-text">
              {notice.authorName}
            </Typography>
            <Typography className="NoticeItem__meta-divider">|</Typography>
            <Typography className="NoticeItem__meta-text">
              {notice.createdAt}
            </Typography>
          </FlexBox>
        </FlexBox>

        {/* 확장 아이콘 */}
        <ExpandMoreIcon
          className={`NoticeItem__expand-icon ${isExpanded ? "NoticeItem__expand-icon--open" : ""}`}
        />
      </FlexBox>

      {/* 내용 */}
      <Collapse in={isExpanded}>
        <FlexBox className="NoticeItem__content">{notice.content}</FlexBox>
      </Collapse>
    </FlexBox>
  );
}
