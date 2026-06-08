import {
  FILTER_TYPES,
  MONITOR_LOGGER_TYPES,
  REQUEST_METHOD,
  REQUEST_TYPE
} from "../../core/constants";
import { MultipartConfig } from "../../config/types";

export interface CONTROLLER_OPTION {
  path?: string;
  name?: string;
  description?: string;
}

export interface REQUEST_MAPPING_OPTIONS {
  route: string;
  method?: REQUEST_METHOD;
  filteredType?: FILTER_TYPES;
  requestType?: REQUEST_TYPE;
  multipartConfig?: MultipartConfig;
  serviceLogType?: MONITOR_LOGGER_TYPES;
}

export interface RequestMappingMeta {
  type: REQUEST_METHOD;
  route: string;
  method: string;
  requestType?: REQUEST_TYPE;
  multipartConfig?: MultipartConfig;
  filteredType: FILTER_TYPES;
  serviceLogType: MONITOR_LOGGER_TYPES;
  args?: any[];
}
