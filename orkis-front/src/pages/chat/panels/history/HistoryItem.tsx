// ============================================
// HistoryItem — 채팅 이력 개별 항목
// Design Layer: props 기반 (로직 없음)
// ============================================

import {
  FlexBox,
  Typography,
  Button,
  Img,
  Accordion,
} from "@/components";
import { useThemeModeContext } from "@/design-system";
import {
  SqlProcessSteps,
  type ProcessStepData,
} from "@/components/domain/ChatMessage/SqlProcessSteps";

// ============================================
// Types
// ============================================

export interface ChatHistoryItem {
  id: string;
  question: string;
  answer?: string;
  author?: string;
  date: string;
  processSteps: ProcessStepData[];
  sql?: string;
  success?: boolean;
}

// ============================================
// Props
// ============================================

export interface HistoryItemProps {
  item: ChatHistoryItem;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onViewSql?: (sql: string) => void;
}

// ============================================
// HistoryItem
// ============================================

export function HistoryItem({
  item,
  isExpanded,
  onToggle,
  onViewSql
}: HistoryItemProps) {

  const { resolvedMode } = useThemeModeContext();

  // 헤더 타이틀 (질문 아이콘 + 텍스트 + 메타)
  const title = (
    <FlexBox align="flex-start" className="HistoryItem__summary">
      <Img
        src={resolvedMode === 'dark' ? '/assets/icons/chat/ico_question-dark.png' : '/assets/icons/chat/ico_question.png'}
        // src="/assets/icons/chat/ico_question.png"
        className="HistoryItem__question-icon"
      />
      <FlexBox direction="column" className="HistoryItem__summary-text">
        <Typography
          className={`HistoryItem__question ${!isExpanded ? "HistoryItem__question--ellipsis" : ""}`}
        >
          {item.question}
        </Typography>
        <FlexBox align="center" className="HistoryItem__meta">
          {item.author && (
            <>
              <Typography className="HistoryItem__meta-text">
                {item.author}
              </Typography>
              <Typography className="HistoryItem__meta-divider">|</Typography>
            </>
          )}
          <Typography className="HistoryItem__meta-text">
            {item.date}
          </Typography>
        </FlexBox>
      </FlexBox>
    </FlexBox>
  );

  return (
    <Accordion
      id={item.id}
      title={title}
      expanded={isExpanded}
      onChange={onToggle}
      className={`HistoryItem ${isExpanded ? "HistoryItem--expanded" : ""}`}
    >
      <FlexBox direction="column" className="HistoryItem__details">
        {/* SQL 단계 시각화 — 채팅답변과 동일 컴포넌트, 헤더/Collapse/진행률/최종배지 제거 */}
        {item.processSteps.length > 0 && (
          <SqlProcessSteps
            steps={item.processSteps}
            headless
            showProgress={false}
            showFinalStatus={false}
          />
        )}

        {/* SQL 보기 버튼 */}
        {item.sql && onViewSql && (
          <FlexBox className="HistoryItem__sql-action">
            <Button
              variant="outlined"
              className="HistoryItem__sql-btn"
              onClick={() => onViewSql(item.sql!)}
            >
              <Img
                src={resolvedMode === 'dark' ? '/assets/icons/chat/sql_icon-dark.svg' : '/assets/icons/chat/sql_icon.svg'}
                // src="/assets/icons/chat/sql_icon.svg"
                alt="SQL"
                fit="contain"
                className="HistoryItem__sql-btn-icon"
              />
              <Typography className="HistoryItem__sql-btn-text">
                SQL 보기
              </Typography>
            </Button>
          </FlexBox>
        )}

        {/* 답변 텍스트 */}
        {item.answer && (
          <FlexBox align="flex-start" className="HistoryItem__answer">
            <Img
              src={resolvedMode === 'dark' ? '/assets/icons/chat/ico_answer-dark.png' : '/assets/icons/chat/ico_answer.png'}
              // src="/assets/icons/chat/ico_answer.png"
              className="HistoryItem__answer-icon"
            />
            <Typography className="HistoryItem__answer-text">
              {item.answer}
            </Typography>
          </FlexBox>
        )}
      </FlexBox>
    </Accordion>
  );
}
