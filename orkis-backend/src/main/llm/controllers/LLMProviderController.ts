import {
  Autowired,
  Controller,
  RequestMapping,
  Param,
  FILTER_TYPES,
  REQUEST_METHOD
} from "@orkis/core/common";
import { LLMProviderService } from "../services/LLMProviderService";
import type {
  LLMProviderListResponse,
  LLMAvailableModelsListResponse
} from "@orkis-interface/backend";

@Controller({ path: "/llm" })
export class LLMProviderController {
  @Autowired("LLMProviderService")
  private providerService!: LLMProviderService;

  @RequestMapping({
    route: "/providers",
    method: REQUEST_METHOD.POST,
    filteredType: FILTER_TYPES.NONE
  })
  async getProviders(): Promise<LLMProviderListResponse> {
    const providers = await this.providerService.getAllProviders();

    return {
      success: true,
      data: providers,
      total: providers.length,
      timestamp: new Date().toISOString()
    };
  }

  @RequestMapping({
    route: "/available-models",
    method: REQUEST_METHOD.POST,
    filteredType: FILTER_TYPES.NONE
  })
  async getAvailableModels(
    @Param("providerId") providerId?: number
  ): Promise<LLMAvailableModelsListResponse> {
    const models = providerId
      ? await this.providerService.getModelsByProvider(providerId)
      : await this.providerService.getAllModels();

    return {
      success: true,
      data: models,
      total: models.length,
      timestamp: new Date().toISOString()
    };
  }
}
