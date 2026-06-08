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
  password: process.env.POSTGRES_PASSWORD || "",
  min: 1,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: false
})
export class PostgresConfig {}
