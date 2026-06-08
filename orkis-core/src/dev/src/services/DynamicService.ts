import path from "path";
import { Autowired, Service, Transactional } from "../../../main/core";
import {
  DynamicConnectionSupport,
  SQLiteDatabaseConfig
} from "../../../main/database";
import { DynamicDao } from "../daos/DynamicDao";

@Transactional()
@Service()
export class DynamicService extends DynamicConnectionSupport {
  @Autowired("DynamicDao")
  private dynamicDao!: DynamicDao;

  async getUserInfo(userId: string) {
    const userDbConfig = this.dynamicDao.getUserDBConfig(userId);

    const dbConfig: SQLiteDatabaseConfig = {
      databaseName: "dynamic",
      databaseType: "sqlite",
      filePath: path.join(
        process.cwd(),
        "src",
        "dev",
        "db",
        userDbConfig.filePath
      )
    };

    await this.prepareDynamicDBConnection(dbConfig);

    return await this.dynamicDao.execute("SELECT * FROM users");
  }
}
