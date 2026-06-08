// ============================================
// SupportTicketItem -- 문의 개별 항목 (아코디언)
// Design Layer: props 기반 (로직 없음)
// ============================================

import type { ReactNode } from "react";
import {
  FlexBox,
  Typography,
  Collapse,
  Divider,
  ExpandMoreIcon,
} from "@/components";

// ============================================
// Types
// ============================================

export interface TicketItemData {
  id: string;
  title: string;
  categoryName: string;
  statusName: string;
  statusCode: string;
  createdAt: string;
  hasAnswer: boolean;
  description: string;
  answer?: string;
  answeredAt?: string;
}

// ============================================
// Props
// ============================================

export interface SupportTicketItemProps {
  /** 티켓 데이터 */
  ticket: TicketItemData;
  /** 펼침 상태 */
  isExpanded: boolean;
  /** 토글 핸들러 */
  onToggle: (id: string) => void;
  /** 새니타이징된 답변 ReactNode */
  answerNode?: ReactNode;
}

// ============================================
// 상태 코드 -> CSS modifier 매핑
// ============================================

function getStatusModifier(statusCode: string): string {
  switch (statusCode.toLowerCase()) {
    case "pending":
      return "SupportTicketItem__status--pending";
    case "in_progress":
      return "SupportTicketItem__status--in-progress";
    case "answered":
    case "closed":
      return "SupportTicketItem__status--answered";
    case "cancelled":
      return "SupportTicketItem__status--cancelled";
    default:
      return "";
  }
}

// ============================================
// SupportTicketItem
// ============================================

export function SupportTicketItem({
  ticket,
  isExpanded,
  onToggle,
  answerNode,
}: SupportTicketItemProps) {
  const statusModifier = getStatusModifier(ticket.statusCode);

  return (
    <FlexBox
      direction="column"
      className={`SupportTicketItem ${isExpanded ? "SupportTicketItem--expanded" : ""}`}
    >
      {/* 헤더 */}
      <FlexBox
        align="center"
        className="SupportTicketItem__header"
        onClick={() => onToggle(ticket.id)}
        role="button"
        aria-expanded={isExpanded}
        aria-label={`문의: ${ticket.title}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle(ticket.id);
          }
        }}
      >
        {/* 텍스트 영역 */}
        <FlexBox direction="column" className="SupportTicketItem__text">
          <Typography className="SupportTicketItem__title">
            {ticket.title}
          </Typography>
          <FlexBox align="center" className="SupportTicketItem__meta SupportTicketItem__subtitle">
            <Typography
              className={`SupportTicketItem__status ${statusModifier}`}
            >
              {ticket.statusName}
            </Typography>
            <Typography className="SupportTicketItem__meta-divider">
              |
            </Typography>
            <Typography className="SupportTicketItem__category">
              {ticket.categoryName}
            </Typography>
            <Typography className="SupportTicketItem__meta-divider">
              |
            </Typography>
            <Typography className="SupportTicketItem__date">
              {ticket.createdAt}
            </Typography>
          </FlexBox>
        </FlexBox>

        {/* 확장 아이콘 */}
        <ExpandMoreIcon
          className={`SupportTicketItem__expand-icon ${isExpanded ? "SupportTicketItem__expand-icon--open" : ""}`}
        />
      </FlexBox>

      {/* 상세 영역 */}
      <Collapse in={isExpanded}>
        <FlexBox direction="column" className="SupportTicketItem__body">
          {/* 문의 내용 */}
          <FlexBox direction="column" className="SupportTicketItem__section">
            <Typography className="SupportTicketItem__section-label">
              문의 내용
            </Typography>
            <Typography className="SupportTicketItem__description">
              {ticket.description}
            </Typography>
          </FlexBox>

          <Divider className="SupportTicketItem__divider" />

          {/* 답변 */}
          <FlexBox direction="column" className="SupportTicketItem__section">
            <Typography className="SupportTicketItem__section-label">
              답변
            </Typography>
            {ticket.hasAnswer ? (
              <FlexBox direction="column" className="SupportTicketItem__answer">
                <FlexBox className="SupportTicketItem__answer-content">
                  {answerNode ?? (
                    <Typography>{ticket.answer}</Typography>
                  )}
                </FlexBox>
                {ticket.answeredAt && (
                  <Typography className="SupportTicketItem__answer-date">
                    답변일: {ticket.answeredAt}
                  </Typography>
                )}
              </FlexBox>
            ) : (
              <Typography className="SupportTicketItem__no-answer">
                답변 대기 중...
              </Typography>
            )}
          </FlexBox>
        </FlexBox>
      </Collapse>
    </FlexBox>
  );
}
