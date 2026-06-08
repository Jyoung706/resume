export interface PROPERTY_META_INTERFACE<T> {
  target: any;
  name: string;
  args: T;
}

export interface DatabaseMetaInterface {
  propertyName: string;
  databaseName: string;
}
