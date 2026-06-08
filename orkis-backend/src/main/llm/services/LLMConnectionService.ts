import { Autowired, Service } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import {
  LLMConnectionStatus,
  LLMConnectionCheckRequest,
  LLMConnectionCheckResponse,
  LLMProvider
} from "@orkis-interface/backend";
import { LLMConnectionLogDao } from "@/llm/repositories/LLMConnectionLogDao";
import { LLMModelDao } from "@/llm/repositories/LLMModelDao";
import { LLMEncryptionService } from "./LLMEncryptionService";
import {
  AnthropicProvider,
  ILLMProvider,
  OpenAIProvider
} from "../utils/llm-providers";

/**
 * LLM 연결 확인 서비스
 */
@Service("LLMConnectionService")
export class LLMConnectionService {
  @Autowired("LLMConnectionLogDao")
  private connectionLogDao!: LLMConnectionLogDao;

  @Autowired("LLMModelDao")
  private modelDao!: LLMModelDao;

  @Autowired("LLMEncryptionService")
  private encryptionService!: LLMEncryptionService;

  /**
   * modelId로 DB에서 모델 정보를 조회하여 연결 테스트 수행
   */
  async checkConnectionByModelId(
    userId: string,
    modelId: string,
    overrides?: { provider?: string; modelName?: string; apiEndpoint?: string },
    ipAddress?: string,
    userAgent?: string
  ): Promise<LLMConnectionCheckResponse> {
    const model = await this.modelDao.findById(modelId);
    if (!model) {
      throw new Error("모델을 찾을 수 없습니다.");
    }

    let apiKey: string;
    try {
      apiKey = this.encryptionService.decrypt(model.apiKeyEncrypted);
    } catch (error: any) {
      logger.error("[LLMConnectionService] API 키 복호화 실패:", error);
      throw new Error("API 키 복호화에 실패했습니다.");
    }

    return this.checkConnection(
      userId,
      {
        modelId: model.id,
        provider: (overrides?.provider || model.provider) as LLMConnectionCheckRequest["provider"],
        apiEndpoint: overrides?.apiEndpoint || model.apiEndpoint,
        apiKey,
        modelName: overrides?.modelName || model.modelName,
      },
      ipAddress,
      userAgent
    );
  }

  /**
   * LLM 모델 연결 확인
   */
  async checkConnection(
    userId: string,
    request: LLMConnectionCheckRequest,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LLMConnectionCheckResponse> {
    const startTime = Date.now();

    try {
      const provider = this.getProvider(request.provider);

      const result = await provider.checkConnection({
        apiEndpoint: request.apiEndpoint,
        apiKey: request.apiKey,
        modelName: request.modelName
      });

      const responseTimeMs = Date.now() - startTime;

      if (request.modelId) {
        // 연결 로그 저장
        await this.connectionLogDao.create({
          llmModelId: request.modelId,
          userId,
          testType: "manual",
          testResult: result.success ? "success" : "failure",
          responseTimeMs,
          statusCode: result.statusCode,
          errorMessage: result.error,
          ipAddress,
          userAgent
        });

        // 모델의 connectionStatus 업데이트
        const newStatus = result.success
          ? LLMConnectionStatus.CONNECTED
          : LLMConnectionStatus.DISCONNECTED;
        await this.modelDao.updateConnectionStatus(
          request.modelId,
          newStatus,
          result.error
        );
      }

      return {
        success: result.success,
        responseTimeMs,
        statusCode: result.statusCode,
        errorMessage: result.error,
        modelInfo: result.modelInfo
      };
    } catch (error: any) {
      const responseTimeMs = Date.now() - startTime;

      if (request.modelId) {
        // 연결 로그 저장
        await this.connectionLogDao.create({
          llmModelId: request.modelId,
          userId,
          testType: "manual",
          testResult: "failure",
          responseTimeMs,
          errorMessage: error.message,
          ipAddress,
          userAgent
        });

        // 모델의 connectionStatus를 DISCONNECTED로 업데이트
        await this.modelDao.updateConnectionStatus(
          request.modelId,
          LLMConnectionStatus.DISCONNECTED,
          error.message
        );
      }

      return {
        success: false,
        responseTimeMs,
        errorMessage: error.message || "Unknown error"
      };
    }
  }

  /**
   * 제공사별 클라이언트 선택
   */
  private getProvider(provider: LLMProvider): ILLMProvider {
    switch (provider) {
      case LLMProvider.OPENAI:
        return new OpenAIProvider();
      case LLMProvider.ANTHROPIC:
        return new AnthropicProvider();
      default:
        throw new Error(`지원하지 않는 LLM 제공사: ${provider}`);
    }
  }
}
