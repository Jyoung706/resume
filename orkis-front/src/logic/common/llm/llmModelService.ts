/**
 * LLM Model Service — API 통신 계층
 * orkis-front llmModelService 이식
 */
import { apiPost } from "@/logic/shared/services/request";
import { getLogger } from "@/logic/shared/utils/logger";
import type {
  LLMModelResponse,
  CreateLLMModelDTO,
  UpdateLLMModelDTO,
  LLMConnectionCheckRequest,
  LLMConnectionCheckDbRequest,
  LLMConnectionCheckResponse,
  LLMProviderResponse,
  LLMAvailableModelResponse,
} from "@/logic/common/llm/types/llmModel";

const logger = getLogger("LLMModelService");

/** LLM 모델 목록 조회 */
async function getModels(): Promise<LLMModelResponse[]> {
  try {
    const response = await apiPost<LLMModelResponse[]>("/llm/models");
    return Array.isArray(response) ? response : [];
  } catch (error) {
    logger.error("getModels 실패:", error);
    return [];
  }
}

/** LLM 모델 생성 */
async function createModel(data: CreateLLMModelDTO): Promise<LLMModelResponse> {
  return await apiPost<LLMModelResponse>("/llm/models/create", data);
}

/** LLM 모델 수정 */
async function updateModel(modelId: string, data: UpdateLLMModelDTO): Promise<LLMModelResponse> {
  return await apiPost<LLMModelResponse>(`/llm/models/update/${modelId}`, data);
}

/** LLM 모델 삭제 */
async function deleteModel(modelId: string): Promise<void> {
  await apiPost<void>(`/llm/models/delete/${modelId}`);
}

/** 기본 모델 설정 */
async function setDefaultModel(modelId: string): Promise<LLMModelResponse> {
  return await apiPost<LLMModelResponse>(`/llm/models/set-default/${modelId}`);
}

/** LLM 연결 확인 (새 API 키 직접 전달) */
async function checkConnection(request: LLMConnectionCheckRequest): Promise<LLMConnectionCheckResponse> {
  return await apiPost<LLMConnectionCheckResponse>("/llm/connection-check", request);
}

/** LLM 연결 확인 (DB 모델 기반, 기존 DB 키 사용 + 오버라이드) */
async function checkConnectionByModel(request: LLMConnectionCheckDbRequest): Promise<LLMConnectionCheckResponse> {
  return await apiPost<LLMConnectionCheckResponse>("/llm/connection-check-db", request);
}

/** Provider 목록 조회 */
async function getProviders(): Promise<LLMProviderResponse[]> {
  try {
    const response = await apiPost<LLMProviderResponse[]>("/llm/providers");
    return Array.isArray(response) ? response : [];
  } catch (error) {
    logger.error("getProviders 실패:", error);
    return [];
  }
}

/** 사용 가능한 모델 조회 */
async function getAvailableModels(providerId?: number): Promise<LLMAvailableModelResponse[]> {
  try {
    const response = await apiPost<LLMAvailableModelResponse[]>(
      "/llm/available-models",
      providerId ? { providerId } : {},
    );
    return Array.isArray(response) ? response : [];
  } catch (error) {
    logger.error("getAvailableModels 실패:", error);
    return [];
  }
}

export const llmModelService = {
  getModels,
  createModel,
  updateModel,
  deleteModel,
  setDefaultModel,
  checkConnection,
  checkConnectionByModel,
  getProviders,
  getAvailableModels,
};
