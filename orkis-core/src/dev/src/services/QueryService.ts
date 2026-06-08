import { Autowired, Service, Transactional } from "../../../main/core";
import {
  DatabaseType,
  DynamicConnectionSupport,
  MariaDBClientConfig
} from "../../../main/database";
import { UserConnectionDao } from "../daos/UserConnectionDao";
import { UserQueryDao } from "../daos/UserQueryDao";

@Service()
export class QueryService extends DynamicConnectionSupport {
  @Autowired("UserConnectionDao")
  private userConnectionDao!: UserConnectionDao;

  @Autowired("UserQueryDao")
  private userQueryDao!: UserQueryDao;

  // @Transactional 은 DynamicConnectionSupport 사용 조건. propagation 기본(REQUIRED).
  // 동적 연결은 매 요청마다 createConnection → query → end 의 단발성 흐름.
  @Transactional()
  async runUserQuery(userId: number, sql: string, params?: any[]) {
    const userConn = await this.userConnectionDao.findConnectionByUserId(
      userId
    );
    if (!userConn) {
      throw new Error(`No DB connection registered for userId=${userId}`);
    }
    if (userConn.db_type !== "mariadb") {
      throw new Error(`Unsupported db_type: ${userConn.db_type}`);
    }

    const dbConfig: MariaDBClientConfig = {
      databaseName: "user_db",
      databaseType: DatabaseType.MARIADB,
      host: userConn.host,
      port: userConn.port,
      database: userConn.database_name,
      user: userConn.db_user,
      password: userConn.db_password,
      connectTimeout: 5000
    };

    await this.prepareDynamicDBConnection(dbConfig);

    const result = await this.userQueryDao.execute(sql, params);

    return {
      target: {
        host: userConn.host,
        port: userConn.port,
        database: userConn.database_name
      },
      rowCount: result.rowCount,
      rows: result.rows,
      ...(result.lastInsertRowid !== undefined && {
        lastInsertRowid: result.lastInsertRowid
      })
    };
  }
}
