/**
 * useTabSqlUpdater — 활성 탭 에디터에 SQL 을 주입하는 훅
 * Snippets/History 패널이 항목 클릭 시 공통으로 사용.
 *
 * 정책: 주입 시점에 sql-formatter 로 정렬된 형태로 교체한다.
 * "SQL 보기" 신규 탭 (ChatMiniConnector) 과 동일 정책 — 단축키 Shift+Alt+F 를
 * 따로 누르지 않아도 최초 표시 시점부터 포맷이 적용된 상태로 노출.
 * 식별자 append 흐름(useTabIdentifierInserter)은 부분 편집이라 포맷 미적용.
 */
import { useCallback } from "react";
import { useQueryPanelStore } from "@/logic/common/pro/stores/queryPanelStore";
import { formatSql } from "@/logic/common/chat/utils/sqlFormatter";

export function useTabSqlUpdater(): (sqlQuery: string) => void {
  const activeTabId = useQueryPanelStore((s) => s.activeTabId);
  const updateTab = useQueryPanelStore((s) => s.updateTab);

  return useCallback(
    (sqlQuery: string) => {
      if (activeTabId) {
        updateTab(activeTabId, { sqlQuery: formatSql(sqlQuery) });
      }
    },
    [activeTabId, updateTab],
  );
}
