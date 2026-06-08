import path from "path";
import { DatabaseConfig } from "../../main/core";
import { DatabaseType } from "../../main/database";

@DatabaseConfig({
  databaseName: "sqlite",
  databaseType: DatabaseType.SQLITE,
  filePath:
    process.env.SQLITE_DB_PATH ||
    path.join(process.cwd(), "share", "orkis.sqlite")
})
export class SQLiteConfig {}
