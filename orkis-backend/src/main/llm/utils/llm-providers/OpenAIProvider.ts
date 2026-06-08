import OpenAI from "openai";
import {
  ILLMProvider,
  LLMProviderCheckConfig,
  LLMProviderCheckResult
} from "./ILLMProvider";

/**
 * OpenAI Provider 구현
 * OpenAI 공식 SDK를 사용하여 연결 테스트 수행
 */
export class OpenAIProvider implements ILLMProvider {
  async checkConnection(
    config: LLMProviderCheckConfig
  ): Promise<LLMProviderCheckResult> {
    try {
      const openai = new OpenAI({
        apiKey: config.apiKey
        // baseURL: config.apiEndpoint.replace("/chat/completions", ""),
        // timeout: 5000
      });

      // 모델 목록 조회 (비용 없음)
      const models = await openai.models.list();

      // 파라미터로 받은 모델이 사용 가능한지 확인
      const modelExists = models.data.find((m) => m.id === config.modelName);

      if (!modelExists) {        models.data.forEach((m) => {        });

        return {
          success: false,
          statusCode: 400,
          error: JSON.stringify({
            message: `모델 '${config.modelName}'을 사용할 수 없습니다.`,
            availableModels: models.data.map((m) => m.id)
          })
        };
      }      return {
        success: true,
        statusCode: 200,
        modelInfo: {
          name: config.modelName,
          version: modelExists.id,
          capabilities: ["chat", "completion"]
        }
      };
    } catch (error: unknown) {
      // OpenAI SDK 에러 처리
      if (error instanceof OpenAI.APIError) {
        let errorMessage = error.message;

        // HTTP 상태 코드별 상세한 원인 설명
        switch (error.status) {
          case 401:
            errorMessage = "API 키가 유효하지 않습니다";
            break;
          case 403:
            errorMessage = "권한이 없습니다 (결제 확인 필요)";
            break;
          case 429:
            errorMessage = "Rate limit 초과";
            break;
          default:
            errorMessage = error.message;
        }

        return {
          success: false,
          statusCode: error.status,
          error: JSON.stringify({
            message: errorMessage,
            type: error.type,
            code: error.code,
            originalMessage: error.message
          })
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
}
