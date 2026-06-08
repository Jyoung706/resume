// ============================================
// RagSectionConnector — RAG 섹션 커넥터
// 소유 훅: useRagManagement, useDbSelectionStore
// 렌더링: RagSection + RAG 전처리 확인 ConfirmModal
// ============================================

import { ConfirmModal } from "@/components";
import { useDbSelectionStore } from "@/logic/common/db/dbSelectionStore";
import { useRagManagement } from "@/logic/chat/panels/settings/useRagManagement";
import { useHasAnyModel } from "@/logic/common/llm/llmModelStore";
import { RagSection } from "@/pages/chat/panels/settings/RagSection";

const CONFIRM_MESSAGE = [
  "기존 완료된 데이터가 덮어씌워집니다.",
  "다른 DB의 RAG 데이터도 삭제됩니다.",
  "처리 중에는 질문 전송이 불가합니다.",
].join("\n");

export function RagSectionConnector() {
  const dbConnections = useDbSelectionStore((s) => s.dbConnections);
  const hasAnyModel = useHasAnyModel();
  const rag = useRagManagement();

  // ── effective-unselected 가드 ──
  // ragSelectedDbId 가 dbConnections 에 실제 존재할 때만 유효 ID 로 취급.
  // 다른 탭/사용자가 동시 삭제하거나 persist 의 stale ID 로 인해 화면 모순이
  // 발생하지 않도록 Connector 단에서 1 차 방어. EditorPanelConnector 와 동일 패턴.
  const selectedDbId =
    rag.ragSelectedDbId != null &&
    dbConnections.some((c) => c.connectionId === rag.ragSelectedDbId)
      ? rag.ragSelectedDbId
      : null;

  return (
    <>
      {/* ── RAG 섹션 ── */}
      <RagSection
        dbConnections={dbConnections}
        selectedDbId={selectedDbId}
        onDbChange={rag.onRagDbChange}
        ragHistory={rag.ragHistory}
        ragCompletedDbIds={rag.ragCompletedDbIds}
        onRunAll={rag.onRunAll}
        onRunSingle={rag.onRunSingle}
        isExecuting={rag.isExecuting}
        overallStatus={rag.overallStatus}
        hasAnyModel={hasAnyModel}
      />

      {/* ── RAG 전처리 확인 다이얼로그 ── */}
      <ConfirmModal
        open={rag.isConfirmOpen}
        onClose={rag.closeConfirm}
        title="RAG 전처리 실행"
        message={CONFIRM_MESSAGE}
        confirmText="확인"
        cancelText="취소"
        confirmColor="warning"
        onConfirm={rag.handleConfirmExec}
      />
    </>
  );
}
