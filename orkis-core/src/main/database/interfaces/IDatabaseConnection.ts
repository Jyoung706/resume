export interface IDatabaseConnection<TConnection = any> {
  create(): Promise<void>;
  destroy?(): Promise<void>;
  isConnected(): boolean;

  connect(): Promise<any>;
  disconnect(client?: any): Promise<void>;

  getConnectionInstance(): TConnection;
  getConnection(): any;

  query(command: string, params?: any[], client?: any): Promise<any>;
  supportsTransaction(): boolean;

  // 트랜잭션 관리 메서드
  beginTransaction(connection: any): Promise<void>;
  commitTransaction(connection: any): Promise<void>;
  rollbackTransaction(connection: any): Promise<void>;
  releaseConnection(connection: any): Promise<void>;
}
