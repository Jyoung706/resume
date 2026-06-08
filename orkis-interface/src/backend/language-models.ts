/**
 * 언어 모델 관련 인터페이스 정의
 */

export interface LanguageModel {
  /** 모델 고유 식별자 */
  id: string;
  /** 모델 표시명 */
  name: string;
  /** 모델 제공업체 */
  provider: string;
  /** 모델 설명 */
  description: string;
  /** 최대 토큰 수 */
  maxTokens: number;
  /** 입력 토큰 1K당 비용 (USD) */
  inputCostPer1K: number;
  /** 출력 토큰 1K당 비용 (USD) */
  outputCostPer1K: number;
  /** 모델 활성화 상태 */
  isActive: boolean;
  /** 모델 카테고리 */
  category: ModelCategory;
  /** 모델 기능 목록 */
  capabilities: ModelCapability[];
  /** 생성일시 */
  createdAt: string;
  /** 수정일시 */
  updatedAt: string;
}

export type ModelCategory = 'chat' | 'completion' | 'embedding' | 'image' | 'audio';

export type ModelCapability = 
  | 'chat' 
  | 'text-generation' 
  | 'code' 
  | 'analysis' 
  | 'sql' 
  | 'translation' 
  | 'summarization' 
  | 'question-answering';

export interface LanguageModelListRequest {
  /** 활성화된 모델만 조회 여부 */
  activeOnly?: boolean;
  /** 특정 제공업체만 조회 */
  provider?: string;
  /** 특정 카테고리만 조회 */
  category?: ModelCategory;
  /** 특정 기능을 가진 모델만 조회 */
  capability?: ModelCapability;
}

export interface LanguageModelListResponse {
  success: boolean;
  data: LanguageModel[];
  total: number;
  timestamp: string;
}

export interface LanguageModelDetailRequest {
  /** 모델 ID */
  modelId: string;
}

export interface LanguageModelDetailResponse {
  success: boolean;
  data: LanguageModel | null;
  timestamp: string;
}

export interface CreateLanguageModelRequest {
  /** 모델 고유 식별자 */
  id: string;
  /** 모델 표시명 */
  name: string;
  /** 모델 제공업체 */
  provider: string;
  /** 모델 설명 */
  description: string;
  /** 최대 토큰 수 */
  maxTokens: number;
  /** 입력 토큰 1K당 비용 (USD) */
  inputCostPer1K: number;
  /** 출력 토큰 1K당 비용 (USD) */
  outputCostPer1K: number;
  /** 모델 활성화 상태 */
  isActive: boolean;
  /** 모델 카테고리 */
  category: ModelCategory;
  /** 모델 기능 목록 */
  capabilities: ModelCapability[];
}

export interface CreateLanguageModelResponse {
  success: boolean;
  data: LanguageModel;
  timestamp: string;
}

export interface UpdateLanguageModelRequest {
  /** 모델 ID */
  modelId: string;
  /** 수정할 모델 정보 */
  updates: Partial<Omit<LanguageModel, 'id' | 'createdAt' | 'updatedAt'>>;
}

export interface UpdateLanguageModelResponse {
  success: boolean;
  data: LanguageModel;
  timestamp: string;
}

export interface DeleteLanguageModelRequest {
  /** 모델 ID */
  modelId: string;
}

export interface DeleteLanguageModelResponse {
  success: boolean;
  timestamp: string;
}