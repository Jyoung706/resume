import { Client, Pool, PoolClient, QueryResult } from "pg";
import { BaseAdapter } from "./BaseAdapter";
import { PostgreSQLClientConfig, PostgreSQLPoolConfig } from "../types";
import { systemLog } from "../../utils/Logger";

export class PostgreSQLAdapter extends BaseAdapter<
  Pool | Client,
  PostgreSQLPoolConfig | PostgreSQLClientConfig
> {
  /**
   * Pool 생성 및 초기화
   */
  async create(): Promise<void> {
    try {
      if (this.config.pool) {
        this.connectionInstance = new Pool(this.config);

        const client = await this.connectionInstance.connect();
        client.release();
      } else {
        this.connectionInstance = new Client(this.config);
        await this.connectionInstance.connect();
      }

      this._isConnected = true;
      systemLog.info(
        `PostgreSQL ${this.config.pool ? "Pool" : "Client"} created for ${this.config.host}:${this.config.port}`
      );
    } catch (error) {
      this._isConnected = false;
      this.handleError(error, "create pool");
    }
  }

  /**
   * Pool에서 클라이언트 연결 획득
   */
  async connect(): Promise<PoolClient | Client> {
    if (!this.connectionInstance) {
      throw new Error("Pool not created. Call create() first.");
    }

    if (this.connectionInstance instanceof Pool) {
      return await this.connectionInstance.connect();
    } else {
      this.connectionInstance.connect();
      return this.connectionInstance;
    }
  }

  /**
   * 클라이언트 연결을 Pool에 반환
   */
  async disconnect(client: PoolClient): Promise<void> {
    client.release();
    systemLog.debug(`[${this.adapterName}] Client connection released to pool`);
  }

  /**
   * Pool 종료
   */
  async destroy(): Promise<void> {
    if (this.connectionInstance) {
      await this.connectionInstance.end();
      this.connectionInstance = null;
    }
  }

  protected transformQuery(
    command: string,
    params?: any[]
  ): { command: string; params?: any[] } {
    let index = 0;
    const transformed = command.replace(/\?/g, () => `$${++index}`);
    return { command: transformed, params };
  }

  async query(
    command: string,
    params?: any[],
    client?: PoolClient | Client
  ): Promise<QueryResult> {
    if (!client) {
      throw new Error(
        `[${this.adapterName}] Client must be provided as third parameter.`
      );
    }

    try {
      const { command: transformedCommand, params: transformedParams } =
        this.transformQuery(command, params);
      const result = await client.query(transformedCommand, transformedParams);
      return result;
    } catch (error) {
      return this.handleError(error, "query");
    }
  }

  public supportsTransaction(): boolean {
    return true;
  }

  async beginTransaction(connection: PoolClient | Client): Promise<void> {
    await connection.query("BEGIN");
  }

  async commitTransaction(connection: PoolClient | Client): Promise<void> {
    await connection.query("COMMIT");
  }

  async rollbackTransaction(connection: PoolClient | Client): Promise<void> {
    await connection.query("ROLLBACK");
  }

  async releaseConnection(connection: PoolClient | Client): Promise<void> {
    if (!connection) return;

    if (this.connectionInstance instanceof Pool) {
      (connection as PoolClient).release();
      // systemLog.debug(`[${this.adapterName}] PoolClient released to pool`);
    } else {
      await (connection as Client).end();
      // systemLog.debug(`[${this.adapterName}] Client connection closed`);
    }
  }
}
