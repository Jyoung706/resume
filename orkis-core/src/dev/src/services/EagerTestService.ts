import { Autowired, Service, Transactional } from "../../../main/core";
import { MainDao } from "../daos/MainDao";
import { LogDao } from "../daos/LogDao";
import logger from "../../../main/utils";

@Transactional()
@Service()
export class EagerTestService {
  @Autowired("MainDao")
  private mainDao!: MainDao;

  @Autowired("LogDao")
  private logDao!: LogDao;

  // 케이스 1: MainDao만 사용 (log DB는 사용 안함)
  async onlyMainQuery() {
    logger.info("=== [EagerTestService] onlyMainQuery 시작 ===");
    const result = await this.mainDao.getUsers();
    logger.info("=== [EagerTestService] onlyMainQuery 종료 ===");
    return result;
  }

  // 케이스 2: LogDao만 사용 (main DB는 사용 안함)
  async onlyLogQuery() {
    logger.info("=== [EagerTestService] onlyLogQuery 시작 ===");
    const result = await this.logDao.getLogs();
    logger.info("=== [EagerTestService] onlyLogQuery 종료 ===");
    return result;
  }

  // 케이스 3: 둘 다 사용
  async bothQuery() {
    logger.info("=== [EagerTestService] bothQuery 시작 ===");
    const users = await this.mainDao.getUsers();
    const logs = await this.logDao.getLogs();
    logger.info("=== [EagerTestService] bothQuery 종료 ===");
    return { users, logs };
  }
}
