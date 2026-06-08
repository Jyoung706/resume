/**
 * LLM 모델 관리 인터페이스 정의
 * 사용자가 등록한 LLM 모델 설정 및 연결 테스트 관련 타입
 */

/**
 * LLM 제공사
 */
export enum LLMProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  META = 'meta',
  COHERE = 'cohere',
  CUSTOM = 'custom',
}

/**
 * LLM 모델 타입
 */
export enum LLMModelType {
  CHAT = 'chat',
  COMPLETION = 'completion',
  EMBEDDING = 'embedding',
}

/**
 * LLM 연결 상태
 */
export enum LLMConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  UNKNOWN = 'unknown',
}

/**
 * LLM 모델 파라미터
 */
export interface LLMModelParameters {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[];
  [key: string]: any;
}

/**
 * LLM 모델 (데이터베이스 엔티티)
 */
export interface LLMModel {
  id: string;
  userId: string;
  modelName: string;
  displayName: string;
  provider: LLMProvider;
  modelType: LLMModelType;
  apiEndpoint: string;
  apiKeyEncrypted: string;
  apiVersion?: string;
  parameters: LLMModelParameters;
  isActive: boolean;
  isDefault: boolean;
  connectionStatus: LLMConnectionStatus;
  lastTestedAt?: Date;
  lastError?: string;
  totalRequests: number;
  totalTokens: number;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * LLM 모델 생성 DTO
 */
export interface CreateLLMModelDTO {
  modelName: string;
  displayName: string;
  provider: LLMProvider;
  modelType: LLMModelType;
  apiEndpoint: string;
  apiKey: string;
  apiVersion?: string;
  parameters?: LLMModelParameters;
  isDefault?: boolean;
  connectionStatus?: LLMConnectionStatus;
}

/**
 * LLM 모델 수정 DTO
 */
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

/**
 * LLM 모델 응답 (마스킹된 API 키)
 */
export interface LLMModelResponse {
  id: string;
  userId: string;
  modelName: string;
  displayName: string;
  provider: LLMProvider;
  modelType: LLMModelType;
  apiEndpoint: string;
  apiKeyMasked: string;
  apiVersion?: string;
  parameters: LLMModelParameters;
  isActive: boolean;
  isDefault: boolean;
  connectionStatus: LLMConnectionStatus;
  lastTestedAt?: Date;
  lastError?: string;
  totalRequests: number;
  totalTokens: number;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  successRate24h?: number;
}

/**
 * LLM 연결 확인 요청 (설정 직접 전달)
 */
export interface LLMConnectionCheckRequest {
  modelId?: string;
  provider: LLMProvider;
  apiEndpoint: string;
  apiKey: string;
  modelName: string;
}

/**
 * LLM 연결 확인 요청 (DB 모델 기반)
 * provider/modelName/apiEndpoint를 지정하면 해당 값으로 오버라이드
 */
export interface LLMConnectionCheckDbRequest {
  modelId: string;
  provider?: string;
  modelName?: string;
  apiEndpoint?: string;
}

/**
 * LLM 연결 확인 응답
 */
export interface LLMConnectionCheckResponse {
  success: boolean;
  responseTimeMs: number;
  statusCode?: number;
  errorMessage?: string;
  modelInfo?: {
    name: string;
    version: string;
    capabilities: string[];
  };
}

/**
 * LLM 연결 로그
 */
export interface LLMConnectionLog {
  id: string;
  llmModelId: string;
  userId: string;
  testType: 'manual' | 'auto' | 'system';
  testResult: 'success' | 'failure' | 'timeout';
  responseTimeMs?: number;
  statusCode?: number;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

/**
 * LLM Provider (데이터베이스 엔티티)
 */
export interface LLMProviderEntity {
  providerId: number;
  providerName: string;
  website: string;
  apiDocs: string;
  logoFilename: string | null;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * LLM Provider 응답
 */
export interface LLMProviderResponse {
  providerId: number;
  providerName: string;
  provider: string;
  website: string;
  apiDocs: string;
  logoUrl: string | null;
  isAvailable: boolean;
}

/**
 * LLM Provider 목록 조회 응답
 */
export interface LLMProviderListResponse {
  success: boolean;
  data: LLMProviderResponse[];
  total: number;
  timestamp: string;
}

/**
 * 사용 가능한 LLM Model (데이터베이스 엔티티)
 */
export interface LLMAvailableModelEntity {
  modelId: number;
  providerId: number;
  modelName: string;
  modelIdentifier: string;
  version: string;
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: string[];
  pricingInput: string | null;
  pricingOutput: string | null;
  license: string | null;
  architecture: string | null;
  releaseDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 사용 가능한 LLM Model 응답
 */
export interface LLMAvailableModelResponse {
  modelId: number;
  providerId: number;
  modelName: string;
  modelIdentifier: string;
  version: string;
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: string[];
  pricingInput: string | null;
  pricingOutput: string | null;
  license: string | null;
  architecture: string | null;
  releaseDate: Date;
}

/**
 * 사용 가능한 LLM Model 목록 조회 응답
 */
export interface LLMAvailableModelsListResponse {
  success: boolean;
  data: LLMAvailableModelResponse[];
  total: number;
  timestamp: string;
}

/**
 * LLM 모델 목록 조회 응답
 */
export interface LLMModelListResponse {
  success: boolean;
  data: LLMModelResponse[];
  total: number;
  timestamp: string;
}

/**
 * LLM 모델 상세 조회 응답
 */
export interface LLMModelDetailResponse {
  success: boolean;
  data: LLMModelResponse | null;
  timestamp: string;
}

/**
 * LLM 모델 생성 응답
 */
export interface CreateLLMModelResponse {
  success: boolean;
  data: LLMModelResponse;
  timestamp: string;
}

/**
 * LLM 모델 수정 응답
 */
export interface UpdateLLMModelResponse {
  success: boolean;
  data: LLMModelResponse;
  timestamp: string;
}

/**
 * LLM 모델 삭제 응답
 */
export interface DeleteLLMModelResponse {
  success: boolean;
  timestamp: string;
}

/**
 * 기본 모델 설정 응답
 */
export interface SetDefaultModelResponse {
  success: boolean;
  data: LLMModelResponse;
  timestamp: string;
}
