import { DatabaseConfig, DatabaseType } from "../types";
import {
  BaseAdapter,
  FileAdapter,
  MariaDBAdapter,
  NewRedisAdapter,
  PostgreSQLAdapter,
  RedisAdapter,
  SQLiteAdapter
} from "../adapters";

export class DatabaseFactory {
  static createAdapter(config: DatabaseConfig): BaseAdapter {
    const { databaseType } = config;
    switch (databaseType) {
      case DatabaseType.POSTGRESQL:
        return new PostgreSQLAdapter(config);
      case DatabaseType.MARIADB:
        return new MariaDBAdapter(config);
      case DatabaseType.REDIS:
        return new RedisAdapter(config);
      case DatabaseType.SQLITE:
        return new SQLiteAdapter(config);
      case DatabaseType.FILE:
        return new FileAdapter(config);
      case DatabaseType.NEW_REDIS:
        return new NewRedisAdapter(config);

      default:
        const exhaustiveCheck: never = databaseType;
        throw new Error(`Unsupported database type: ${exhaustiveCheck}`);
    }
  }
}
