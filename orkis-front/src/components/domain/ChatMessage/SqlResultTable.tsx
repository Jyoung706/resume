// ============================================
// SqlResultTable — SQL 실행 결과 아코디언 + 테이블
// Design Layer: props 기반 (로직 없음)
//
// 3-섹션 아코디언 구조의 3번째 섹션:
//   헤더: "SQL 쿼리 실행 결과 (N건 조회됨)"
//   내용: 테이블(기본 5건) + 메타
// ============================================

import { useState } from "react";
import clsx from "clsx";
import {
  Box,
  Collapse,
  ExpandLessIcon,
  ExpandMoreIcon,
  FlexBox,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Typography,
} from "@/components";
import "./ChatMessage.scss";

// ============================================
// 타입
// ============================================

export interface SqlResultTableProps {
  columns: string[];
  data: Array<Record<string, unknown>>;
  query?: string;
  executionTime?: number;
  /** 전체 행 건수 (백엔드 totalCount, 없으면 data.length) */
  totalRowCount?: number;
  /** 기본 표시 건수 (기본 5) */
  defaultRowLimit?: number;
  /** 초기 펼침 상태 (기본: true) */
  defaultExpanded?: boolean;
  /** 쿼리 실행 실패 메시지 (있으면 테이블 대신 에러 박스 렌더링) */
  error?: string;
}

// ============================================
// SqlResultTable
// ============================================

export function SqlResultTable({
  columns,
  data,
  executionTime,
  totalRowCount,
  defaultRowLimit = 5,
  defaultExpanded = true,
  error,
}: SqlResultTableProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const hasError = !!error;
  // 0건 결과여도 헤더("0건 조회됨")는 표시 → 사용자가 "에러" 와 "0건" 을 구분 가능.
  // early return 제거 (이전: columns·data 모두 빈 경우 null 반환했었음).

  const total = totalRowCount ?? data.length;
  const displayData = data.slice(0, defaultRowLimit);
  const displayCount = Math.min(data.length, defaultRowLimit);
  const isEmpty = !hasError && data.length === 0;
  // 빈 상태 안내 row 의 colSpan — columns 가 비어있어도 최소 1 보장
  const emptyColSpan = Math.max(columns.length, 1);

  return (
    <Box className="SqlResult__section">
      {/* 헤더 — 클릭으로 열고 닫기 */}
      <FlexBox
        className={clsx(
          "SqlResult__header",
          isExpanded && "SqlResult__header-expanded",
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <FlexBox className="SqlResult__header-title">
          SQL 쿼리 실행 결과
          <Typography
            component="span"
            className="SqlResult__header-count"
          >
            {hasError ? "(실행 실패)" : `(${total}건 조회됨)`}
          </Typography>
        </FlexBox>
        <IconButton size="small" className="SqlResult__toggle-btn">
          {isExpanded ? (
            <ExpandLessIcon fontSize="small" />
          ) : (
            <ExpandMoreIcon fontSize="small" />
          )}
        </IconButton>
      </FlexBox>

      {/* 내용 — 테이블 + 메타 또는 에러 박스 */}
      <Collapse in={isExpanded} timeout={300} mountOnEnter unmountOnExit>
        <Box className="SqlResult__content">
          {hasError ? (
            // 에러 박스
            <Box className="SqlResult__error-box">
              <Typography className="SqlResult__error-title">
                데이터를 불러올 수 없습니다
              </Typography>
              <Typography className="SqlResult__error-message">
                {error}
              </Typography>
            </Box>
          ) : (
            <>
              {/* 테이블 */}
              <Box className="SqlResult__table-wrapper">
                <Table className="SqlResult__table">
                  <TableHead>
                    <TableRow className="SqlResult__head-row">
                      {columns.map((col) => (
                        <TableCell key={col} className="SqlResult__head-cell">
                          {col}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {isEmpty ? (
                      <TableRow className="SqlResult__body-row SqlResult__body-row--empty">
                        <TableCell
                          colSpan={emptyColSpan}
                          className="SqlResult__body-cell SqlResult__body-cell--empty"
                        >
                          조회 결과가 없습니다
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayData.map((row, rowIdx) => (
                        <TableRow key={rowIdx} className="SqlResult__body-row">
                          {columns.map((col) => (
                            <TableCell key={col} className="SqlResult__body-cell">
                              {row[col] != null ? String(row[col]) : ""}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Box>

              {/* 결과 메타 */}
              <FlexBox className="SqlResult__meta">
                <Typography className="SqlResult__meta-text">
                  표시: {displayCount}건 / 전체: {total}건
                </Typography>
                {executionTime != null && (
                  <Typography className="SqlResult__meta-text">
                    {executionTime}ms
                  </Typography>
                )}
              </FlexBox>
            </>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
