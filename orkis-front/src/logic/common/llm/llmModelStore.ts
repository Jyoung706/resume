/**
 * LLM 모델 상태 관리 Store (Zustand)
 * orkis-front llmModelStore 이식 — CRUD + 연결 확인
 */
import { create } from "zustand";
import { llmModelService } from "@/logic/common/llm/llmModelService";
import { getLogger } from "@/logic/shared/utils/logger";
import type {
  LLMModelResponse,
  CreateLLMModelDTO,
  UpdateLLMModelDTO,
  LLMConnectionCheckRequest,
  LLMConnectionCheckResponse,
} from "@/logic/common/llm/types/llmModel";

const logger = getLogger("LLMModelStore");

const SELECTED_MODEL_STORAGE_KEY = "selectedLlmModelId";

interface LLMModelState {
  models: LLMModelResponse[];
  selectedModel: LLMModelResponse | null;
  defaultModel: LLMModelResponse | null;
  loading: boolean;
  isInitialized: boolean;
  error: string | null;
  checkResult: LLMConnectionCheckResponse | null;
  checkLoading: boolean;

  fetchModels: () => Promise<void>;
  selectModel: (model: LLMModelResponse | null) => void;
  createModel: (data: CreateLLMModelDTO) => Promise<LLMModelResponse>;
  updateModel: (modelId: string, data: UpdateLLMModelDTO) => Promise<LLMModelResponse>;
  deleteModel: (modelId: string) => Promise<void>;
  setDefaultModel: (modelId: string) => Promise<void>;
  checkConnection: (request: LLMConnectionCheckRequest) => Promise<void>;
  clearCheckResult: () => void;
  clearError: () => void;
}

export const useLlmModelStore = create<LLMModelState>((set, get) => ({
  models: [],
  selectedModel: null,
  defaultModel: null,
  loading: false,
  isInitialized: false,
  error: null,
  checkResult: null,
  checkLoading: false,

  fetchModels: async () => {
    if (get().loading) return;

    set({ loading: true, error: null });
    try {
      const models = await llmModelService.getModels();
      const defaultModel = models.find((m) => m.isDefault) || null;

      // sessionStorage 에 저장된 이전 선택 복원 (탭 단위 격리).
      // 모델이 삭제·미존재면 selectedModel=null 로 두고, useChatInputToolbar 에서
      // `selectedModel ?? defaultModel` 폴백이 동작한다.
      const savedId = sessionStorage.getItem(SELECTED_MODEL_STORAGE_KEY);
      const restored = savedId ? models.find((m) => m.id === savedId) ?? null : null;
      if (savedId && !restored) {
        sessionStorage.removeItem(SELECTED_MODEL_STORAGE_KEY);
      }

      set({
        models,
        defaultModel,
        selectedModel: restored,
        loading: false,
        isInitialized: true,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "LLM 모델 목록 조회 실패";
      logger.error("fetchModels:", error);
      set({ error: message, loading: false, isInitialized: true });
    }
  },

  selectModel: (model) => {
    set({ selectedModel: model });
    if (model) {
      sessionStorage.setItem(SELECTED_MODEL_STORAGE_KEY, model.id);
    } else {
      sessionStorage.removeItem(SELECTED_MODEL_STORAGE_KEY);
    }
  },

  createModel: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await llmModelService.createModel(data);
      if (response) {
        set({ loading: false });
        await get().fetchModels();
        return response;
      }
      throw new Error("LLM 모델 생성 실패");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "LLM 모델 생성 실패";
      set({ error: message, loading: false });
      throw error;
    }
  },

  updateModel: async (modelId, data) => {
    set({ loading: true, error: null });
    try {
      const response = await llmModelService.updateModel(modelId, data);
      if (response) {
        set({ loading: false });
        await get().fetchModels();
        return response;
      }
      throw new Error("LLM 모델 수정 실패");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "LLM 모델 수정 실패";
      set({ error: message, loading: false });
      throw error;
    }
  },

  deleteModel: async (modelId) => {
    set({ loading: true, error: null });
    try {
      await llmModelService.deleteModel(modelId);
      set({ loading: false });
      await get().fetchModels();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "LLM 모델 삭제 실패";
      set({ error: message, loading: false });
      throw error;
    }
  },

  setDefaultModel: async (modelId) => {
    set({ loading: true, error: null });
    try {
      const response = await llmModelService.setDefaultModel(modelId);
      if (response) {
        set({ defaultModel: response, loading: false });
        await get().fetchModels();
      } else {
        throw new Error("기본 모델 설정 실패");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "기본 모델 설정 실패";
      set({ error: message, loading: false });
      throw error;
    }
  },

  checkConnection: async (request) => {
    set({ checkLoading: true, error: null, checkResult: null });
    try {
      // API 키가 비어있고 modelId가 있으면 기존 DB 키 기반 확인
      const useExistingKey = !request.apiKey && !!request.modelId;
      const checkResult = useExistingKey
        ? await llmModelService.checkConnectionByModel({
            modelId: request.modelId!,
            provider: request.provider,
            modelName: request.modelName,
            apiEndpoint: request.apiEndpoint,
          })
        : await llmModelService.checkConnection(request);
      set({ checkResult, checkLoading: false });

      // 기존 모델 확인 시 목록 갱신 (connectionStatus 반영)
      if (request.modelId) {
        await get().fetchModels();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "연결 확인 실패";
      set({
        error: message,
        checkLoading: false,
        checkResult: { success: false, responseTimeMs: 0, errorMessage: message },
      });

      if (request.modelId) {
        await get().fetchModels();
      }
    }
  },

  clearCheckResult: () => {
    set({ checkResult: null });
  },

  clearError: () => {
    set({ error: null });
  },
}));

/** 모델 존재 여부 파생 셀렉터 */
export const useHasAnyModel = () => useLlmModelStore((s) => s.models.length > 0);
export const useDefaultModel = () => useLlmModelStore((s) => s.defaultModel);
