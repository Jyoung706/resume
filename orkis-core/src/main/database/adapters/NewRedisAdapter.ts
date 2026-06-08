import { createClient } from "redis";
import { BaseAdapter } from "./BaseAdapter";
import { NewRedisDatabaseConfig } from "../types";
import { systemLog } from "../../utils/Logger";

export class NewRedisAdapter extends BaseAdapter<
  ReturnType<typeof createClient>,
  NewRedisDatabaseConfig
> {
  async create(): Promise<void> {
    try {
      this.connectionInstance = createClient(this.config);

      this.connectionInstance.on("connect", () => {
        systemLog.info("New Redis connection...");
      });

      this.connectionInstance.on("ready", () => {
        this._isConnected = true;
        systemLog.info(`New Redis connected to ${this.getConnectionInfo()}`);
      });

      this.connectionInstance.on("error", (error) => {
        systemLog.error("New Redis Client Error: ", error);
      });

      await this.connectionInstance.connect();
      await this.connectionInstance.ping();
      this._isConnected = true;
    } catch (err) {
      this.handleError(err, "connect");
    }
  }

  async connect(): Promise<any> {
    if (!this.connectionInstance) {
      throw new Error("New Redis client not created, Call created() first.");
    }
    return this.connectionInstance;
  }

  async disconnect(): Promise<void> {
    try {
      if (this.connectionInstance) {
        // 기다렸다가 커맨드 수행 후 연결 종료
        await this.connectionInstance.close();
        this.connectionInstance = null;
      }
      this._isConnected = false;
      systemLog.info("New Redis disconnected");
    } catch (error) {
      this.handleError(error, "disconect");
    }
  }
  async destroy?(): Promise<void> {
    try {
      if (this.connectionInstance) {
        // 커맨드 모두 거절하고 강제 종료
        this.connectionInstance.destroy();
        this.connectionInstance = null;
        this._isConnected = false;
      }
    } catch (error) {
      this.handleError(error, "destroy");
    }
  }
  query(command: string, params?: any[], client?: any): Promise<any> {
    throw new Error("Method not implemented.");
  }

  private getConnectionInfo() {
    if (this.config.url) {
      return this.config.url;
    }

    if (this.config.socket) {
      const socket = this.config.socket as any;
      if (socket.host) {
        return `${socket.host}:${socket.port || 6379}`;
      }
    }

    return "unknown host";
  }
}
