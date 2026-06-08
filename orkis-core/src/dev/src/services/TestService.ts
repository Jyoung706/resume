import { Autowired, Service } from "../../../main/core";
import { TestDao } from "../daos/TestDao";

@Service()
export class TestService {
  @Autowired("TestDao")
  private testDao!: TestDao;

  async getAllUserInfo() {
    return await this.testDao.getAllUsers();
  }

  async createUser(user: { name: string; age: number }) {
    return await this.testDao.insertUser(user);
  }
}
