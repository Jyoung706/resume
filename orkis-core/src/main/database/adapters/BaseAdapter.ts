import { DatabaseConfig } from "../types";
import { systemLog } from "../../utils/Logger";
import { IDatabaseConnection } from "../interfaces/IDatabaseConnection";

export abstract class BaseAdapter<
  TConnection = any,
  TConfig extends DatabaseConfig = DatabaseConfig
> implements IDatabaseConnection<TConnection> {
  protected _isConnected: boolean = false;
  protected connectionInstance: TConnection | null = null;
  protected adapterName: string;
  protected metadata: Record<string, any> = {};

  constructor(protected config: TConfig) {
    this.adapterName = `${config.databaseName || "default"}`;

    if (config.metadata) {
      this.metadata = config.metadata;
    }
  }

  public getMetadata(): Record<string, any> {
    return this.metadata;
  }

  // Pool/Connection 생성
  abstract create(): Promise<void>;

  // 개별 클라이언트 획득/반환 (선택적)
  abstract connect(): Promise<any>;
  abstract disconnect(client?: any): Promise<void>;

  // 전체 연결 종료
  abstract destroy?(): Promise<void>;

  abstract query(command: string, params?: any[], client?: any): Promise<any>;

  /**
   * SQL 파라미터 바인딩을 엔진 네이티브 문법으로 변환.
   * orkis-core 정규 문법: ? (positional)
   * 기본 동작: pass-through (SQLite, MySQL 등 ?를 네이티브로 사용하는 엔진)
   */
  protected transformQuery(
    command: string,
    params?: any[]
  ): { command: string; params?: any[] } {
    return { command, params };
  }

  public supportsTransaction(): boolean {
    return false;
  }

  public getAdapterName(): string {
    return this.adapterName;
  }

  async beginTransaction(connection: any): Promise<void> {}
  async commitTransaction(connection: any): Promise<void> {}
  async rollbackTransaction(connection: any): Promise<void> {}
  async releaseConnection(connection: any): Promise<void> {}

  isConnected(): boolean {
    return this._isConnected;
  }

  getConnectionInstance(): TConnection {
    if (!this.connectionInstance) {
      throw new Error("Connection not initialized.");
    }

    return this.connectionInstance;
  }

  async getConnection() {
    return await this.connect();
  }

  protected handleError(error: any, context?: string): never {
    systemLog.error(
      `[${this.config.databaseType}] Error in ${context || "Database Operation"}:`,
      error
    );
    throw error;
  }
}
