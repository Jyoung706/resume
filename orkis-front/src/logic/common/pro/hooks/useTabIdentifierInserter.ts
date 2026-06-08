/**
 * useTabIdentifierInserter — 활성 탭 SQL 끝에 식별자(테이블/컬럼명)를 추가
 * Schema Browser 에서 테이블 클릭 시 사용. 기존 sqlQuery 를 보존하고
 * 끝부분 공백을 정규화해 식별자를 이어붙인다.
 *
 * Snippet/History 의 useTabSqlUpdater 가 "전체 교체" 라면 이 훅은 "끝에 추가".
 */
import { useCallback } from "react";
import { useQueryPanelStore } from "@/logic/common/pro/stores/queryPanelStore";

export function useTabIdentifierInserter(): (identifier: string) => void {
  const activeTabId = useQueryPanelStore((s) => s.activeTabId);
  const updateTab = useQueryPanelStore((s) => s.updateTab);

  return useCallback(
    (identifier: string) => {
      if (!activeTabId) return;
      const current =
        useQueryPanelStore.getState().tabs.find((t) => t.id === activeTabId)
          ?.sqlQuery ?? "";
      const sep = current.length === 0 || /\s$/.test(current) ? "" : " ";
      updateTab(activeTabId, { sqlQuery: current + sep + identifier });
    },
    [activeTabId, updateTab],
  );
}
