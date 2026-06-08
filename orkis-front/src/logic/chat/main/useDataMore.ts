/**
 * useDataMore — DATA 더보기 훅
 * executeQuery API 호출 + dataViewStore 업데이트
 */
import { useCallback } from "react";
import { useDataViewStore } from "@/logic/common/chat/stores/dataViewStore";
import {
  useDbSelectionStore,
  extractDbId,
} from "@/logic/common/db/dbSelectionStore";
import { executeQuery } from "@/logic/common/chat/services/queryService";
import { showToast } from "@/logic/shared/utils/toast";

export function useDataMore() {
  const { openDataView, setLoading } = useDataViewStore();
  const selectedDbConnection = useDbSelectionStore(
    (s) => s.selectedDbConnection,
  );

  const handleDataMore = useCallback(
    async (params: { sqlQuery: string; title?: string }) => {
      if (!params.sqlQuery) {
        showToast("SQL 쿼리가 없습니다", "error");
        return;
      }

      const dbId = extractDbId(selectedDbConnection);
      if (!dbId) {
        showToast("데이터베이스가 선택되지 않았습니다", "error");
        return;
      }

      setLoading(true);
      try {
        const result = await executeQuery(params.sqlQuery, {
          dbId,
          connectionId: selectedDbConnection?.connectionId,
          limit: 100,
        });

        openDataView({
          columns: result.columns,
          data: result.data,
          title: params.title,
        });
      } catch (error) {
        showToast(
          error instanceof Error
            ? error.message
            : "쿼리 실행 중 오류가 발생했습니다",
          "error",
        );
      } finally {
        setLoading(false);
      }
    },
    [openDataView, setLoading, selectedDbConnection],
  );

  return { handleDataMore };
}
