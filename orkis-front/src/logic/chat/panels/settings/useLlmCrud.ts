/**
 * useLlmCrud — LLM 모델 CRUD 로직 훅
 * SettingsPanelConnector에서 추출
 */
import { useState } from "react";
import { useLlmModelStore } from "@/logic/common/llm/llmModelStore";
import { llmModelService } from "@/logic/common/llm/llmModelService";
import { showToast } from "@/logic/shared/utils/toast";
import type {
  LLMModelResponse,
  CreateLLMModelDTO,
  LLMConnectionCheckRequest,
  LLMProviderResponse,
  LLMAvailableModelResponse,
} from "@/logic/common/llm/types/llmModel";

export interface UseLlmCrudReturn {
  models: LLMModelResponse[];
  defaultModel: LLMModelResponse | null;
  fetchModels: () => Promise<void>;

  // 다이얼로그
  llmDialogOpen: boolean;
  editingLlmModel: LLMModelResponse | null;
  llmSaving: boolean;
  llmSaveError: string | null;
  providers: LLMProviderResponse[];
  availableModels: LLMAvailableModelResponse[];
  loadingProviders: boolean;
  loadingModels: boolean;

  // 삭제 확인
  llmDeleteConfirmOpen: boolean;

  // 연결 확인
  checkResult: ReturnType<typeof useLlmModelStore.getState>["checkResult"];
  checkLoading: boolean;

  // 핸들러
  handleOpenLlmDialog: () => void;
  handleEditLlmModel: (model: LLMModelResponse) => void;
  handleCloseLlmDialog: () => void;
  handleProviderChange: (provider: string) => void;
  handleLlmSave: (data: CreateLLMModelDTO) => Promise<void>;
  handleLlmCheckConnection: (request: LLMConnectionCheckRequest) => void;
  handleDeleteLlmModel: (modelId: string) => void;
  handleConfirmLlmDelete: () => Promise<void>;
  handleLlmSetDefault: (modelId: string) => Promise<void>;
  clearCheckResult: () => void;
  closeDeleteConfirm: () => void;
}

export function useLlmCrud(): UseLlmCrudReturn {
  // ── llmModelStore ──
  const models = useLlmModelStore((s) => s.models);
  const defaultModel = useLlmModelStore((s) => s.defaultModel);
  const fetchModels = useLlmModelStore((s) => s.fetchModels);
  const createModel = useLlmModelStore((s) => s.createModel);
  const updateModel = useLlmModelStore((s) => s.updateModel);
  const deleteModel = useLlmModelStore((s) => s.deleteModel);
  const setDefaultModel = useLlmModelStore((s) => s.setDefaultModel);
  const checkConnection = useLlmModelStore((s) => s.checkConnection);
  const checkResult = useLlmModelStore((s) => s.checkResult);
  const checkLoading = useLlmModelStore((s) => s.checkLoading);
  const clearCheckResult = useLlmModelStore((s) => s.clearCheckResult);

  // ── 다이얼로그 상태 ──
  const [llmDialogOpen, setLlmDialogOpen] = useState(false);
  const [editingLlmModel, setEditingLlmModel] = useState<LLMModelResponse | null>(null);
  const [llmSaving, setLlmSaving] = useState(false);
  const [llmSaveError, setLlmSaveError] = useState<string | null>(null);

  // ── 삭제 확인 상태 ──
  const [llmDeleteConfirmOpen, setLlmDeleteConfirmOpen] = useState(false);
  const [deletingLlmModelId, setDeletingLlmModelId] = useState<string | null>(null);

  // ── Provider / AvailableModels ──
  const [providers, setProviders] = useState<LLMProviderResponse[]>([]);
  const [availableModels, setAvailableModels] = useState<LLMAvailableModelResponse[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  // Provider 목록 로드
  const loadProviders = async () => {
    setLoadingProviders(true);
    try {
      const data = await llmModelService.getProviders();
      setProviders(data);
    } finally {
      setLoadingProviders(false);
    }
  };

  // AvailableModels 로드
  const loadAvailableModels = async (provider: string) => {
    setLoadingModels(true);
    try {
      const selectedProvider = providers.find((p) => p.provider === provider);
      if (selectedProvider) {
        const data = await llmModelService.getAvailableModels(selectedProvider.providerId);
        setAvailableModels(data);
      }
    } finally {
      setLoadingModels(false);
    }
  };

  const handleOpenLlmDialog = () => {
    setEditingLlmModel(null);
    setLlmSaveError(null);
    clearCheckResult();
    setLlmDialogOpen(true);
    loadProviders();
  };

  const handleEditLlmModel = (model: LLMModelResponse) => {
    setEditingLlmModel(model);
    setLlmSaveError(null);
    clearCheckResult();
    setLlmDialogOpen(true);
    loadProviders();
  };

  const handleCloseLlmDialog = () => {
    setLlmDialogOpen(false);
    setEditingLlmModel(null);
    clearCheckResult();
  };

  const handleProviderChange = (provider: string) => {
    setAvailableModels([]);
    loadAvailableModels(provider);
  };

  const handleLlmSave = async (data: CreateLLMModelDTO) => {
    setLlmSaving(true);
    setLlmSaveError(null);
    try {
      if (editingLlmModel) {
        const updates: Record<string, unknown> = {};
        if (data.provider !== editingLlmModel.provider) updates.provider = data.provider;
        if (data.modelName !== editingLlmModel.modelName) updates.modelName = data.modelName;
        if (data.displayName !== (editingLlmModel.displayName || editingLlmModel.modelName)) updates.displayName = data.displayName;
        if (data.apiEndpoint !== (editingLlmModel.apiEndpoint || "")) updates.apiEndpoint = data.apiEndpoint;
        if (data.apiKey) updates.apiKey = data.apiKey;
        if (data.apiVersion !== (editingLlmModel.apiVersion || "")) updates.apiVersion = data.apiVersion;
        if (JSON.stringify(data.parameters) !== JSON.stringify(editingLlmModel.parameters)) updates.parameters = data.parameters;
        if (data.isDefault !== editingLlmModel.isDefault) updates.isDefault = data.isDefault;

        await updateModel(editingLlmModel.id, updates);
        showToast("언어모델이 수정되었습니다.");
      } else {
        await createModel(data);
        showToast("언어모델이 추가되었습니다.");
      }
      handleCloseLlmDialog();
      // 모델 수정 후 별도 즉시 재검 불필요 — 이전 호출은 serverStatusStore.setModelStatus
      // 만 갱신하던 dead-call 로 UI 미반영이었음. wire 폴링 (useHealthPolling) 이 다음
      // cadence 시점 (최대 N × interval ≈ 5초) 또는 사용자가 다른 모델 선택 시
      // storageKey 리셋으로 자동 반영. 즉시 사용자 검증이 필요하면 설정 화면 "연결 확인"
      // 버튼 (llmModelStore.checkConnection) 사용.
    } catch (error: unknown) {
      const err = error as Record<string, unknown> | undefined;
      const errObj = err?.error as Record<string, unknown> | undefined;
      const message =
        (errObj?.message as string) ||
        (err?.message as string) ||
        (error instanceof Error ? error.message : "저장에 실패했습니다.");
      setLlmSaveError(message);
    } finally {
      setLlmSaving(false);
    }
  };

  const handleLlmCheckConnection = (request: LLMConnectionCheckRequest) => {
    checkConnection(request);
  };

  const handleDeleteLlmModel = (modelId: string) => {
    setDeletingLlmModelId(modelId);
    setLlmDeleteConfirmOpen(true);
  };

  const handleConfirmLlmDelete = async () => {
    setLlmDeleteConfirmOpen(false);
    if (deletingLlmModelId) {
      await deleteModel(deletingLlmModelId);
      setDeletingLlmModelId(null);
    }
  };

  const handleLlmSetDefault = async (modelId: string) => {
    await setDefaultModel(modelId);
  };

  const closeDeleteConfirm = () => {
    setLlmDeleteConfirmOpen(false);
  };

  return {
    models,
    defaultModel,
    fetchModels,
    llmDialogOpen,
    editingLlmModel,
    llmSaving,
    llmSaveError,
    providers,
    availableModels,
    loadingProviders,
    loadingModels,
    llmDeleteConfirmOpen,
    checkResult,
    checkLoading,
    handleOpenLlmDialog,
    handleEditLlmModel,
    handleCloseLlmDialog,
    handleProviderChange,
    handleLlmSave,
    handleLlmCheckConnection,
    handleDeleteLlmModel,
    handleConfirmLlmDelete,
    handleLlmSetDefault,
    clearCheckResult,
    closeDeleteConfirm,
  };
}
