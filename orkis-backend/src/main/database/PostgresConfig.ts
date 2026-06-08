import { DatabaseConfig } from "@orkis/core/common";
import { DatabaseType } from "@orkis/core/database";

@DatabaseConfig({
  databaseName: "main",
  databaseType: DatabaseType.POSTGRESQL,
  pool: true,
  host: process.env.POSTGRES_HOST || "localhost",
  port: parseInt(process.env.POSTGRES_PORT || "5432"),
  database: process.env.POSTGRES_DB_NAME || "orkisdb",
  user: process.env.POSTGRES_USER || "postgres",
  password: process.env.POSTGRES_PASSWORD || "password",
  min: 5,                        // 12 pods × 5 = 60 initial connections
  max: 45,                       // 12 pods × 45 = 540 max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: false
})
export class PostgresConfig {}
