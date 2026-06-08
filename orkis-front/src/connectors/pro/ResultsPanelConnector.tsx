// ============================================
// ResultsPanelConnector — queryPanelStore → ResultsPanel 연결
// 정렬·필터 (client-side) + CSV/JSON export.
// 정렬·필터 상태는 탭별 connector instance 의 local state — dockview 내에서
// 패널은 항상 마운트 유지되므로 탭 전환에도 보존된다. 새 쿼리 실행 시
// 결과가 바뀌면 정렬 키만 유지하고 필터는 그대로 — 사용자 의도 보존.
// ============================================

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import type { IDockviewPanelProps } from "dockview-react";
import { ResultsPanel, type SortDirection } from "@/pages/pro/parts/ResultsPanel";
import { useQueryPanelStore } from "@/logic/common/pro/stores/queryPanelStore";
import {
  buildDownloadFilename,
  downloadAsCSV,
  downloadAsJSON,
} from "@/logic/shared/utils/csvExport";
import {
  triggerServerExport,
  validateQueryForExport,
  type ServerExportFormat,
} from "@/logic/shared/utils/serverExport";
import { showToast } from "@/logic/shared/utils/toast";
import type { QueryResult } from "@/logic/common/pro/types/proMode.types";

function compareCell(a: unknown, b: unknown, dir: SortDirection): number {
  // null / undefined → 항상 뒤로 (sort dir 무관)
  const aNull = a == null;
  const bNull = b == null;
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;

  // 숫자 비교 우선 (string 으로 들어와도 numeric 가능하면)
  const aNum = typeof a === "number" ? a : Number(a);
  const bNum = typeof b === "number" ? b : Number(b);
  const bothNumeric = !Number.isNaN(aNum) && !Number.isNaN(bNum);
  let cmp: number;
  if (bothNumeric) {
    cmp = aNum - bNum;
  } else {
    cmp = String(a).localeCompare(String(b));
  }
  return dir === "desc" ? -cmp : cmp;
}

function applyFilter(
  data: Array<Record<string, unknown>>,
  columns: string[],
  filter: string,
): Array<Record<string, unknown>> {
  if (!filter) return data;
  const needle = filter.toLowerCase();
  return data.filter((row) =>
    columns.some((c) => {
      const v = row[c];
      if (v == null) return false;
      return String(v).toLowerCase().includes(needle);
    }),
  );
}

function applySort(
  data: Array<Record<string, unknown>>,
  sortKey: string | null,
  sortDir: SortDirection,
): Array<Record<string, unknown>> {
  if (!sortKey) return data;
  return [...data].sort((a, b) =>
    compareCell(a[sortKey], b[sortKey], sortDir),
  );
}

export function ResultsPanelConnector(props: IDockviewPanelProps) {
  const tabId = props.params.tabId as string;

  const result = useQueryPanelStore((s) => s.queryResults[tabId] ?? null);
  const error = useQueryPanelStore((s) => s.errorByTab[tabId] ?? null);
  const isExecuting = useQueryPanelStore((s) => s.isExecuting[tabId] ?? false);
  // 다운로드 파일명에 탭 제목을 슬러그화하여 포함 — 사용자가 여러 결과를
  // 다운로드할 때 어느 탭에서 나온 것인지 식별 용이.
  const tabTitle = useQueryPanelStore(
    (s) => s.tabs.find((t) => t.id === tabId)?.title,
  );
  // 전체 export (서버 streaming) 에는 현재 SQL 과 DB 정보가 필요.
  // 화면 데이터 다운로드 (displayResult 기반) 와 달리 서버 측에서 원본 쿼리를
  // 다시 실행하므로 필터·정렬은 적용되지 않는다 (사용자 결정 b).
  const tab = useQueryPanelStore((s) => s.tabs.find((t) => t.id === tabId));

  // ── 정렬·필터 state ──
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [filterText, setFilterText] = useState("");

  // 5만행 시나리오에서 키스트로크당 100~300ms 메인 스레드 점유 회피.
  // 입력 자체는 동기 반영(부드러운 typing) + 무거운 재계산은 idle 시점으로 이연.
  const deferredFilterText = useDeferredValue(filterText);

  const handleSortChange = useCallback(
    (column: string) => {
      // 같은 컬럼 클릭 → asc → desc → 해제 순환. 다른 컬럼이면 asc 부터.
      setSortKey((prev) => {
        if (prev !== column) {
          setSortDirection("asc");
          return column;
        }
        // prev === column
        if (sortDirection === "asc") {
          setSortDirection("desc");
          return column;
        }
        // desc 상태 → 해제
        setSortDirection("asc");
        return null;
      });
    },
    [sortDirection],
  );

  // 필터·정렬 적용된 결과 (deferredFilterText 사용 → useDeferredValue 효과 적용)
  const displayResult = useMemo<QueryResult | null>(() => {
    if (!result) return null;
    const filtered = applyFilter(result.data, result.columns, deferredFilterText);
    const sorted = applySort(filtered, sortKey, sortDirection);
    return {
      ...result,
      data: sorted,
      rowCount: sorted.length,
    };
  }, [result, deferredFilterText, sortKey, sortDirection]);

  // truncated 결과 다운로드 시 사용자에게 잘림 사실을 토스트로 명시 안내.
  // displayResult.truncated 는 원본 result.truncated 를 보존 (filter 와 무관).
  // 메시지 내 limit 값은 displayResult.effectiveLimit 에서 동적으로 가져온다.
  // 조사 처리: "행으로" / "행수로" 모두 자연스러운 한국어 표현이 되도록 limitText 에 조사 포함.
  const warnIfTruncated = useCallback(() => {
    if (!displayResult?.truncated) return;
    const limit = displayResult.effectiveLimit;
    const limitText =
      limit != null ? `${limit.toLocaleString()}행으로` : "최대 행수로";
    showToast(
      `결과가 ${limitText} 잘려 다운로드됩니다. 전체 데이터가 필요하면 쿼리를 좁혀주세요.`,
      "warning",
    );
  }, [displayResult]);

  // 화면 데이터 export — 필터·정렬이 적용된 현재 표시 데이터를 다운로드.
  // 파일명: {탭제목}_{timestamp}.{ext}  (variant="screen" 기본).
  const handleExportCsv = useCallback(() => {
    if (!displayResult) return;
    warnIfTruncated();
    showToast("CSV 파일을 생성하는 중...", "info");
    downloadAsCSV(
      displayResult.data,
      displayResult.columns,
      buildDownloadFilename(tabTitle, "csv", "screen"),
    );
  }, [displayResult, tabTitle, warnIfTruncated]);

  const handleExportJson = useCallback(() => {
    if (!displayResult) return;
    warnIfTruncated();
    showToast("JSON 파일을 생성하는 중...", "info");
    downloadAsJSON(
      displayResult.data,
      displayResult.columns,
      buildDownloadFilename(tabTitle, "json", "screen"),
    );
  }, [displayResult, tabTitle, warnIfTruncated]);

  // 전체 데이터 export — 서버 streaming. 원본 SQL 결과 그대로 (limit·필터·정렬 무시).
  // 1) validateQueryForExport 로 사전 검증 (실패 시 토스트 + form submit 차단)
  // 2) 즉시 "처리 중" 토스트 (form submit 은 완료 신호 없음 → 전역 autoHide 4초에 위임)
  // 3) form submit 으로 백엔드 /query/export 호출 — 브라우저가 직접 디스크 저장
  const handleFullExport = useCallback(
    async (format: ServerExportFormat) => {
      if (!tab?.sqlQuery || tab.sqlQuery.trim().length === 0) {
        showToast("SQL 을 먼저 입력해 주세요.", "warning");
        return;
      }

      const connectionIdNum = tab.selectedDbId
        ? Number(tab.selectedDbId)
        : undefined;
      const payload = {
        sqlQuery: tab.sqlQuery,
        dbId: tab.selectedDbId ?? undefined,
        connectionId:
          connectionIdNum !== undefined && !Number.isNaN(connectionIdNum)
            ? connectionIdNum
            : undefined,
      };

      // 1. 사전 검증
      try {
        await validateQueryForExport(payload);
      } catch (err) {
        // apiPost throw 객체는 두 형태 가능 (code-reviewer H1):
        //   - HTTP 에러: { error: { code, message } } — err.error 가 객체
        //   - success:false 본문: { error: "..." } 또는 { error: { message } }
        // 백엔드 응답 형식 변동에도 안전하도록 다단계 추출.
        const errObj = (err ?? {}) as {
          error?: unknown;
          message?: string;
        };
        let message = "쿼리 검증에 실패했습니다.";
        if (typeof errObj.error === "string") {
          message = errObj.error;
        } else if (
          errObj.error &&
          typeof errObj.error === "object" &&
          "message" in errObj.error
        ) {
          message = String((errObj.error as { message: unknown }).message);
        } else if (typeof errObj.message === "string") {
          message = errObj.message;
        }
        showToast(message, "error");
        return;
      }

      // 2. form submit - 모든 브라우저 통일 (Phase 2 PR#9 정정 - 2026-06-04).
      //    브라우저 native 다운로드 매니저가 처리 - 사용자는 다른 페이지 이동 /
      //    새로고침 / 탭 닫기 가능. 다운로드는 브라우저 다운로드 창에서 진행률·취소.
      //    fetch + showSaveFilePicker 경로는 사용자 의도 (백그라운드 다운로드)
      //    와 맞지 않아 제거.
      showToast(
        "다운로드를 시작했습니다. 브라우저 다운로드 매니저에서 진행 상황을 확인하세요.",
        "info",
      );
      triggerServerExport({ ...payload, format });
    },
    [tab],
  );

  const handleFullExportCsv = useCallback(
    () => handleFullExport("csv"),
    [handleFullExport],
  );
  const handleFullExportJson = useCallback(
    () => handleFullExport("json"),
    [handleFullExport],
  );

  // 전체 export 는 SQL 만 있으면 노출 (결과 유무와 무관 — 사용자가 결과 보기 전
  // 에도 SQL 만 작성된 상태에서 전체 export 가능).
  const hasSql = !!tab?.sqlQuery && tab.sqlQuery.trim().length > 0;

  return (
    <ResultsPanel
      result={displayResult}
      error={error}
      isExecuting={isExecuting}
      onExportCsv={displayResult ? handleExportCsv : undefined}
      onExportJson={displayResult ? handleExportJson : undefined}
      onFullExportCsv={hasSql ? handleFullExportCsv : undefined}
      onFullExportJson={hasSql ? handleFullExportJson : undefined}
      sortKey={sortKey}
      sortDirection={sortDirection}
      onSortChange={handleSortChange}
      filterText={filterText}
      onFilterChange={setFilterText}
      totalRowCount={result?.data.length}
    />
  );
}
