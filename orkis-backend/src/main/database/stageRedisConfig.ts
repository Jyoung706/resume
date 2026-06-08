import { DatabaseConfig } from "@orkis/core/common";
import { DatabaseType } from "@orkis/core/database";

@DatabaseConfig({
  databaseName: "stageRedis",
  databaseType: DatabaseType.REDIS,
  host: process.env.REDIS_STAGE_HOST,
  port: parseInt(process.env.REDIS_STAGE_PORT || "6381"),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || "0"),
  maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || "3"),
  enableReadyCheck: process.env.REDIS_ENABLE_READY_CHECK !== "false",
  connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || "10000")
})
export class StageRedisConfig {}
