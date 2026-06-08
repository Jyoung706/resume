export interface DBConnection {
  formatOption: any;
  connect(): Promise<any>;
  release(): void;
  beginTransaction(): Promise<any>;
  rollback(): Promise<any>;
  commit(): Promise<any>;
  selectNumber(
    queryId: string,
    param?: any,
    dynamicCondition?: any,
    commit?: boolean
  ): Promise<number>;
  selectString(
    queryId: string,
    param?: any,
    dynamicCondition?: any,
    commit?: boolean
  ): Promise<string>;
  row(
    queryId: string,
    param?: any,
    dynamicCondition?: any,
    commit?: boolean
  ): Promise<any>;
  query(
    queryId: string,
    param?: any,
    dynamicCondition?: any,
    commit?: boolean
  ): Promise<any>;
}
