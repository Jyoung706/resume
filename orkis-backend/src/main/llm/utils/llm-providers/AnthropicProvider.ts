import Anthropic from '@anthropic-ai/sdk';
import {
  ILLMProvider,
  LLMProviderCheckConfig,
  LLMProviderCheckResult,
} from './ILLMProvider';

/**
 * Anthropic Provider 구현
 * Anthropic 공식 SDK를 사용하여 연결 테스트 수행
 */
export class AnthropicProvider implements ILLMProvider {
  async checkConnection(
    config: LLMProviderCheckConfig
  ): Promise<LLMProviderCheckResult> {
    const startTime = Date.now();

    try {
      // Anthropic 공식 SDK 초기화
      const anthropic = new Anthropic({
        apiKey: config.apiKey,
        baseURL: config.apiEndpoint.replace('/v1/messages', ''), // baseURL만 필요
        timeout: 5000,
      });

      // 연결 테스트 (최소 토큰으로 요청)
      const response = await anthropic.messages.create({
        model: config.modelName,
        messages: [
          {
            role: 'user',
            content: 'ping',
          },
        ],
        max_tokens: 1, // Anthropic은 max_tokens 사용 (변경 없음)
      });

      const responseTime = Date.now() - startTime;

      return {
        success: true,
        statusCode: 200,
        modelInfo: {
          name: config.modelName,
          version: response.model || config.modelName,
          capabilities: ['chat', 'completion'],
        },
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      // Anthropic SDK 에러 처리
      if (error instanceof Anthropic.APIError) {
        return {
          success: false,
          statusCode: error.status,
          error: JSON.stringify({
            message: error.message,
            status: error.status,
          }),
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
