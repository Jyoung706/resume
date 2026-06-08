import { DatabaseConfig } from "../../main/core";
import { DatabaseType } from "../../main/database";

@DatabaseConfig({
  databaseName: "main",
  databaseType: DatabaseType.POSTGRESQL,
  pool: true,
  host: process.env.POSTGRES_HOST || "localhost",
  port: parseInt(process.env.POSTGRES_PORT || "5432"),
  database: process.env.POSTGRES_DB || "orkis_main",
  user: process.env.POSTGRES_USER || "orkis",
  password: process.env.POSTGRES_PASSWORD || "orkis_pass",
  max: 10
})
export class PostgresConfig {}
