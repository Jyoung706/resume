// ============================================
// SupportFAQ -- FAQ 아코디언 목록
// Design Layer: props 기반 (로직 없음)
// ============================================

import {
  FlexBox,
  Typography,
  Collapse,
  ExpandMoreIcon,
} from "@/components";
import { EmptyState } from "@/components";
import type { ReactNode } from "react";
import "../panels.scss";

// ============================================
// Types
// ============================================

export interface FaqItemData {
  id: string;
  categoryName?: string;
  question: string;
  answer: string;
  isPinned: boolean;
  viewCount: number;
}

// ============================================
// Props
// ============================================

export interface SupportFAQProps {
  /** FAQ 항목 목록 */
  faqs: FaqItemData[];
  /** 현재 펼쳐진 항목 ID */
  expandedId: string | null;
  /** 빈 상태 메시지 */
  emptyMessage?: string;
  /** 항목 토글 핸들러 */
  onToggle: (id: string) => void;
  /** 답변 HTML 새니타이징된 ReactNode 매핑 */
  answerNodes?: Record<string, ReactNode>;
}

// ============================================
// SupportFAQ
// ============================================

export function SupportFAQ({
  faqs,
  expandedId,
  emptyMessage = "등록된 FAQ가 없습니다.",
  onToggle,
  answerNodes,
}: SupportFAQProps) {
  if (faqs.length === 0) {
    return (
      <EmptyState className="Panel__placeholder" title={emptyMessage} />
    );
  }

  return (
    <FlexBox direction="column" className="SupportFAQ">
      {faqs.map((faq) => {
        const isExpanded = expandedId === faq.id;

        return (
          <FlexBox
            key={faq.id}
            direction="column"
            className={`SupportFAQ__item ${isExpanded ? "SupportFAQ__item--expanded" : ""}`}
          >
            {/* 헤더 */}
            <FlexBox
              align="center"
              className="SupportFAQ__header"
              onClick={() => onToggle(faq.id)}
              role="button"
              aria-expanded={isExpanded}
              aria-label={`FAQ: ${faq.question}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggle(faq.id);
                }
              }}
            >
              {/* 질문 */}
              <FlexBox direction="column" className="SupportFAQ__question-wrap SupportFAQ__text">
                <Typography className="SupportFAQ__question SupportFAQ__title">
                  {faq.question}
                </Typography>
                {faq.categoryName && (
                  <Typography className="SupportFAQ__category SupportFAQ__subtitle">
                    {faq.categoryName}
                  </Typography>
                )}
              </FlexBox>

              {/* 확장 아이콘 */}
              <ExpandMoreIcon
                className={`SupportFAQ__expand-icon ${isExpanded ? "SupportFAQ__expand-icon--open" : ""}`}
              />
            </FlexBox>

            {/* 답변 */}
            <Collapse in={isExpanded}>
              <FlexBox className="SupportFAQ__answer SupportFAQ__content">
                {answerNodes?.[faq.id] ?? (
                  <Typography className="SupportFAQ__answer-text">
                    {faq.answer}
                  </Typography>
                )}
              </FlexBox>
            </Collapse>
          </FlexBox>
        );
      })}
    </FlexBox>
  );
}
