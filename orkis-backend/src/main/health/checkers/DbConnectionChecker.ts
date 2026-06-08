import { Autowired, Service } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { DbConnectionService } from "../../db-connection/DbConnectionService";

/**
 * rev7 wire 응답의 db 도메인 부분 (HealthService 가 source/cached 등 추가 조립 시 사용).
 *
 * - connection: testDbConnection 결과 (true/false), 예외/타임아웃 시 null
 * - lastCheckedAt: 본 호출에서 ping 시작 시각 (ISO8601)
 */
export interface DbCheckResult {
  connection: boolean | null;
  lastCheckedAt: string;
}

/**
 * 선택된 DB 커넥션의 liveness 를 측정하는 얇은 래퍼.
 *
 * rev3 (2026-05-26) — backend pollCount throttle 도입:
 *   HealthService.composeDb 가 pollCount % HEALTH_DB_CHECK_EVERY_N === 0 또는
 *   forceCheck.db === true 일 때만 본 check() 를 호출. 호출이 도달하면 매번 실제 ping 수행.
 *   panel-decisions D2 (변형 A — "front 가 5번 중 1번 호출") 는 폐기됨.
 *
 * 기존 DbConnectionService.testDbConnection 을 재사용 (rev7 / refactor-plan 원칙: 재구현 금지).
 * testDbConnection 내부는 매 호출마다 새 Pool 생성/종료 — 무겁지만 throttle 이 빈도를 보호.
 * (별도 후속 PR — core 어댑터 활용 리팩토링 권장: docs/2026-05-26/front-backend-healthcheck-policy-revision.md §10.2)
 *
 * 참고:
 *   docs/2026-05-26/front-backend-healthcheck-policy-revision.md (rev3, D2/D4)
 *   docs/2026-05-19/healthCheck/health-check-plan.md (rev7, ## 서버 종류별 상태 정의 / db)
 *   docs/2026-05-19/healthCheck/health-check-panel-decisions.md (2026-05-22, D2 = 변형 A — **폐기됨**)
 */
@Service("DbConnectionChecker")
export class DbConnectionChecker {
  @Autowired("DbConnectionService")
  private dbConnectionService!: DbConnectionService;

  async check(userId: string, connectionId: number): Promise<DbCheckResult> {
    const startedAt = new Date();
    try {
      const result = await this.dbConnectionService.testDbConnection(userId, {
        connectionId
      });
      return {
        connection: result.success === true,
        lastCheckedAt: startedAt.toISOString()
      };
    } catch (err) {
      logger.error(
        `[DbConnectionChecker] check failed (connectionId=${connectionId}, userId=${userId})`,
        err
      );
      return {
        connection: null,
        lastCheckedAt: startedAt.toISOString()
      };
    }
  }
}
