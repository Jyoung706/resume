import type {
  LLMConnectionCheckDbRequest,
  LLMConnectionCheckRequest,
  LLMConnectionCheckResponse
} from "@orkis-interface/backend";
import {
  Autowired,
  Body,
  Controller,
  REQUEST_METHOD,
  RequestMapping,
  Session
} from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { LLMConnectionService } from "../services/LLMConnectionService";

@Controller({ path: "/llm" })
export class LLMConnectionController {
  @Autowired("LLMConnectionService")
  private connectionService!: LLMConnectionService;

  /**
   * LLM 연결 확인
   * POST /api/llm/connection-check
   */
  @RequestMapping({
    route: "/connection-check",
    method: REQUEST_METHOD.POST
  })
  async checkConnection(
    @Body() request: LLMConnectionCheckRequest,
    @Session() session: any
  ): Promise<LLMConnectionCheckResponse> {
    try {
      const userId = session?.login_info?.ID;
      if (!userId) {
        throw new Error("인증되지 않은 사용자입니다.");
      }      const result = await this.connectionService.checkConnection(
        userId,
        request
      );      return result;
    } catch (error) {
      logger.error("[LLMConnectionController] checkConnection 에러:", error);
      throw error;
    }
  }

  /**
   * LLM 연결 확인 (modelId로 DB 조회 후 테스트)
   * POST /api/llm/connection-check-db
   */
  @RequestMapping({
    route: "/connection-check-db",
    method: REQUEST_METHOD.POST
  })
  async checkConnectionByModel(
    @Body() request: LLMConnectionCheckDbRequest,
    @Session() session: any
  ): Promise<LLMConnectionCheckResponse> {
    try {
      const userId = session?.login_info?.ID;
      if (!userId) {
        throw new Error("인증되지 않은 사용자입니다.");
      }

      if (!request.modelId) {
        throw new Error("modelId는 필수입니다.");
      }

      const overrides = (request.provider || request.modelName || request.apiEndpoint)
        ? { provider: request.provider, modelName: request.modelName, apiEndpoint: request.apiEndpoint }
        : undefined;

      const result = await this.connectionService.checkConnectionByModelId(
        userId,
        request.modelId,
        overrides
      );

      return result;
    } catch (error) {
      logger.error("[LLMConnectionController] checkConnectionByModel 에러:", error);
      throw error;
    }
  }
}
