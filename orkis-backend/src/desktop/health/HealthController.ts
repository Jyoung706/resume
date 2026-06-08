import {
  Autowired,
  Body,
  Controller,
  RequestMapping,
  Res,
  Session,
  FILTER_TYPES,
  REQUEST_METHOD
} from "@orkis/core/common";
import type { Response as expressResponse } from "@orkis/core/application";
import logger from "@orkis/core/utils";
import { DbConnectionChecker } from "./DbConnectionChecker";

/**
 * Health Check Controller (desktop override)
 *
 * cloud HealthController 의 `GET /health` 만 desktop 으로 복원한다.
 * cloud 의 `POST /health/status`(rev7 wire — server_health PG 테이블 + DbConnectionChecker +
 * LlmApiChecker + throttle/drift)는 desktop 에서 제공하지 않는다.
 *
 * desktop 의 헬스 아이콘 데이터 소스:
 *   - RAG  : podman 컨테이너(backend/ai) HEALTHCHECK → service:status IPC → serviceHealthStore
 *   - 모델 : 선택 모델의 apiKeyMasked 등록 여부 (useLlmModelStore)
 *   - DB   : POST /health/db-check → DbConnectionChecker (prepareDynamicDBConnection + isConnected)
 *
 * cloud `src/main/health/**` 는 tsconfig 에서 통째 exclude (server_health/PG 의존 격리).
 */
@Controller({ path: "/health" })
export class HealthController {
  @Autowired("DbConnectionChecker")
  private dbConnectionChecker!: DbConnectionChecker;

  // podman HEALTHCHECK 가 호출 (Dockerfile.desktop: GET /health → status<500 이면 healthy)
  @RequestMapping({
    route: "",
    method: REQUEST_METHOD.GET,
    filteredType: FILTER_TYPES.NONE
  })
  async healthCheck(@Res() res: expressResponse) {
    const healthInfo = {
      success: true,
      data: {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        },
        nodeVersion: process.version,
        platform: process.platform
      }
    };

    res.status(200).json(healthInfo);
  }

  /**
   * DB liveness 체크 (desktop) — 선택된 connection 에 orkis-core 동적 연결을 establish 하고
   * BaseAdapter.isConnected() 결과를 반환. 응답은 framework 가 StandardResponse 로 wrap.
   *
   * Body: { connectionId: number }
   */
  @RequestMapping({ route: "/db-check", method: REQUEST_METHOD.POST })
  async dbCheck(
    @Body() body: { connectionId?: number | string } | undefined,
    @Session() session: any
  ) {
    const userId: string = session?.login_info?.ID;
    if (!userId) {
      throw new Error("인증되지 않은 사용자입니다.");
    }

    const connectionId = Number(body?.connectionId);
    if (!Number.isFinite(connectionId)) {
      throw new Error("connectionId 가 필요합니다.");
    }

    try {
      return await this.dbConnectionChecker.check(userId, connectionId);
    } catch (error) {
      logger.error("[HealthController] dbCheck 에러:", error);
      throw error;
    }
  }
}
