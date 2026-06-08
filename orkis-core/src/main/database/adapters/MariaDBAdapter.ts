import mariadb, { Connection, Pool, PoolConnection, UpsertResult } from "mariadb";
import { BaseAdapter } from "./BaseAdapter";
import { MariaDBClientConfig, MariaDBPoolConfig } from "../types";
import { systemLog } from "../../utils/Logger";

type MariaDBClient = PoolConnection | Connection;

export class MariaDBAdapter extends BaseAdapter<
  Pool | Connection,
  MariaDBPoolConfig | MariaDBClientConfig
> {
  async create(): Promise<void> {
    try {
      // BIGINT/COUNT 결과가 BigInt 로 반환되어 JSON.stringify 실패하는 문제 방지.
      // 사용자가 명시적으로 지정한 값이 있으면 그것을 우선한다.
      const driverConfig = {
        bigIntAsNumber: true,
        insertIdAsNumber: true,
        decimalAsNumber: false,
        ...this.config
      };

      if (this.config.pool) {
        this.connectionInstance = mariadb.createPool(driverConfig);

        const conn = await (this.connectionInstance as Pool).getConnection();
        conn.release();
      } else {
        this.connectionInstance = await mariadb.createConnection(driverConfig);
      }

      this._isConnected = true;
      systemLog.info(
        `MariaDB ${this.config.pool ? "Pool" : "Client"} created for ${this.config.host}:${this.config.port}`
      );
    } catch (error) {
      this._isConnected = false;
      this.handleError(error, "create pool");
    }
  }

  async connect(): Promise<MariaDBClient> {
    if (!this.connectionInstance) {
      throw new Error("MariaDB not initialized. Call create() first.");
    }

    if (this.config.pool) {
      return await (this.connectionInstance as Pool).getConnection();
    }
    return this.connectionInstance as Connection;
  }

  async disconnect(client: MariaDBClient): Promise<void> {
    if (this.config.pool) {
      await (client as PoolConnection).release();
      systemLog.debug(`[${this.adapterName}] Connection released to pool`);
    }
  }

  async destroy(): Promise<void> {
    if (this.connectionInstance) {
      if (this.config.pool) {
        await (this.connectionInstance as Pool).end();
      } else {
        await (this.connectionInstance as Connection).end();
      }
      this.connectionInstance = null;
      this._isConnected = false;
    }
  }

  async query(
    command: string,
    params?: any[],
    client?: MariaDBClient
  ): Promise<any> {
    if (!client) {
      throw new Error(
        `[${this.adapterName}] Client must be provided as third parameter.`
      );
    }

    try {
      const { command: transformedCommand, params: transformedParams } =
        this.transformQuery(command, params);

      const result = await client.query(transformedCommand, transformedParams);

      if (Array.isArray(result)) {
        return { rows: result, rowCount: result.length };
      }

      const upsert = result as UpsertResult;
      return {
        rows: [],
        rowCount: Number(upsert.affectedRows ?? 0),
        lastInsertRowid: this.normalizeInsertId(upsert.insertId)
      };
    } catch (error) {
      return this.handleError(error, "query");
    }
  }

  public supportsTransaction(): boolean {
    return true;
  }

  async beginTransaction(connection: MariaDBClient): Promise<void> {
    await connection.beginTransaction();
  }

  async commitTransaction(connection: MariaDBClient): Promise<void> {
    await connection.commit();
  }

  async rollbackTransaction(connection: MariaDBClient): Promise<void> {
    await connection.rollback();
  }

  async releaseConnection(connection: MariaDBClient): Promise<void> {
    if (!connection) return;

    if (this.config.pool) {
      await (connection as PoolConnection).release();
    } else {
      await (connection as Connection).end();
    }
  }

  private normalizeInsertId(insertId: any): number | bigint | undefined {
    if (insertId === undefined || insertId === null) return undefined;
    if (typeof insertId === "bigint") {
      return insertId <= BigInt(Number.MAX_SAFE_INTEGER)
        ? Number(insertId)
        : insertId;
    }
    return insertId;
  }
}
