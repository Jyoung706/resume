import { DatabaseConfig } from "../types";
import { systemLog } from "../../utils/Logger";
import { BaseAdapter } from "../adapters";
import { DatabaseFactory } from "./DatabaseFactory";
import { writeCrashLog } from "../../utils/crashLog";

type ConnectionName = string;
// Singleton 생성
export class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager;

  private connections: Map<ConnectionName, BaseAdapter> = new Map();

  private constructor() {}

  public static getInstance(): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager();
    }
    return DatabaseConnectionManager.instance;
  }

  async initialize(config: DatabaseConfig): Promise<BaseAdapter> {
    const existingConnection = this.connections.get(config.databaseName);
    if (existingConnection && existingConnection.isConnected()) {
      return existingConnection;
    }

    const adapter = DatabaseFactory.createAdapter(config);

    try {
      await adapter.create();
      this.connections.set(config.databaseName, adapter);
      systemLog.info(`Database connected: ${config.databaseName}`);
      return adapter;
    } catch (error) {
      const logPath = writeCrashLog(
        `Database connection failed: ${config.databaseName}`,
        error
      );
      systemLog.error(`[FATAL] Log saved to : ${logPath}`);
      process.exit(1);
    }
  }

  getAdapter<T extends BaseAdapter = BaseAdapter>(name: string = "main"): T {
    const connection = this.connections.get(name);
    if (!connection) {
      throw new Error(`Database connection not initialized: ${name}`);
    }
    return connection as T;
  }

  getConnectionInstance<T = any>(name: string = "main"): T {
    return this.getAdapter(name).getConnectionInstance() as T;
  }

  getConnection<T = any>(name: string = "main"): T {
    return this.getAdapter(name).getConnection() as T;
  }

  async close(name: string): Promise<void> {
    const connection = this.connections.get(name);
    if (connection && connection.isConnected()) {
      if (connection.destroy) {
        await connection.destroy();
      }
      this.connections.delete(name);
      systemLog.info(`Database connection closed: ${name}`);
    }
  }

  async closeAll(): Promise<void> {
    systemLog.info(`Closing all database connections...`);

    const promises: Promise<void>[] = [];

    for (const [name, connection] of this.connections) {
      const destroyPromise = connection.destroy
        ? connection.destroy()
        : Promise.resolve();

      promises.push(
        destroyPromise
          .then(() => systemLog.info(`Closed connection: ${name}`))
          .catch((error) =>
            systemLog.error(`Error closing connection ${name}:`, error)
          )
      );
    }

    await Promise.all(promises);
    this.connections.clear();
    systemLog.info(`All database connections closed.`);
  }

  getConnectionStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};

    for (const [name, connection] of this.connections) {
      status[name] = connection.isConnected();
    }

    return status;
  }

  getActiveConnections(): string[] {
    return Array.from(this.connections.keys()).filter((name) =>
      this.connections.get(name)?.isConnected()
    );
  }

  public getAllConnections(): Map<string, BaseAdapter> {
    return this.connections;
  }

  public findAdapterByMetadata(
    predicate: (metadata: Record<string, any>) => boolean
  ) {
    for (const connection of this.connections.values()) {
      const adapter = connection;
      if (typeof adapter.getMetadata === "function") {
        const metadata = adapter.getMetadata();
        if (predicate(metadata)) {
          return connection;
        }
      }
    }
    return null;
  }
}
