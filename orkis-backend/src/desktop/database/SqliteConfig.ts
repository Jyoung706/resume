import { DatabaseConfig } from "@orkis/core/common";
import { DatabaseType, DatabaseConnectionManager } from "@orkis/core/database";
import logger from "@orkis/core/utils";
import path from "path";
import fs from "fs";

const dataRoot = process.env.DATA_PATH || process.cwd();
const sqliteDir = path.resolve(dataRoot, "db");
if (!fs.existsSync(sqliteDir)) {
  fs.mkdirSync(sqliteDir, { recursive: true });
}

@DatabaseConfig({
  databaseName: "main",
  databaseType: DatabaseType.SQLITE,
  filePath: path.join(sqliteDir, "orkis.sqlite")
})
export class SqliteConfig {}

/**
 * SQLite 스키마 초기화.
 * Application.onAfterInitialize()에서 호출.
 */
export async function initializeSchema(): Promise<void> {
  try {
    const db: any =
      DatabaseConnectionManager.getInstance().getConnectionInstance("main");

    const checkResult = await db.allAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_versions'"
    );
    if (checkResult && checkResult.length > 0) {
      logger.info("[SqliteConfig] Schema already initialized, skipping.");
      return;
    }

    const initSqlPath = path.resolve(
      process.cwd(),
      "resources/systemdbfile/init.sql"
    );
    if (!fs.existsSync(initSqlPath)) {
      logger.warn(`[SqliteConfig] init.sql not found at ${initSqlPath}`);
      return;
    }

    const initSql = fs.readFileSync(initSqlPath, "utf-8");
    await db.execAsync(initSql);
    logger.info("[SqliteConfig] Schema initialized from init.sql");
  } catch (error) {
    logger.error("[SqliteConfig] Schema initialization failed:", error);
    throw error;
  }
}
