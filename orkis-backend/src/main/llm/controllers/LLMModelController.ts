import {
  Autowired,
  Controller,
  Body,
  RequestMapping,
  Param,
  Session,
  REQUEST_METHOD
} from "@orkis/core/common";
import logger from "@orkis/core/utils";
import type {
  CreateLLMModelDTO,
  UpdateLLMModelDTO,
  LLMModelListResponse,
  LLMModelDetailResponse,
  CreateLLMModelResponse,
  UpdateLLMModelResponse,
  DeleteLLMModelResponse,
  SetDefaultModelResponse
} from "@orkis-interface/backend";
import { LLMModelService } from "../services/LLMModelService";

@Controller({ path: "/llm" })
export class LLMModelController {
  @Autowired("LLMModelService")
  private llmModelService!: LLMModelService;

  /**
   * LLM 모델 목록 조회
   * GET /api/llm/models
   */
  @RequestMapping({ route: "/models", method: REQUEST_METHOD.POST })
  async getModels(@Session() session: any): Promise<LLMModelListResponse> {
    try {
      const userId = String(session?.login_info?.ID);
      if (!userId) {
        throw new Error("인증되지 않은 사용자입니다.");
      }      const models = await this.llmModelService.findAllByUser(userId);

      return {
        success: true,
        data: models,
        total: models.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error("[LLMModelController] getModels 에러:", error);
      throw error;
    }
  }

  /**
   * LLM 모델 생성
   * POST /api/llm/models/create
   */
  @RequestMapping({ route: "/models/create", method: REQUEST_METHOD.POST })
  async createModel(
    @Body() data: CreateLLMModelDTO,
    @Session() session: any
  ): Promise<CreateLLMModelResponse> {
    try {
      const userId = String(session?.login_info?.ID);
      if (!userId) {
        throw new Error("인증되지 않은 사용자입니다.");
      }      const model = await this.llmModelService.create(userId, data);

      return {
        success: true,
        data: model,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error("[LLMModelController] createModel 에러:", error);
      throw error;
    }
  }

  /**
   * LLM 모델 수정
   * PUT /api/llm/models/update/:id
   */
  @RequestMapping({ route: "/models/update/:id", method: REQUEST_METHOD.POST })
  async updateModel(
    @Param("id") modelId: string,
    @Body() data: UpdateLLMModelDTO,
    @Session() session: any
  ): Promise<UpdateLLMModelResponse> {
    try {
      const userId = String(session?.login_info?.ID);
      if (!userId) {
        throw new Error("인증되지 않은 사용자입니다.");
      }      const model = await this.llmModelService.update(userId, modelId, data);

      return {
        success: true,
        data: model,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error("[LLMModelController] updateModel 에러:", error);
      throw error;
    }
  }

  /**
   * LLM 모델 삭제
   * DELETE /api/llm/models/delete/:id
   */
  @RequestMapping({ route: "/models/delete/:id", method: REQUEST_METHOD.POST })
  async deleteModel(
    @Param("id") modelId: string,
    @Session() session: any
  ): Promise<DeleteLLMModelResponse> {
    try {
      const userId = String(session?.login_info?.ID);
      if (!userId) {
        throw new Error("인증되지 않은 사용자입니다.");
      }      await this.llmModelService.delete(userId, modelId);

      return {
        success: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error("[LLMModelController] deleteModel 에러:", error);
      throw error;
    }
  }

  /**
   * 기본 모델 설정
   * POST /api/llm/models/set-default/:id
   */
  @RequestMapping({
    route: "/models/set-default/:id",
    method: REQUEST_METHOD.POST
  })
  async setDefaultModel(
    @Param("id") modelId: string,
    @Session() session: any
  ): Promise<SetDefaultModelResponse> {
    try {
      const userId = String(session?.login_info?.ID);
      if (!userId) {
        throw new Error("인증되지 않은 사용자입니다.");
      }      const model = await this.llmModelService.setDefault(userId, modelId);

      return {
        success: true,
        data: model,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error("[LLMModelController] setDefaultModel 에러:", error);
      throw error;
    }
  }

  /**
   * LLM 모델 상세 조회
   * GET /api/llm/models/:id
   * 주의: 이 라우트는 가장 마지막에 위치해야 합니다 (와일드카드 패턴)
   */
  @RequestMapping({ route: "/models/:id", method: REQUEST_METHOD.POST })
  async getModel(
    @Param("id") modelId: string,
    @Session() session: any
  ): Promise<LLMModelDetailResponse> {
    try {
      const userId = String(session?.login_info?.ID);
      if (!userId) {
        throw new Error("인증되지 않은 사용자입니다.");
      }      const model = await this.llmModelService.findById(userId, modelId);

      return {
        success: true,
        data: model,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error("[LLMModelController] getModel 에러:", error);
      throw error;
    }
  }
}
