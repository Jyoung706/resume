import { Dao, InjectConnection } from "../../../main/core";

@Dao()
export class UserQueryDao {
  @InjectConnection("user_db", { dynamic: true })
  private userDb!: any;

  async execute(sql: string, params?: any[]) {
    return await this.userDb.query(sql, params);
  }
}
