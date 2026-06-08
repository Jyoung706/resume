import { Autowired, Service } from "@orkis/core/common";
import { LLMProviderDao } from "@/llm/dao/LLMProviderDao";
import type {
  LLMProviderEntity,
  LLMProviderResponse,
  LLMAvailableModelEntity,
  LLMAvailableModelResponse
} from "@orkis-interface/backend";

@Service("LLMProviderService")
export class LLMProviderService {
  @Autowired("LLMProviderDao")
  private providerDao!: LLMProviderDao;

  async getAllProviders(): Promise<LLMProviderResponse[]> {
    const providers = await this.providerDao.findAllProviders();

    return providers.map((provider) => this.mapToProviderResponse(provider));
  }

  async getModelsByProvider(
    providerId: number
  ): Promise<LLMAvailableModelResponse[]> {
    const models = await this.providerDao.findModelsByProviderId(providerId);

    return models.map((model) => this.mapToModelResponse(model));
  }

  async getAllModels(): Promise<LLMAvailableModelResponse[]> {
    const models = await this.providerDao.findAllActiveModels();

    return models.map((model) => this.mapToModelResponse(model));
  }

  private mapToProviderResponse(
    entity: LLMProviderEntity
  ): LLMProviderResponse {
    const providerMap: Record<string, string> = {
      OpenAI: "openai",
      Anthropic: "anthropic",
      Google: "google",
      Meta: "meta",
      "Mistral AI": "mistral",
      Cohere: "cohere",
      "AI21 Labs": "ai21",
      xAI: "xai",
      DeepSeek: "deepseek",
      "Amazon (Bedrock)": "amazon",
      "01.AI": "01ai",
      "Technology Innovation Institute": "tii"
    };

    return {
      providerId: entity.providerId,
      providerName: entity.providerName,
      provider:
        providerMap[entity.providerName] || entity.providerName.toLowerCase(),
      website: entity.website,
      apiDocs: entity.apiDocs,
      logoUrl: entity.logoFilename
        ? `/assets/llm-icon/${entity.logoFilename}`
        : null,
      isAvailable: entity.isAvailable
    };
  }

  private mapToModelResponse(
    entity: LLMAvailableModelEntity
  ): LLMAvailableModelResponse {
    return {
      modelId: entity.modelId,
      providerId: entity.providerId,
      modelName: entity.modelName,
      modelIdentifier: entity.modelIdentifier,
      version: entity.version,
      contextWindow: entity.contextWindow,
      maxOutputTokens: entity.maxOutputTokens,
      capabilities: entity.capabilities,
      pricingInput: entity.pricingInput,
      pricingOutput: entity.pricingOutput,
      license: entity.license,
      architecture: entity.architecture,
      releaseDate: entity.releaseDate
    };
  }
}
