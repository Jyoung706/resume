/**
 * LLM 모델 관련 타입 정의
 * orkis-interface 의존 없이 필요한 타입만 정의
 */

// ── 모델 파라미터 ──

export interface LLMModelParameters {
  temperature?: number;
  max_tokens?: number;
  [key: string]: unknown;
}

// ── 모델 응답 ──

/** LLM 모델 정보 */
export interface LLMModelResponse {
  id: string;
  modelName: string;
  displayName: string;
  provider: string;
  modelType?: string;
  apiEndpoint?: string;
  apiKeyMasked?: string;
  apiVersion?: string;
  parameters?: LLMModelParameters;
  isDefault?: boolean;
  connectionStatus?: "connected" | "disconnected" | "unknown";
  lastTestedAt?: string;
}

// ── CRUD DTO ──

/** LLM 모델 생성 요청 */
export interface CreateLLMModelDTO {
  modelName: string;
  displayName: string;
  provider: string;
  modelType?: string;
  apiEndpoint: string;
  apiKey: string;
  apiVersion?: string;
  parameters?: LLMModelParameters;
  isDefault?: boolean;
  connectionStatus?: "connected" | "disconnected" | "unknown";
}

/** LLM 모델 수정 요청 */
export interface UpdateLLMModelDTO {
  provider?: string;
  modelName?: string;
  displayName?: string;
  apiEndpoint?: string;
  apiKey?: string;
  apiVersion?: string;
  parameters?: LLMModelParameters;
  isActive?: boolean;
  isDefault?: boolean;
}

// ── 연결 확인 ──

/** LLM 연결 확인 요청 (설정 직접 전달) */
export interface LLMConnectionCheckRequest {
  modelId?: string;
  provider: string;
  apiEndpoint: string;
  apiKey: string;
  modelName: string;
}

/** LLM 연결 확인 요청 (DB 모델 기반) */
export interface LLMConnectionCheckDbRequest {
  modelId: string;
  provider?: string;
  modelName?: string;
  apiEndpoint?: string;
}

/** LLM 연결 확인 응답 */
export interface LLMConnectionCheckResponse {
  success: boolean;
  responseTimeMs?: number;
  statusCode?: number;
  errorMessage?: string;
}

// ── Provider / Available Models ──

/** LLM Provider 정보 */
export interface LLMProviderResponse {
  providerId: number;
  providerName: string;
  provider: string;
  website?: string;
  apiDocs?: string;
  logoUrl: string | null;
  isAvailable?: boolean;
}

/** 사용 가능한 LLM 모델 정보 */
export interface LLMAvailableModelResponse {
  modelId: number;
  providerId: number;
  modelName: string;
  modelIdentifier: string;
  version?: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  capabilities?: string[];
  pricingInput?: string | null;
  pricingOutput?: string | null;
}
