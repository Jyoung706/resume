import { META_KEY_TYPE } from "./MetaKeys";

export type Constructor<T = {}> = new (...args: any[]) => T;

export interface BEAN_META_MAP {
  [key: number]: BEAN_META;
}

export interface BEAN_META {
  [key: string]: any;
  key: META_KEY_TYPE;
  propertyKey?: any;
  type?: any;
  target?: {
    name: string;
    index?: number;
  };
  injectTargets: META_INJECTOR[];
}

export interface META_INJECTOR {
  [key: string]: any;
  origin: any;
  runner?: Function;
}

export interface META_DI_RESOLVER {
  [key: string]: any;
  maxLength: number;
  metas: BEAN_META_MAP;
  argsGenerateFun(
    inputArgs: any[],
    outputArgs: any[],
    resolver: META_DI_RESOLVER
  ): Promise<any[]>;
}

export interface META_DI_RESOLVER_MAP {
  [key: string]: META_DI_RESOLVER;
  requestScope: META_DI_RESOLVER;
  singletonScope: META_DI_RESOLVER;
  newScope: META_DI_RESOLVER;
  session: META_DI_RESOLVER;
  file: META_DI_RESOLVER;
  request: META_DI_RESOLVER;
  response: META_DI_RESOLVER;
}
