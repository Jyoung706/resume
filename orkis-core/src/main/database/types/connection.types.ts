import { BaseAdapter } from "../adapters";

export type ConnectionType = "wrapped" | "native";

export interface InjectConnectionOptions {
  dynamic?: boolean;
  type?: ConnectionType;
}

export interface ConnectionMetadata {
  propertyKey: string;
  datasourceName: string;
  options: InjectConnectionOptions;
  beanPropertyName?: string;
}

export interface ConnectionInfo<TConnection = any> {
  adapter: BaseAdapter;
  connection: TConnection;
  processId: string;
}

export interface ConnectionsMap extends Map<string, ConnectionInfo<any>> {}
