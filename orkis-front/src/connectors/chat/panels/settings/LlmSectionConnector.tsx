// ============================================
// LlmSectionConnector — 언어모델 섹션 커넥터
// 소유 훅: useLlmCrud
// 렌더링: LLMModelList + LLMModelDialog + 삭제 ConfirmModal
// ============================================

import { useEffect } from "react";
import { ConfirmModal } from "@/components";
import { LLMModelList, LLMModelDialog } from "@/pages/chat/panels/settings/LLMModelSection";
import { useLlmCrud } from "@/logic/chat/panels/settings/useLlmCrud";

const LLM_DELETE_MESSAGE = "이 언어모델을 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.";

export function LlmSectionConnector() {
  const llm = useLlmCrud();

  useEffect(() => {
    llm.fetchModels();
  }, []);

  return (
    <>
      {/* ── LLM 모델 리스트 ── */}
      <LLMModelList
        models={llm.models}
        defaultModel={llm.defaultModel}
        onAddClick={llm.handleOpenLlmDialog}
        onEditClick={llm.handleEditLlmModel}
        onDeleteClick={llm.handleDeleteLlmModel}
        onSetDefault={llm.handleLlmSetDefault}
      />

      {/* ── LLM 등록/수정 다이얼로그 ── */}
      <LLMModelDialog
        open={llm.llmDialogOpen}
        onClose={llm.handleCloseLlmDialog}
        model={llm.editingLlmModel}
        providers={llm.providers}
        availableModels={llm.availableModels}
        loadingProviders={llm.loadingProviders}
        loadingModels={llm.loadingModels}
        onProviderChange={llm.handleProviderChange}
        onSave={llm.handleLlmSave}
        onCheckConnection={llm.handleLlmCheckConnection}
        checkResult={llm.checkResult}
        checkLoading={llm.checkLoading}
        onClearCheckResult={llm.clearCheckResult}
        saving={llm.llmSaving}
        saveError={llm.llmSaveError}
      />

      {/* ── LLM 삭제 확인 다이얼로그 ── */}
      <ConfirmModal
        open={llm.llmDeleteConfirmOpen}
        onClose={llm.closeDeleteConfirm}
        title="언어모델 삭제"
        message={LLM_DELETE_MESSAGE}
        confirmText="삭제"
        cancelText="취소"
        confirmColor="error"
        onConfirm={llm.handleConfirmLlmDelete}
      />
    </>
  );
}
