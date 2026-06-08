// ============================================
// ResultsPanel — 쿼리 결과 테이블 영역
// Design 컴포넌트: props-only
//
// 5만행까지 freeze 없이 표시하기 위해 react-virtuoso 의 TableVirtuoso 사용.
// components 슬롯에 기존 base/Table 컴포넌트를 forwardRef 로 주입하여
// className/sx/사이즈 정책 (PascalCase BEM + ConvenienceProps + --alias-* 토큰)
// 을 그대로 유지한다.
//
// 가상화 모델: tbody 안의 가시 영역 행만 마운트. 5만행이어도 DOM 노드 수는
// 가시 영역(약 20~30 행) 분량으로 일정. sticky 헤더는 라이브러리가 자체 처리.
// ============================================

import { useCallback, useMemo, useState } from "react";
import clsx from "clsx";
import {
  Box,
  Button,
  CircularProgress,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  VirtualTable,
} from "@/components";
import { EmptyState, Icon, FlexBox } from "@/components";
import { ExportMenu } from "@/pages/pro/parts/ExportMenu";
import type { QueryResult } from "@/logic/common/pro/types/proMode.types";
import "./ResultsPanel.scss";

export type SortDirection = "asc" | "desc";

export interface ResultsPanelProps {
  result: QueryResult | null;
  error: string | null;
  isExecuting: boolean;
  /** 화면 데이터 CSV 다운로드 (현재 필터·정렬 적용된 limit) — 결과 있을 때만 노출 */
  onExportCsv?: () => void;
  /** 화면 데이터 JSON 다운로드 — 결과 있을 때만 노출 */
  onExportJson?: () => void;
  /** 전체 데이터 CSV 다운로드 (서버 streaming, 원본 그대로) — 쿼리 있을 때만 노출 */
  onFullExportCsv?: () => void;
  /** 전체 데이터 JSON 다운로드 — 쿼리 있을 때만 노출 */
  onFullExportJson?: () => void;

  // ── 정렬/필터 (옵션) ──
  /** 정렬 기준 컬럼 (null = 정렬 없음) */
  sortKey?: string | null;
  /** 정렬 방향 */
  sortDirection?: SortDirection;
  /** 컬럼 헤더 클릭 — 같은 컬럼이면 방향 토글, 다른 컬럼이면 새 정렬 */
  onSortChange?: (column: string) => void;
  /** 필터 텍스트 (전체 컬럼 substring match) */
  filterText?: string;
  /** 필터 입력 변경 */
  onFilterChange?: (text: string) => void;
  /**
   * 필터·정렬이 적용되기 전 원본 row 수.
   * `result.rowCount` 가 필터 후 값일 때 "X / Y rows" 표시에 사용.
   */
  totalRowCount?: number;
}

// ── VirtualTable 도메인 className 설정 ──
// ui/VirtualTable 이 react-virtuoso TableVirtuoso 를 1:1 캡슐화. ResultsPanel 의
// 도메인 BEM 은 classNames prop 으로 주입.
type RowData = Record<string, unknown>;

// result 가 null 인 경우의 columns fallback. hook 의존성 reference 안정화 용도.
const EMPTY_COLUMNS: readonly string[] = Object.freeze([]);

// ── 컬럼 헤더 렌더링 헬퍼 ──
// 정상 모드 (TableVirtuoso fixedHeaderContent) 와 filter-no-match 모드 (정적 thead)
// 둘 다에서 동일한 헤더 마크업을 보장하기 위해 분리.
function renderHeaderRow(
  columns: readonly string[],
  sortKey: string | null | undefined,
  sortDirection: SortDirection | undefined,
  onSortChange: ((column: string) => void) | undefined,
): React.ReactElement {
  return (
    <TableRow>
      <TableCell className="ResultsPanel__th ResultsPanel__th--row">
        #
      </TableCell>
      {columns.map((col) => {
        const isSorted = sortKey === col;
        const indicator = isSorted
          ? sortDirection === "desc"
            ? "arrow_downward"
            : "arrow_upward"
          : null;
        return (
          <TableCell
            key={col}
            className={clsx(
              "ResultsPanel__th",
              isSorted && "ResultsPanel__th--sorted",
            )}
            aria-sort={
              isSorted
                ? sortDirection === "desc"
                  ? "descending"
                  : "ascending"
                : undefined
            }
          >
            {onSortChange ? (
              <Button
                className="ResultsPanel__th-btn"
                variant="text"
                size="small"
                onClick={() => onSortChange(col)}
                endIcon={
                  indicator ? <Icon size="small">{indicator}</Icon> : undefined
                }
              >
                {col}
              </Button>
            ) : (
              col
            )}
          </TableCell>
        );
      })}
    </TableRow>
  );
}

export function ResultsPanel({
  result,
  error,
  isExecuting,
  onExportCsv,
  onExportJson,
  onFullExportCsv,
  onFullExportJson,
  sortKey,
  sortDirection,
  onSortChange,
  filterText,
  onFilterChange,
  totalRowCount,
}: ResultsPanelProps) {
  // ── 다운로드 드롭다운 anchor + open state ──
  // RowLimitMenu 패턴 — useState 로 anchor 관리 (react-compiler refs 룰).
  const [exportAnchorEl, setExportAnchorEl] = useState<HTMLElement | null>(
    null,
  );
  // React Hooks 규칙: early return 전에 모두 호출되어야 함.
  // result 가 null 인 경우에도 hook 순서를 일정하게 유지하기 위해
  // columns 를 빈 배열로 fallback.
  const columns = result?.columns ?? EMPTY_COLUMNS;

  // itemContent: TableVirtuoso 가 각 가시 행마다 호출. <></> 로 td 들을 반환
  // (TableRow 는 components.TableRow 가 자동 래핑).
  // useCallback 으로 reference 안정화 — typing 시 부모 재렌더에서 Virtuoso 의
  // 가시 행 메모이즈를 깨지 않음.
  const itemContent = useCallback(
    (rowIdx: number, row: RowData) => (
      <>
        <TableCell className="ResultsPanel__td ResultsPanel__td--row">
          {rowIdx + 1}
        </TableCell>
        {columns.map((col) => (
          <TableCell key={col} className="ResultsPanel__td">
            {row[col] == null ? (
              <Typography
                className="ResultsPanel__null"
                variant="caption"
                component="span"
              >
                NULL
              </Typography>
            ) : (
              String(row[col])
            )}
          </TableCell>
        ))}
      </>
    ),
    [columns],
  );

  // 헤더 마크업도 메모이즈 — typing 시 헤더 JSX 트리 N(columns) 재생성 회피.
  const headerRow = useMemo(
    () => renderHeaderRow(columns, sortKey, sortDirection, onSortChange),
    [columns, sortKey, sortDirection, onSortChange],
  );
  const fixedHeaderContent = useCallback(() => headerRow, [headerRow]);

  // ── 이하 early returns (hook 호출 후) ──

  if (isExecuting) {
    return (
      <FlexBox
        className="ResultsPanel ResultsPanel--loading"
        direction="column"
        align="center"
        justify="center"
        gap={0.5}
      >
        <CircularProgress size="small" />
        <Typography
          className="ResultsPanel__message"
          variant="caption"
          component="span"
        >
          쿼리 실행 중...
        </Typography>
      </FlexBox>
    );
  }

  if (error) {
    return (
      <FlexBox className="ResultsPanel ResultsPanel--error" direction="column">
        <Typography
          className="ResultsPanel__error-message"
          variant="body2"
          component="div"
        >
          {error}
        </Typography>
      </FlexBox>
    );
  }

  if (!result) {
    return (
      <Box className="ResultsPanel ResultsPanel--empty">
        <EmptyState
          title="결과 없음"
          description="쿼리를 실행하면 결과가 여기에 표시됩니다 (Ctrl+Enter)"
        />
      </Box>
    );
  }

  const showFilterCount =
    typeof totalRowCount === "number" && totalRowCount !== result.rowCount;
  // !!filterText 만으로 빈 문자열을 false 로 평가하므로 length 추가 체크 불필요.
  const isFilterNoMatch = result.data.length === 0 && !!filterText;

  return (
    <Box className="ResultsPanel">
      <FlexBox
        className="ResultsPanel__info"
        align="center"
        justify="space-between"
        gap={0.5}
      >
        <FlexBox align="center" gap={0.5}>
          <Typography
            className="ResultsPanel__info-stats"
            variant="caption"
            component="span"
          >
            {showFilterCount
              ? `${result.rowCount} / ${totalRowCount} rows`
              : `${result.rowCount} rows`}
            {" · "}
            {(result.executionTime / 1000).toFixed(2)}s
          </Typography>
          {result.truncated && (
            <Typography
              className="ResultsPanel__truncated-warning"
              variant="caption"
              component="span"
              role="status"
              aria-live="polite"
            >
              {result.effectiveLimit != null
                ? `· LIMIT ${result.effectiveLimit.toLocaleString()} 도달`
                : "· LIMIT 도달"}
            </Typography>
          )}
          {onFilterChange && (
            <Input
              className="ResultsPanel__filter"
              type="search"
              size="small"
              placeholder="필터 (모든 컬럼)"
              value={filterText ?? ""}
              onChange={(e) => onFilterChange(e.target.value)}
              aria-label="결과 필터"
            />
          )}
        </FlexBox>
        <FlexBox className="ResultsPanel__export" align="center" gap={0.25}>
          {(onExportCsv ||
            onExportJson ||
            onFullExportCsv ||
            onFullExportJson) && (
            <>
              <Button
                className="ResultsPanel__export-btn"
                variant="outlined"
                size="small"
                onClick={(e) => setExportAnchorEl(e.currentTarget)}
                endIcon={<Icon size="small">expand_more</Icon>}
                title="다운로드"
              >
                다운로드
              </Button>
              <ExportMenu
                anchorEl={exportAnchorEl}
                open={!!exportAnchorEl}
                onClose={() => setExportAnchorEl(null)}
                onExportScreenCsv={onExportCsv}
                onExportScreenJson={onExportJson}
                onExportFullCsv={onFullExportCsv}
                onExportFullJson={onFullExportJson}
              />
            </>
          )}
        </FlexBox>
      </FlexBox>

      {isFilterNoMatch ? (
        // 필터 일치 없음: 컬럼 헤더 보존하기 위해 정적 thead + 단일 no-match
        // 행을 그린다. TableVirtuoso 의 EmptyPlaceholder 슬롯은 외부 div 로
        // 렌더되어 colSpan 패턴이 불자연스럽고 SCSS 매칭도 달라지므로 회피.
        <Box className="ResultsPanel__table-wrap">
          <Table className="ResultsPanel__table" size="small">
            <TableHead>{headerRow}</TableHead>
            <TableBody>
              <TableRow>
                <TableCell
                  className="ResultsPanel__td ResultsPanel__td--no-match"
                  colSpan={columns.length + 1}
                >
                  필터와 일치하는 row 가 없습니다
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Box>
      ) : (
        <VirtualTable<RowData>
          data={result.data}
          itemContent={itemContent}
          fixedHeaderContent={fixedHeaderContent}
          size="small"
          classNames={{
            root: "ResultsPanel__virtuoso",
            scroller: "ResultsPanel__table-wrap",
            table: "ResultsPanel__table",
            tableRow: "ResultsPanel__tr",
          }}
        />
      )}
    </Box>
  );
}
