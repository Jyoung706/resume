import path from "path";
import { DatabaseConfig } from "../../main/core";
import { DatabaseType } from "../../main/database";

@DatabaseConfig({
  databaseName: "log",
  databaseType: DatabaseType.SQLITE,
  filePath: path.join(process.cwd(), "src", "dev", "db", "log.db")
})
export class SQLiteLogConfig {}
