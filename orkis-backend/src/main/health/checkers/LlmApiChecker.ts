import { Autowired, Service } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { LLMConnectionService } from "../../llm/services/LLMConnectionService";

/**
 * rev7 wire 응답의 llm 도메인 liveness 부분 (HealthService 가 registry 와 합쳐 조립).
 *
 * - llmConnection: checkConnectionByModelId 결과 (true/false), 예외/타임아웃 시 null
 * - lastCheckedAt: 본 호출에서 ping 시작 시각 (ISO8601)
 */
export interface LlmCheckResult {
  llmConnection: boolean | null;
  lastCheckedAt: string;
}

/**
 * 선택된 LLM 모델 API 의 liveness 를 측정하는 얇은 래퍼.
 *
 * rev3 (2026-05-26) — backend pollCount throttle 도입:
 *   HealthService.composeLlmLiveness 가 pollCount % HEALTH_LLM_CHECK_EVERY_N === 0 또는
 *   forceCheck.llm === true 일 때만 본 check() 를 호출. 호출이 도달하면 매번 실제 API ping 수행.
 *   panel-decisions D2 (변형 A — "front 가 5번 중 1번 호출") 는 폐기됨.
 *
 * 비용 주의: Anthropic provider 의 경우 max_tokens=1 inference 호출이라 토큰 비용 발생.
 *           OpenAI provider 는 models.list() 라 무료. throttle 이 비용 보호의 핵심.
 *
 * 기존 LLMConnectionService.checkConnectionByModelId 를 재사용 (rev7 / refactor-plan 원칙: 재구현 금지).
 *
 * 참고:
 *   docs/2026-05-26/front-backend-healthcheck-policy-revision.md (rev3, D2/D4)
 *   docs/2026-05-19/healthCheck/health-check-plan.md (rev7, ## 서버 종류별 상태 정의 / llm)
 *   docs/2026-05-19/healthCheck/health-check-panel-decisions.md (2026-05-22, D2 = 변형 A — **폐기됨**)
 */
@Service("LlmApiChecker")
export class LlmApiChecker {
  @Autowired("LLMConnectionService")
  private llmConnectionService!: LLMConnectionService;

  async check(userId: string, modelId: string): Promise<LlmCheckResult> {
    const startedAt = new Date();
    try {
      const result = await this.llmConnectionService.checkConnectionByModelId(
        userId,
        modelId
      );
      return {
        llmConnection: result.success === true,
        lastCheckedAt: startedAt.toISOString()
      };
    } catch (err) {
      logger.error(
        `[LlmApiChecker] check failed (modelId=${modelId}, userId=${userId})`,
        err
      );
      return {
        llmConnection: null,
        lastCheckedAt: startedAt.toISOString()
      };
    }
  }
}
