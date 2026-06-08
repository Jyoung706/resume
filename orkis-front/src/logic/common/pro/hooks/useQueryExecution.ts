/**
 * useQueryExecution — SQL 쿼리 실행 훅
 * queryPanelStore와 연동하여 탭별 쿼리 실행/결과/히스토리 관리
 */
import { useCallback } from "react";
import { nanoid } from "nanoid";
import { useQueryPanelStore } from "@/logic/common/pro/stores/queryPanelStore";
import {
  executeQuery,
  cancelQuery,
} from "@/logic/common/chat/services/queryService";
import { getLogger } from "@/logic/shared/utils/logger";
import {
  MAX_ROW_HARD_CAP,
  type RowLimitOption,
} from "@/logic/common/pro/types/proMode.types";

const logger = getLogger("useQueryExecution");

// "MAX" 도 무제한이 아닌 MAX_ROW_HARD_CAP 로 변환 — 서버 보호 + 클라이언트 freeze 방지.
function rowLimitToNumber(limit: RowLimitOption): number {
  return limit === "MAX" ? MAX_ROW_HARD_CAP : limit;
}

export function useQueryExecution(tabId: string) {
  const setExecuting = useQueryPanelStore((s) => s.setExecuting);
  const setQueryResult = useQueryPanelStore((s) => s.setQueryResult);
  const setError = useQueryPanelStore((s) => s.setError);
  const setController = useQueryPanelStore((s) => s.setController);
  const setExecutionId = useQueryPanelStore((s) => s.setExecutionId);
  const addHistory = useQueryPanelStore((s) => s.addHistory);

  const execute = useCallback(async () => {
    const store = useQueryPanelStore.getState();
    const tab = store.tabs.find((t) => t.id === tabId);
    if (!tab || !tab.sqlQuery.trim()) return;

    // 동일 탭에서 이미 실행 중이면 두 번째 호출 무시 (Ctrl+Enter 중복 입력 가드).
    if (store.isExecuting[tabId]) return;

    if (!tab.selectedDbId) {
      setError(tabId, "DB를 선택해주세요. 에디터 툴바에서 DB를 먼저 선택한 후 실행하세요.");
      return;
    }

    // 쿼리당 AbortController + executionId(Phase 2) 생성.
    // - controller: cancel() 호출 시 controller.abort() → fetch reject (즉시 UI 회수)
    // - executionId: 백엔드 SQLite interrupt 추적용. nanoid 21자(~149bit) — 충돌 무시 가능
    // 두 식별자 모두 탭별 분리 — 동시 8탭 실행 시 cancel 격리 보장.
    const controller = new AbortController();
    const executionId = nanoid();
    setController(tabId, controller);
    setExecutionId(tabId, executionId);
    setExecuting(tabId, true);
    setError(tabId, null);

    const startTime = performance.now();

    try {
      const connectionId = Number(tab.selectedDbId);
      const response = await executeQuery(tab.sqlQuery, {
        dbId: tab.selectedDbId,
        connectionId: isNaN(connectionId) ? undefined : connectionId,
        limit: rowLimitToNumber(tab.rowLimit),
        signal: controller.signal,
        executionId,
      });

      // 응답이 도착했지만 그 사이 abort 됐다면 결과 폐기 — 늦게 도착한 응답이
      // 다른 탭/다음 쿼리에 새지 않도록 방어.
      if (controller.signal.aborted) return;

      const executionTime = Math.round(performance.now() - startTime);

      // 사용자가 선택한 행 수 상한. rowLimitToNumber 헬퍼 재사용으로 변환 정책 단일 출처 유지.
      const userLimit = rowLimitToNumber(tab.rowLimit);

      // 클라이언트 hard cap slice — 서버가 cap 을 무시하고 더 많이 반환할 때만 발동.
      const clientHardCapped = response.data.length > MAX_ROW_HARD_CAP;
      let data = response.data;
      if (clientHardCapped) {
        logger.warn(
          `서버 응답이 hard cap ${MAX_ROW_HARD_CAP} 을 초과 (${response.data.length}). 잘라서 표시.`,
        );
        data = data.slice(0, MAX_ROW_HARD_CAP);
      }

      // 서버가 사용자 선택 limit 을 적용한 것으로 추정 — data.length 가 정확히 userLimit 와 같을 때.
      // MAX 모드에서 정확히 50000 도달 케이스 포함.
      // 백엔드가 limit 을 미적용해 더 많이 반환한 경우 (data > userLimit 인데 < MAX) 는 잘림이 아니라
      // limit 미적용 케이스 → false 로 판정 (별도 UX 안내는 후속 작업 대상).
      // 알려진 false positive: 데이터가 정확히 userLimit 행 일 때 (잘리지 않았어도 truncated=true).
      // 사용자가 limit 을 의식적으로 선택했다는 점에서 보수적 추정으로 수용.
      const serverLimitReached =
        !clientHardCapped && data.length === userLimit;

      const truncated = clientHardCapped || serverLimitReached;
      // 불변식: truncated=true ⇒ effectiveLimit 은 number.
      const effectiveLimit = clientHardCapped
        ? MAX_ROW_HARD_CAP
        : serverLimitReached
          ? userLimit
          : undefined;

      const result = {
        columns: response.columns,
        data,
        rowCount: data.length,
        executionTime,
        truncated,
        effectiveLimit,
      };

      setQueryResult(tabId, result);

      addHistory(tabId, {
        id: `hist-${Date.now()}`,
        sqlQuery: tab.sqlQuery,
        executedAt: new Date().toISOString(),
        executionTime,
        rowCount: result.rowCount,
        success: true,
      });
    } catch (error) {
      const executionTime = Math.round(performance.now() - startTime);

      // 사용자 중지(cancel) 인 경우: 에러 토스트 회피, 히스토리에 "사용자 중지" 로 기록.
      // request.ts 의 handleNetworkError 가 AbortError 를 "요청이 취소되었습니다." 메시지로
      // 변환해 throw 하므로, signal.aborted 자체를 기준으로 판정한다.
      if (controller.signal.aborted) {
        addHistory(tabId, {
          id: `hist-${Date.now()}`,
          sqlQuery: tab.sqlQuery,
          executedAt: new Date().toISOString(),
          executionTime,
          rowCount: null,
          success: false,
          error: "사용자 중지",
        });
        return;
      }

      const message = error instanceof Error ? error.message : "쿼리 실행 실패";
      setError(tabId, message);

      addHistory(tabId, {
        id: `hist-${Date.now()}`,
        sqlQuery: tab.sqlQuery,
        executedAt: new Date().toISOString(),
        executionTime,
        rowCount: null,
        success: false,
        error: message,
      });
    } finally {
      setExecuting(tabId, false);
      setController(tabId, null);
      setExecutionId(tabId, null);
    }
  }, [tabId, setExecuting, setQueryResult, setError, setController, setExecutionId, addHistory]);

  // 현재 탭의 진행 중 쿼리 cancel. controller 없으면 (이미 완료/미실행) no-op.
  // abort() 는 idempotent — Stop 버튼 double-click 안전.
  // Phase 2: executionId 가 있으면 백엔드 /query/cancel 도 best-effort 로 호출하여
  //   서버 측 SQLite db.interrupt() 실행 → 서버 CPU/IO 즉시 회수.
  const cancel = useCallback(() => {
    const store = useQueryPanelStore.getState();
    const controller = store.controllerByTab[tabId];
    if (!controller) return;

    // 1. 클라이언트 abort — 즉시 UI 회수 (Phase 1 동작 그대로)
    controller.abort();

    // 2. 백엔드 cancel — best-effort. 응답을 기다리지 않으며 실패해도 UI 영향 0.
    //    cancelQuery 자체가 fail-soft 이므로 catch 불필요.
    const executionId = store.executionIdByTab[tabId];
    if (executionId) {
      void cancelQuery(executionId);
    }
    // setExecuting / setController / setExecutionId 정리는 execute() 의 finally 가 담당.
  }, [tabId]);

  return { execute, cancel };
}
