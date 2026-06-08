import { Autowired, Service } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import {
  CreateLLMModelDTO,
  LLMModel,
  LLMModelResponse,
  UpdateLLMModelDTO
} from "@orkis-interface/backend";
import { ValidationError } from "../../error/ValidationError";
import { LLMModelDao } from "@/llm/repositories/LLMModelDao";
import { LLMEncryptionService } from "./LLMEncryptionService";

/**
 * LLM 모델 관리 서비스
 */
@Service("LLMModelService")
export class LLMModelService {
  @Autowired("LLMModelDao")
  private modelDao!: LLMModelDao;

  @Autowired("LLMEncryptionService")
  private encryptionService!: LLMEncryptionService;

  /**
   * 사용자의 모든 LLM 모델 조회
   */
  async findAllByUser(userId: string): Promise<LLMModelResponse[]> {
    const models = await this.modelDao.findByUserId(userId);
    return models.map((model) => this.toResponse(model));
  }

  /**
   * LLM 모델 상세 조회
   */
  async findById(userId: string, modelId: string): Promise<LLMModelResponse> {
    const model = await this.modelDao.findById(modelId);

    if (!model || model.userId !== userId) {
      throw new Error("LLM 모델을 찾을 수 없습니다.");
    }

    return this.toResponse(model);
  }

  /**
   * 기본 모델 조회
   */
  async findDefaultByUser(userId: string): Promise<LLMModelResponse | null> {
    const model = await this.modelDao.findDefaultByUserId(userId);
    if (!model) {
      return null;
    }
    return this.toResponse(model);
  }

  /**
   * LLM 모델 생성
   */
  async create(
    userId: string,
    dto: CreateLLMModelDTO
  ): Promise<LLMModelResponse> {
    // 중복 체크
    const exists = await this.modelDao.existsByUserIdAndModelName(
      userId,
      dto.modelName
    );

    if (exists) {
      throw new ValidationError(
        `동일한 모델명 "${dto.modelName}"이(가) 이미 등록되어 있습니다. 다른 모델명을 사용해주세요.`
      );
    }

    const apiKeyEncrypted = this.encryptionService.encrypt(dto.apiKey);

    // 기존 모델이 없으면 첫 번째 모델을 자동으로 기본 모델로 설정
    const existingModels = await this.modelDao.findByUserId(userId);
    const shouldBeDefault = dto.isDefault || existingModels.length === 0;

    if (shouldBeDefault) {
      await this.modelDao.unsetDefault(userId);
    }

    const model = await this.modelDao.create({
      userId,
      modelName: dto.modelName,
      displayName: dto.displayName,
      provider: dto.provider,
      modelType: dto.modelType,
      apiEndpoint: dto.apiEndpoint,
      apiKeyEncrypted,
      apiVersion: dto.apiVersion,
      parameters: dto.parameters || {},
      isDefault: shouldBeDefault,
      connectionStatus: dto.connectionStatus
    });

    return this.toResponse(model);
  }

  /**
   * LLM 모델 수정
   */
  async update(
    userId: string,
    modelId: string,
    dto: UpdateLLMModelDTO
  ): Promise<LLMModelResponse> {
    const model = await this.modelDao.findById(modelId);

    if (!model || model.userId !== userId) {
      throw new Error("LLM 모델을 찾을 수 없습니다.");
    }

    let apiKeyEncrypted = model.apiKeyEncrypted;
    if (dto.apiKey) {
      apiKeyEncrypted = this.encryptionService.encrypt(dto.apiKey);
    }

    if (dto.isDefault) {
      await this.modelDao.unsetDefault(userId);
    }

    const updated = await this.modelDao.update(modelId, {
      provider: dto.provider,
      modelName: dto.modelName,
      displayName: dto.displayName,
      apiEndpoint: dto.apiEndpoint,
      apiKeyEncrypted: dto.apiKey ? apiKeyEncrypted : undefined,
      apiVersion: dto.apiVersion,
      parameters: dto.parameters,
      isActive: dto.isActive,
      isDefault: dto.isDefault
    });

    return this.toResponse(updated);
  }

  /**
   * LLM 모델 삭제
   *
   * 기본 모델이 삭제된 경우, 남은 모델 중 가장 최근 생성된 모델을
   * 자동으로 기본 모델로 재지정한다. 남은 모델이 없으면 별도 처리하지 않는다.
   */
  async delete(userId: string, modelId: string): Promise<void> {
    const model = await this.modelDao.findById(modelId);

    if (!model || model.userId !== userId) {
      throw new Error("LLM 모델을 찾을 수 없습니다.");
    }

    const wasDefault = model.isDefault;

    await this.modelDao.delete(modelId);

    if (wasDefault) {
      const remainingModels = await this.modelDao.findByUserId(userId);
      if (remainingModels.length > 0) {
        const nextDefault = remainingModels[0];
        await this.modelDao.update(nextDefault.id, { isDefault: true });
        logger.info(
          `[LLMModelService] 기본 모델 자동 재지정: userId=${userId}, deletedModelId=${modelId}, newDefaultModelId=${nextDefault.id}`
        );
      } else {
        logger.info(
          `[LLMModelService] 기본 모델 삭제 후 남은 모델 없음: userId=${userId}, deletedModelId=${modelId}`
        );
      }
    }
  }

  /**
   * 기본 모델 설정
   */
  async setDefault(userId: string, modelId: string): Promise<LLMModelResponse> {
    const model = await this.modelDao.findById(modelId);

    if (!model || model.userId !== userId) {
      throw new Error("LLM 모델을 찾을 수 없습니다.");
    }

    await this.modelDao.unsetDefault(userId);

    const updated = await this.modelDao.update(modelId, {
      isDefault: true
    });

    return this.toResponse(updated);
  }

  /**
   * 내부 호출용: default 모델의 복호화된 apiKey + 모델명을 반환.
   * 없으면 null.
   */
  async resolveDefaultForInternal(
    userId: string
  ): Promise<{ modelId: string; modelName: string; apiKey: string } | null> {
    const model = await this.modelDao.findDefaultByUserId(userId);
    if (!model || !model.apiKeyEncrypted) return null;
    return {
      modelId: model.id,
      modelName: model.modelName,
      apiKey: this.encryptionService.decrypt(model.apiKeyEncrypted)
    };
  }

  /**
   * 내부 호출용: modelId 기준으로 소유자 검증 + 복호화.
   * 조건 불충족 시 null.
   */
  async resolveByIdForInternal(
    userId: string,
    modelId: string
  ): Promise<{ modelId: string; modelName: string; apiKey: string } | null> {
    const model = await this.modelDao.findById(modelId);
    if (!model || model.userId !== userId || !model.apiKeyEncrypted)
      return null;
    return {
      modelId: model.id,
      modelName: model.modelName,
      apiKey: this.encryptionService.decrypt(model.apiKeyEncrypted)
    };
  }

  /**
   * LLM 모델을 응답 형식으로 변환
   */
  private toResponse(model: LLMModel): LLMModelResponse {
    const apiKeyMasked = this.encryptionService.maskApiKey(
      this.encryptionService.decrypt(model.apiKeyEncrypted)
    );

    return {
      id: model.id,
      userId: model.userId,
      modelName: model.modelName,
      displayName: model.displayName,
      provider: model.provider,
      modelType: model.modelType,
      apiEndpoint: model.apiEndpoint,
      apiKeyMasked,
      apiVersion: model.apiVersion,
      parameters: model.parameters,
      isActive: model.isActive,
      isDefault: model.isDefault,
      connectionStatus: model.connectionStatus,
      lastTestedAt: model.lastTestedAt,
      lastError: model.lastError,
      totalRequests: model.totalRequests,
      totalTokens: model.totalTokens,
      lastUsedAt: model.lastUsedAt,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt
    };
  }
}
