import { APPLICATION_TYPE, CONFIG_TYPE } from "../constants/coreConst";
import { IF_MODULE_TYPE, IF_POINT_CUT } from "../constants/interceptorConst";
import { SCOPE_TYPES } from "../constants/beanConst";
import { LogMiddlewareOptions } from "../../application/types/logMiddleware.types";
import { LogLevelInput } from "../constants";
import { HttpModuleOptions } from "../../utils";
import type { CorsOptions } from "cors";

export { SCOPE_TYPES };
export type SCOPE_TYPE = (typeof SCOPE_TYPES)[keyof typeof SCOPE_TYPES];

export interface COMPONENT_SCAN_FILTER {
  path: string;
  filter?: string;
}

export interface APPLICATION_OPTION {
  type?: APPLICATION_TYPE;
  componentScan?: COMPONENT_SCAN_FILTER[];
  requestLogging?: boolean | LogMiddlewareOptions;
  logLevel?: LogLevelInput;
  httpModule?: HttpModuleOptions;
  scanCoreExtensions?: boolean;
  cors?: boolean | CorsOptions;
}

export interface CONFIG_OPTION {
  type: CONFIG_TYPE;
}

export interface BEAN_OPTION {
  [key: string]: string | any;
  SCOPE?: SCOPE_TYPE;
  SUBTYPE?: string;
  MODULE_NAME?: string;
}

export interface INTERCEPTOR_OPTION extends BEAN_OPTION {
  [key: string]: string | number | any;
  MODULE_TYPE?: IF_MODULE_TYPE;
  PATH?: string[];
  EXCLUDE?: string[];
  USE?: boolean;
  POINT_CUT?: IF_POINT_CUT;
  PRIORITY?: number;
}

export interface SCAN_TYPE {
  CLASS: any;
  PATH: string;
  SCAN_RESULT: any;
  BEAN?: any;
  OPTION?: BEAN_OPTION;
}
