import { Union } from "../../common/types";
import { MultipartConfig } from "../../application/types";
import {
  APPLICATION_TYPE,
  CONFIG_TYPE,
  FILTER_TYPES,
  IF_MODULE_TYPE,
  IF_POINT_CUT,
  MONITOR_LOGGER_TYPES,
  REQUEST_METHOD,
  REQUEST_TYPE
} from "../constants/enums";

export const SCOPE_TYPES = Object.freeze({
  REQUEST_SCOPE: Symbol(0),
  SINGLETON_SCOPE: Symbol(1),
  PROTOTYPE_SCOPE: Symbol(2)
});

export type SCOPE_TYPE = Union<typeof SCOPE_TYPES>;

export interface COMPONENT_SCAN_FILTER {
  path: string;
  filter?: string;
}

export interface APPLICATION_OPTION {
  type: APPLICATION_TYPE;
  componentScan?: COMPONENT_SCAN_FILTER[];
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
  USE?: boolean;
  POINT_CUT?: IF_POINT_CUT;
  PRIORITY?: number;
}

export const REQUEST_CONTEXT_SYMBOL: unique symbol = Symbol(
  "REQUEST_CONTEXT_SYMBOL"
); // Private symbol to avoid pollution
export interface REQUEST_CONTEXT_INTERFACE {
  id: number;
  request: any;
  response: any;
  packet: any;
}

export interface PACKET {
  [key: string]: any;
  header: {
    transDate: string;
    resultCode: string;
    resultMsg: string;
  };
  body: {
    request: any;
    response: any;
  };
}

export interface RequestMappingMeta {
  type: REQUEST_METHOD;
  route: string;
  method: string;
  requestType?: REQUEST_TYPE;
  multipartConfig?: MultipartConfig;
  filteredType: FILTER_TYPES;
  serviceLogType: MONITOR_LOGGER_TYPES;
  arges?: any[];
}

export interface SCAN_TYPE {
  CLASS: any;
  PATH: string;
  SCAN_RESULT: any;
  BEAN?: any;
  OPTION?: BEAN_OPTION;
}
