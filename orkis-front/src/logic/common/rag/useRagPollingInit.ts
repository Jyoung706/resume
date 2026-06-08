/**
 * RAG 폴링 초기화 훅 (앱 레벨)
 *
 * App 레벨에서 1회 마운트.
 * - dbSelectionStore의 selectedDbConnection 변경을 감지
 * - RAG 상태에 따라 자동 폴링 시작/중지
 * - Settings 패널 열림/닫힘과 무관하게 동작
 */
import { useEffect } from "react";
import { useDbSelectionStore } from "@/logic/common/db/dbSelectionStore";
import { useRagPollingStore } from "@/logic/common/rag/ragPollingStore";

export function useRagPollingInit(): void {
  const selectedDb = useDbSelectionStore((s) => s.selectedDbConnection);
  const changeMonitoringDb = useRagPollingStore((s) => s.changeMonitoringDb);
  const stopPolling = useRagPollingStore((s) => s.stopPolling);

  // DB 선택 변경 시 모니터링 대상 전환
  useEffect(() => {
    if (selectedDb) {
      changeMonitoringDb(selectedDb.connectionId);
    } else {
      // RAG 전처리 진행 중이면 폴링 유지 (selectedDb가 null이어도)
      const isActive = useRagPollingStore.getState().isRagPollingActive;
      if (!isActive) {
        stopPolling();
      }
    }
  }, [selectedDb?.connectionId, changeMonitoringDb, stopPolling]);

  // 앱 언마운트 시 정리
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);
}
