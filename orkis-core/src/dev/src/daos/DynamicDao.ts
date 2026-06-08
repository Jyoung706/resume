import { Dao, InjectConnection } from "../../../main/core";

@Dao()
export class DynamicDao {
  @InjectConnection("dynamic", { dynamic: true })
  private dynamicConn!: any;

  private userDummy: Record<
    string,
    { databaseType: string; filePath: string }
  > = {
    "1": {
      databaseType: "sqlite",
      filePath: "test.db"
    },
    "2": {
      databaseType: "sqlite",
      filePath: "test2.db"
    }
  };

  getUserDBConfig(userId: string) {
    return this.userDummy[userId];
  }

  async execute(query: string, params?: string[]) {
    return await this.dynamicConn.query(query, params);
  }
}
