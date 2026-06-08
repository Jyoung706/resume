export interface DatabaseClient {
  query(command: string, params?: any[]): Promise<any>;

  supportsTransaction(): boolean;

  isConnected(): boolean;
}
