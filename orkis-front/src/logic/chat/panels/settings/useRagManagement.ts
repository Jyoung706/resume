/**
 * useRagManagement — RAG 전처리 관리 Hook
 * SettingsPanelConnector에서 ragService/ragPollingStore 직접 호출을 분리
 */
import { useEffect, useState } from "react";
import { useSettingsStore } from "@/logic/common/ui/settingsStore";
import { useDbSelectionStore } from "@/logic/common/db/dbSelectionStore";
import { useRagPollingStore } from "@/logic/common/rag/ragPollingStore";
import { ragService } from "@/logic/common/rag/ragService";
import { RagType } from "@/logic/common/db/types/dbConnection";
import type { RagType as RagTypeValue } from "@/logic/common/db/types/dbConnection";

export function useRagManagement() {
  // ── settingsStore ──
  const ragSelectedDbId = useSettingsStore((s) => s.ragSelectedDbId);
  const setRagSelectedDbId = useSettingsStore((s) => s.setRagSelectedDbId);

  // ── dbSelectionStore ──
  const dbConnections = useDbSelectionStore((s) => s.dbConnections);
  const ragCompletedDbConnections = useDbSelectionStore(
    (s) => s.ragCompletedDbConnections
  );

  // ── ragPollingStore ──
  const monitoringDbId = useRagPollingStore((s) => s.monitoringDbId);
  const ragHistoryMap = useRagPollingStore((s) => s.ragHistoryMap);
  const changeMonitoringDb = useRagPollingStore((s) => s.changeMonitoringDb);
  const requestPreprocessing = useRagPollingStore(
    (s) => s.requestPreprocessing
  );
  const overallStatus = useRagPollingStore((s) => s.getCurrentOverallStatus());
  const isLoading = useRagPollingStore((s) => s.isLoading);
  const isRagPollingActive = useRagPollingStore((s) => s.isRagPollingActive);

  // 현재 모니터링 중인 DB의 RAG 히스토리
  const ragHistory =
    monitoringDbId != null ? ragHistoryMap[monitoringDbId] ?? [] : [];

  // RAG 완료 DB ID 목록
  const ragCompletedDbIds = ragCompletedDbConnections.map(
    (c) => c.connectionId
  );

  // 실행 중 여부
  const isExecuting = isLoading || isRagPollingActive;

  // ── ConfirmModal 상태 ──
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingRagType, setPendingRagType] = useState<RagTypeValue>(
    RagType.ALL
  );

  // ── 기본 선택 로직: persist된 값 → RAG 완료 DB → 기본 DB → 첫 번째 DB ──
  useEffect(() => {
    if (dbConnections.length === 0) return;

    // persist된 값이 유효하면 유지
    if (ragSelectedDbId != null) {
      const exists = dbConnections.some(
        (c) => c.connectionId === ragSelectedDbId
      );
      if (exists) return;
    }

    // RAG 완료 DB 우선
    if (ragCompletedDbConnections.length > 0) {
      handleRagDbChange(ragCompletedDbConnections[0].connectionId);
      return;
    }

    // 기본 DB
    const defaultDb = dbConnections.find((c) => c.isDefault);
    if (defaultDb) {
      handleRagDbChange(defaultDb.connectionId);
      return;
    }

    // 첫 번째 DB
    handleRagDbChange(dbConnections[0].connectionId);
  }, [dbConnections.length, ragCompletedDbConnections.length]);

  // ── ragPollingStore.monitoringDbId 변경 → ragSelectedDbId 동기화 ──
  useEffect(() => {
    if (monitoringDbId != null && monitoringDbId !== ragSelectedDbId) {
      setRagSelectedDbId(monitoringDbId);
    }
  }, [monitoringDbId]);

  // ── RAG DB 선택 변경 핸들러 ──
  const handleRagDbChange = (id: number | null) => {
    setRagSelectedDbId(id);
    changeMonitoringDb(id);
  };

  // ── 전처리 실행 공통 플로우 ──
  const initiatePreprocessing = async (ragType: RagTypeValue) => {
    if (ragSelectedDbId == null) return;

    const { exists } = await ragService.checkExistingPreprocessing(
      ragSelectedDbId
    );

    if (exists) {
      setPendingRagType(ragType);
      setIsConfirmOpen(true);
    } else {
      await requestPreprocessing(ragSelectedDbId, ragType);
    }
  };

  // ── 전체 실행 ──
  const handleRunAll = () => {
    initiatePreprocessing(RagType.ALL);
  };

  // ── 개별 실행 ──
  const handleRunSingle = (ragType: RagTypeValue) => {
    initiatePreprocessing(ragType);
  };

  // ── ConfirmModal 확인 → 전처리 실행 ──
  const handleConfirmExec = () => {
    setIsConfirmOpen(false);
    if (ragSelectedDbId == null) return;
    requestPreprocessing(ragSelectedDbId, pendingRagType);
  };

  return {
    ragSelectedDbId,
    onRagDbChange: handleRagDbChange,
    ragHistory,
    ragCompletedDbIds,
    onRunAll: handleRunAll,
    onRunSingle: handleRunSingle,
    isExecuting,
    overallStatus,
    // ConfirmModal
    isConfirmOpen,
    closeConfirm: () => setIsConfirmOpen(false),
    handleConfirmExec,
  };
}
