import Redis, { Redis as RedisClient } from "ioredis";
import { BaseAdapter } from "./BaseAdapter";
import { systemLog } from "../../utils/Logger";
import { RedisDatabaseConfig } from "../types";

export class RedisAdapter extends BaseAdapter<
  RedisClient,
  RedisDatabaseConfig
> {
  async create(): Promise<void> {
    try {
      this.connectionInstance = new Redis(this.config);

      this.connectionInstance.on("connect", () => {
        systemLog.info("Redis connecting...");
      });

      this.connectionInstance.on("ready", () => {
        this._isConnected = true;
        systemLog.info(
          `Redis connected to ${this.config.host}:${this.config.port}`
        );
      });

      this.connectionInstance.on("error", (error) => {
        systemLog.error("Redis Client Error: ", error);
      });

      await this.connectionInstance.ping();
      this._isConnected = true;
    } catch (error) {
      this.handleError(error, "connect");
    }
  }

  async connect(): Promise<Redis> {
    if (!this.connectionInstance) {
      throw new Error("Redis client not created, Call create() first.");
    }
    return this.connectionInstance;
  }

  async disconnect(): Promise<void> {
    try {
      if (this.connectionInstance) {
        await this.connectionInstance.quit();
        this.connectionInstance = null;
      }
      this._isConnected = false;
      systemLog.info("Redis disconnected");
    } catch (error) {
      this.handleError(error, "disconnect");
    }
  }

  async destroy(): Promise<void> {
    try {
      if (this.connectionInstance) {
        await this.connectionInstance.quit();
        this.connectionInstance = null;
      }
    } catch (error) {
      this.handleError(error, "destroy");
    }
  }

  async query(command: string, params?: any[]): Promise<any> {
    if (!this.connectionInstance) {
      throw new Error("Database not connected");
    }

    try {
      // redis 명령어 파싱
      const [operation, ...args] = command.trim().split(/\s+/);
      const upperOp = operation.toUpperCase();

      // 파라미터가 있ㄷ으면 args에 추가
      if (params && params.length > 0) {
        args.push(...params.map((p) => String(p)));
      }

      const result = await this.executeCommand(upperOp, args);
      return this.formatResult(upperOp, result);
    } catch (error) {
      this.handleError(error, "query");
    }
  }

  public supportsTransaction(): boolean {
    return false;
  }

  private async executeCommand(
    operation: string,
    args: string[]
  ): Promise<any> {
    const client = this.connectionInstance;

    try {
      if (client) {
        switch (operation) {
          // String operations
          case "GET":
            return await client.get(args[0]);
          case "SET":
            if (args[2]) {
              return await client.set(
                args[0],
                args[1],
                "EX",
                parseInt(args[2])
              );
            }
            return await client.set(args[0], args[1]);
          case "DEL":
            return await client.del(...args);
          case "EXISTS":
            return await client.exists(...args);
          case "EXPIRE":
            return await client.expire(args[0], parseInt(args[1]));
          case "TTL":
            return await client.ttl(args[0]);
          case "MGET":
            return await client.mget(...args);
          case "MSET":
            return await client.mset(...args);

          // Hash operations
          case "HGET":
            return await client.hget(args[0], args[1]);
          case "HSET":
            return await client.hset(args[0], args[1], args[2]);
          case "HGETALL":
            return await client.hgetall(args[0]);
          case "HDEL":
            return await client.hdel(args[0], ...args.slice(1));
          case "HMGET":
            return await client.hmget(args[0], ...args.slice(1));
          case "HMSET":
            return await client.hmset(args[0], ...args.slice(1));

          // List operations
          case "LPUSH":
            return await client.lpush(args[0], ...args.slice(1));
          case "RPUSH":
            return await client.rpush(args[0], ...args.slice(1));
          case "LPOP":
            return await client.lpop(args[0]);
          case "RPOP":
            return await client.rpop(args[0]);
          case "LRANGE":
            return await client.lrange(
              args[0],
              parseInt(args[1]),
              parseInt(args[2])
            );
          case "LLEN":
            return await client.llen(args[0]);

          // Set operations
          case "SADD":
            return await client.sadd(args[0], ...args.slice(1));
          case "SMEMBERS":
            return await client.smembers(args[0]);
          case "SREM":
            return await client.srem(args[0], ...args.slice(1));
          case "SISMEMBER":
            return await client.sismember(args[0], args[1]);

          // Sorted Set operations
          case "ZADD":
            return await client.zadd(args[0], ...args.slice(1));
          case "ZRANGE":
            return await client.zrange(
              args[0],
              parseInt(args[1]),
              parseInt(args[2])
            );
          case "ZREM":
            return await client.zrem(args[0], ...args.slice(1));
          case "ZSCORE":
            return await client.zscore(args[0], args[1]);

          // Key operations
          case "KEYS":
            return await client.keys(args[0] || "*");
          case "SCAN":
            const cursor = args[0] || "0";
            const options: any = {};
            if (args[1]) options.match = args[1];
            if (args[2]) options.count = parseInt(args[2]);
            return await client.scan(cursor, options);
          case "TYPE":
            return await client.type(args[0]);

          // Pub/Sub
          case "PUBLISH":
            return await client.publish(args[0], args[1]);

          default:
            return await client.call(operation.toLowerCase(), ...args);
        }
      }
    } catch (error) {
      this.handleError(error, "execute query");
    }
  }

  private tryParseJson(value: any): any {
    if (value == null || typeof value !== "string") {
      return value;
    }

    if (value === "") {
      return value;
    }

    const trimmed = value.trim();
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        return JSON.parse(trimmed);
      } catch (error) {
        systemLog.debug(
          `JSON parse failed for value: ${value.substring(0, 50)}...`
        );
        return value;
      }
    }

    return value;
  }

  private formatResult(operation: string, result: any): any {
    const queryOps = {
      withJsonParsing: [
        "GET",
        "MGET",
        "HGET",
        "HMGET",
        "HGETALL",
        "LRANGE",
        "LPOP",
        "RPOP"
      ],
      withoutParsing: ["KEYS", "SMEMBERS", "ZRANGE", "SCAN"]
    };

    const modifyOps = [
      "SET",
      "HSET",
      "DEL",
      "LPUSH",
      "RPUSH",
      "SADD",
      "SREM",
      "ZADD",
      "ZREM",
      "MSET",
      "HMSET",
      "HDEL"
    ];

    if (operation === "HGETALL" && result) {
      const rows = Object.entries(result).map(([key, value]) => ({
        key,
        value: this.tryParseJson(value)
      }));
      return { rows, rowCount: rows.length };
    }

    if (queryOps.withJsonParsing.includes(operation)) {
      const parsed = this.parseResultWithJson(result);
      return {
        rows: parsed.filter((r) => r !== null),
        rowCount: parsed.length
      };
    }

    if (queryOps.withoutParsing.includes(operation)) {
      const rows = Array.isArray(result) ? result : [result];
      return {
        rows: rows.filter((r) => r !== null),
        rowCount: rows.length
      };
    }

    if (modifyOps.includes(operation)) {
      return {
        rows: [],
        rowCount: typeof result === "number" ? result : result === "OK" ? 1 : 0
      };
    }

    if (typeof result === "number") {
      return { rows: [result], rowCount: 1 };
    }

    return { rows: [result], rowCount: 1 };
  }

  private parseResultWithJson(result: any): any[] {
    if (result == null) return [];

    if (Array.isArray(result)) {
      return result.map((v) => this.tryParseJson(v));
    }

    return [this.tryParseJson(result)];
  }
}
