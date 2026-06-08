/**
 * LLM Provider 공통 인터페이스
 */
export interface ILLMProvider {
  /**
   * LLM API 연결 확인
   */
  checkConnection(config: LLMProviderCheckConfig): Promise<LLMProviderCheckResult>;
}

/**
 * 연결 확인 설정
 */
export interface LLMProviderCheckConfig {
  apiEndpoint: string;
  apiKey: string;
  modelName: string;
}

/**
 * 연결 확인 결과
 */
export interface LLMProviderCheckResult {
  success: boolean;
  statusCode?: number;
  modelInfo?: {
    name: string;
    version: string;
    capabilities: string[];
  };
  error?: string;
}
