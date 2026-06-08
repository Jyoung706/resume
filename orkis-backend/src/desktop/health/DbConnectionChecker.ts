import {
  Autowired,
  Service,
  Transactional,
  InjectConnection
} from "@orkis/core/common";
import { DynamicConnectionSupport, DatabaseType } from "@orkis/core/database";
import type { DatabaseConfig } from "@orkis/core/database";
import logger from "@orkis/core/utils";
import { DbConnectionService } from "@/db-connection/DbConnectionService";
import { DbTypeDao } from "@/db-connection/DbTypeDao";

/**
 * cloud health/DbConnectionChecker 의 desktop 재작성 (cloud 동명 @Service 대체).
 *
 * cloud  : DbConnectionService.testDbConnection 위임 → 매 호출 raw `new Pool` + `SELECT version()`.
 * desktop: orkis-core 동적 연결(prepareDynamicDBConnection)로 사용자 DB 에 lazy 연결 후
 *          BaseAdapter.isConnected() 로 판정. SELECT 쿼리는 보내지 않고 connection establish 까지만.
 *
 * DynamicConnectionSupport 를 extends 한 "자기 자신" 클래스에서 prepareDynamicDBConnection 을
 * 호출하면, @InjectConnection("dynamic", { dynamic:true }) 로 선언한 자기 인스턴스 변수
 * dynamicConn 에 wrappedAdapter 가 주입된다. 근거(검증 완료):
 *   - BeanResolver.collectMappingsRecursive 가 "현재 Bean 직접 프로퍼티"는 beanPropertyName
 *     없이 수집(중첩 @Autowired 빈만 prefix 부여).
 *   - createPrepareDynamicDBConnection 은 beanPropertyName 없으면 targetBean = beanClone(자기 자신)
 *     → this.dynamicConn = wrappedAdapter.
 * @Transactional 은 DynamicConnectionSupport extends 시 필수(BeanResolver 가 강제 throw).
 */

export interface DbCheckResult {
  connection: boolean | null;
  lastCheckedAt: string;
}

/** 주입되는 wrappedAdapter 의 최소 형태 (BaseAdapter.isConnected 상속). */
interface DynamicAdapterLike {
  isConnected(): boolean;
}

@Service("DbConnectionChecker")
export class DbConnectionChecker extends DynamicConnectionSupport {
  @Autowired("DbConnectionService")
  private dbConnectionService!: DbConnectionService;

  @Autowired("DbTypeDao")
  private dbTypeDao!: DbTypeDao;

  // 자기 자신에 주입(directMapping). prepareDynamicDBConnection 호출 후 wrappedAdapter 가 채워진다.
  @InjectConnection("dynamic", { dynamic: true })
  private dynamicConn!: DynamicAdapterLike;

  // @Transactional 은 메서드 레벨에만 부여한다. 클래스 레벨에 두면 buildConfig 같은 동기 헬퍼
  // 메서드까지 async 트랜잭션 래퍼로 감싸져(BeanResolver.wrapTransactionalMethods), await 누락 시
  // config 가 Promise 로 새어 databaseType=undefined 가 된다. 메서드 레벨이면 buildConfig 는 동기 유지.
  // (checkHasTransactional 가 메서드 데코도 인정하므로 DynamicConnectionSupport 검증도 통과)
  @Transactional()
  async check(userId: string, connectionId: number): Promise<DbCheckResult> {
    const startedAt = new Date();
    try {
      // 복호화된 연결 정보 (host/port/databaseName/username/password/filePath/dbTypeId)
      const conn = await this.dbConnectionService.getDbConnectionDetail(
        connectionId,
        userId
      );
      const dbType = await this.dbTypeDao.findById(conn.dbTypeId);
      const config = this.buildConfig(dbType?.typeName, conn);

      // 사용자 DB 에 실제 연결 (실패 시 throw). SELECT 1 미전송 — connection establish 까지만.
      await this.prepareDynamicDBConnection(config);

      const connected = this.dynamicConn.isConnected();
      // PoC 검증용 로그 — isConnected 결과 확인.
      console.log(
        `[DbConnectionChecker] connectionId=${connectionId} isConnected=${connected}`
      );

      return { connection: connected, lastCheckedAt: startedAt.toISOString() };
    } catch (err) {
      logger.error(
        `[DbConnectionChecker] check failed (connectionId=${connectionId}, userId=${userId})`,
        err
      );
      console.log(
        `[DbConnectionChecker] connectionId=${connectionId} isConnected=false (error)`
      );
      return { connection: false, lastCheckedAt: startedAt.toISOString() };
    }
  }

  /**
   * 등록 정보 → orkis-core DatabaseConfig. dbType.typeName 은 "PostgreSQL" / "SQLite".
   * prepareDynamicDBConnection 이 내부에서 pool:false 를 강제하므로 PG 는 Client 로 연결한다.
   * PG 는 pg ClientConfig 필드(host/port/database/user/password)를 사용한다.
   */
  private buildConfig(
    typeName: string | undefined,
    conn: any
  ): DatabaseConfig {
    if (typeName === "SQLite") {
      return {
        databaseType: DatabaseType.SQLITE,
        databaseName: conn.databaseName,
        filePath: conn.filePath
      } as DatabaseConfig;
    }

    // PostgreSQL (기본)
    return {
      databaseType: DatabaseType.POSTGRESQL,
      databaseName: conn.databaseName,
      host: conn.host,
      port: conn.port,
      database: conn.databaseName,
      user: conn.username,
      password: conn.password
    } as DatabaseConfig;
  }
}
