import { RedisOptions } from "ioredis";
import { ConnectionConfig, PoolConfig as MariaDBPoolConfigBase } from "mariadb";
import { ClientConfig, PoolConfig } from "pg";
import { RedisClientOptions } from "redis";

export const DatabaseType = {
  FILE: "file",
  REDIS: "redis",
  SQLITE: "sqlite",
  POSTGRESQL: "postgresql",
  MARIADB: "mariadb",
  NEW_REDIS: "newRedis"
} as const;

export type DatabaseTypeValue =
  (typeof DatabaseType)[keyof typeof DatabaseType];

interface BaseDatabaseConfig {
  databaseName: string;
  databaseType: DatabaseTypeValue;
  metadata?: Record<string, any>;
}

export interface SQLiteDatabaseConfig extends BaseDatabaseConfig {
  databaseType: typeof DatabaseType.SQLITE;
  filePath: string;
}

export interface PostgreSQLPoolConfig extends BaseDatabaseConfig, PoolConfig {
  databaseType: typeof DatabaseType.POSTGRESQL;
  pool: true;
}

export interface PostgreSQLClientConfig
  extends BaseDatabaseConfig,
    ClientConfig {
  databaseType: typeof DatabaseType.POSTGRESQL;
  pool?: false;
}

export interface MariaDBPoolConfig
  extends BaseDatabaseConfig,
    MariaDBPoolConfigBase {
  databaseType: typeof DatabaseType.MARIADB;
  pool: true;
}

export interface MariaDBClientConfig
  extends BaseDatabaseConfig,
    ConnectionConfig {
  databaseType: typeof DatabaseType.MARIADB;
  pool?: false;
}

export interface FileDatabaseConfig extends BaseDatabaseConfig {
  databaseType: typeof DatabaseType.FILE;
  filePath: string;
  options: {
    encoding: BufferEncoding;
    extension: string;
  };
}

type RedisMetadataOptions = {
  type: "session" | "cache";
  prefix: string;
  ttl: number;
};

export interface RedisDatabaseConfig
  extends BaseDatabaseConfig,
    Omit<RedisOptions, "name"> {
  databaseType: typeof DatabaseType.REDIS;
}

export interface NewRedisDatabaseConfig
  extends BaseDatabaseConfig,
    Omit<RedisClientOptions, "name"> {
  databaseType: typeof DatabaseType.NEW_REDIS;
  metadata?: RedisMetadataOptions;
}

export type DatabaseConfig =
  | SQLiteDatabaseConfig
  | PostgreSQLPoolConfig
  | PostgreSQLClientConfig
  | MariaDBPoolConfig
  | MariaDBClientConfig
  | FileDatabaseConfig
  | RedisDatabaseConfig
  | NewRedisDatabaseConfig;

/**
 * 트랜잭션 전파 방식
 * - REQUIRED(기본값): 현재 트랜잭션이 존재하면 해당 트랜잭션에 참여하고, 없으면 새로운 트랜잭션을 생성합니다.
 * - REQUIRES_NEW: 항상 새로운 트랜잭션을 생성하며, 기존 트랜잭션이 존재하더라도 무시합니다.
 * - SUPPORTS: 현재 트랜잭션이 존재하면 해당 트랜잭션에 참여하고, 없으면 트랜잭션 없이 실행됩니다.
 */
const TRANSACTION_PROPAGATION = {
  REQUIRED: Symbol("REQUIRED"),
  REQUIRES_NEW: Symbol("REQUIRES_NEW"),
  SUPPORTS: Symbol("SUPPORTS")
} as const;

export const REQUIRED = TRANSACTION_PROPAGATION.REQUIRED;
export const REQUIRES_NEW = TRANSACTION_PROPAGATION.REQUIRES_NEW;
export const SUPPORTS = TRANSACTION_PROPAGATION.SUPPORTS;

export type TRANSACTION_PROPAGATION =
  (typeof TRANSACTION_PROPAGATION)[keyof typeof TRANSACTION_PROPAGATION];
