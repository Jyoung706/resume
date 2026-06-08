import { DatabaseConfig } from "@orkis/core/common";
import { DatabaseType } from "@orkis/core/database";

@DatabaseConfig({
  databaseName: "sessionRedis",
  databaseType: DatabaseType.NEW_REDIS,
  socket: {
    host: process.env.REDIS_SESSION_HOST,
    port: parseInt(process.env.REDIS_SESSION_PORT || "6379"),
    reconnectStrategy: (retries) => {
      const maxRetries = parseInt(process.env.REDIS_MAX_RETIRES || "3");
      if (retries > maxRetries) {
        throw new Error("Max retries exceeded");
      }
      // 지수 백오프 : 50ms, 100ms, 150ms... 최대 2초
      return Math.min(retries * 50, 2000);
    },
    keepAlive: true,
    connectTimeout: 5000
  },
  database: parseInt(process.env.REDIS_DB || "0"),
  password: process.env.REDIS_PASSWORD,

  pingInterval: 60000,
  metadata: {
    type: "session",
    prefix: "orkis:session:",
    ttl: parseInt(process.env.TOKEN_TTL || "3600")
  }
})
export class SessionRedisConfig {}
