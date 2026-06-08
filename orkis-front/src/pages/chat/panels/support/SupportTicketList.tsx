// ============================================
// SupportTicketList -- 문의 내역 목록
// Design Layer: props 기반 (로직 없음)
// ============================================

import type { ReactNode } from "react";
import {
  FlexBox,
  CircularProgress,
} from "@/components";
import { EmptyState } from "@/components";
import { SupportTicketItem, type TicketItemData } from "./SupportTicketItem";
import "../panels.scss";

// ============================================
// Props
// ============================================

export interface SupportTicketListProps {
  /** 티켓 목록 */
  tickets: TicketItemData[];
  /** 현재 펼쳐진 항목 ID */
  expandedId: string | null;
  /** 로딩 상태 */
  loading?: boolean;
  /** 항목 토글 핸들러 */
  onToggle: (id: string) => void;
  /** 새니타이징된 답변 ReactNode 매핑 */
  answerNodes?: Record<string, ReactNode>;
}

// ============================================
// SupportTicketList
// ============================================

export function SupportTicketList({
  tickets,
  expandedId,
  loading,
  onToggle,
  answerNodes,
}: SupportTicketListProps) {
  if (loading) {
    return (
      <FlexBox className="Panel__loading">
        <CircularProgress size="medium" />
      </FlexBox>
    );
  }

  if (tickets.length === 0) {
    return (
      <EmptyState className="Panel__placeholder" title="문의 내역이 없습니다." />
    );
  }

  return (
    <FlexBox direction="column" className="SupportTicketList">
      {tickets.map((ticket) => (
        <SupportTicketItem
          key={ticket.id}
          ticket={ticket}
          isExpanded={expandedId === ticket.id}
          onToggle={onToggle}
          answerNode={answerNodes?.[ticket.id]}
        />
      ))}
    </FlexBox>
  );
}
