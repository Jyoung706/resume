import { Dao, InjectConnection } from "@orkis/core/common";
import { Pool } from "pg";
import type {
  LLMProviderEntity,
  LLMAvailableModelEntity
} from "@orkis-interface/backend";

@Dao("LLMProviderDao")
export class LLMProviderDao {
  @InjectConnection("main")
  private db!: Pool;

  async findAllProviders(): Promise<LLMProviderEntity[]> {
    const query = `
      SELECT
        provider_id as "providerId",
        provider_name as "providerName",
        website,
        api_docs as "apiDocs",
        logo_filename as "logoFilename",
        is_available as "isAvailable",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM llm_provider
      ORDER BY provider_id
    `;

    const result = await this.db.query(query);
    return result.rows;
  }

  async findModelsByProviderId(
    providerId: number
  ): Promise<LLMAvailableModelEntity[]> {
    const query = `
      SELECT
        model_id as "modelId",
        provider_id as "providerId",
        model_name as "modelName",
        model_identifier as "modelIdentifier",
        version,
        context_window as "contextWindow",
        max_output_tokens as "maxOutputTokens",
        capabilities,
        pricing_input as "pricingInput",
        pricing_output as "pricingOutput",
        license,
        architecture,
        release_date as "releaseDate",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM llm_available_models
      WHERE provider_id = $1 AND is_active = true
      ORDER BY model_id
    `;

    const result = await this.db.query(query, [providerId]);
    return result.rows;
  }

  async findAllActiveModels(): Promise<LLMAvailableModelEntity[]> {
    const query = `
      SELECT
        model_id as "modelId",
        provider_id as "providerId",
        model_name as "modelName",
        model_identifier as "modelIdentifier",
        version,
        context_window as "contextWindow",
        max_output_tokens as "maxOutputTokens",
        capabilities,
        pricing_input as "pricingInput",
        pricing_output as "pricingOutput",
        license,
        architecture,
        release_date as "releaseDate",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM llm_available_models
      WHERE is_active = true
      ORDER BY provider_id, model_id
    `;

    const result = await this.db.query(query);
    return result.rows;
  }
}
