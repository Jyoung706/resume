// ============================================
// SqlQuerySection — SQL 쿼리 아코디언 + 구문 하이라이팅
// Design Layer: props 기반 (로직 없음)
//
// - SQL 포맷팅: sql-formatter
// - 구문 하이라이팅: react-syntax-highlighter (PrismLight)
// - 복사 버튼
// ============================================

import { useState } from "react";
import clsx from "clsx";
import { format as formatSql } from "sql-formatter";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Box,
  Collapse,
  ContentCopyIcon,
  ExpandLessIcon,
  ExpandMoreIcon,
  FlexBox,
  IconButton,
  Typography
} from "@/components";
import "./ChatMessage.scss";

// SQL 언어 등록 (1회)
SyntaxHighlighter.registerLanguage("sql", sql);

// ============================================
// Props
// ============================================

export interface SqlQuerySectionProps {
  /** SQL 쿼리 문자열 */
  query: string;
  /** 초기 펼침 상태 (기본: false) */
  defaultExpanded?: boolean;
}

// ============================================
// SQL 포맷팅 (orkis-front 동일 옵션)
// ============================================

function formatQuery(raw: string): string {
  if (!raw || raw.trim().length === 0) return raw;
  try {
    return formatSql(raw, {
      language: "sql",
      tabWidth: 2,
      useTabs: false,
      keywordCase: "upper",
      indentStyle: "standard",
      logicalOperatorNewline: "before",
      expressionWidth: 50,
      linesBetweenQueries: 1,
    });
  } catch {
    return raw;
  }
}

// ============================================
// SyntaxHighlighter 스타일 오버라이드
// ============================================

const highlighterCustomStyle: React.CSSProperties = {
  margin: 0,
  padding: 0,
  background: "transparent",
  fontSize: "var(--text-xs)",
  lineHeight: 1.6,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  maxHeight: "20rem",
  overflowY: "auto",
};

const codeTagStyle: React.CSSProperties = {
  fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
};

// ============================================
// SqlQuerySection
// ============================================

export function SqlQuerySection({
  query,
  defaultExpanded = false,
}: SqlQuerySectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  const formattedSql = formatQuery(query);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedSql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 복사 실패 시 무시
    }
  };

  if (!query) return null;

  return (
    <Box className="SqlQuery__section">
      {/* 헤더 */}
      <FlexBox
        className={clsx(
          "SqlQuery__header",
          isExpanded && "SqlQuery__header-expanded"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Typography className="SqlQuery__header-title">
          SQL 쿼리
        </Typography>
        <IconButton size="small" className="SqlQuery__toggle-btn">
          {isExpanded ? (
            <ExpandLessIcon fontSize="small" />
          ) : (
            <ExpandMoreIcon fontSize="small" />
          )}
        </IconButton>
      </FlexBox>

      {/* 내용 — 구문 하이라이팅 + 복사 버튼 */}
      <Collapse in={isExpanded} timeout={300} mountOnEnter unmountOnExit>
        <Box className="SqlQuery__code-container">
          {/* SQL 코드 — PrismLight 하이라이팅 */}
          <SyntaxHighlighter
            language="sql"
            style={oneLight}
            customStyle={highlighterCustomStyle}
            codeTagProps={{ style: codeTagStyle }}
          >
            {formattedSql}
          </SyntaxHighlighter>

          {/* 복사 버튼 */}
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="SqlQuery__copy-button"
            size="small"
          >
            <ContentCopyIcon className="SqlQuery__copy-icon" />
          </IconButton>

          {/* 복사 완료 표시 */}
          {copied && (
            <Typography className="SqlQuery__copied-label">
              복사됨
            </Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
