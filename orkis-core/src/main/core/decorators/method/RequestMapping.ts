import {
  REQUEST_MAPPING_META_KEY,
  REQUEST_METHOD,
  FILTER_TYPES,
  MONITOR_LOGGER_TYPES
} from "../../constants";
import { REQUEST_MAPPING_OPTIONS } from "../../../application/types";

// Get, Post 등에서 사용할 옵션 (route, method 제외)
export type RequestMappingOptions = Omit<REQUEST_MAPPING_OPTIONS, "route" | "method">;

function createRequestMapping(
  route: string,
  method: REQUEST_METHOD,
  options?: RequestMappingOptions
) {
  return function (
    target: any,
    propertyKey: string,
    _descriptor: PropertyDescriptor
  ) {
    const existingMappings =
      Reflect.getMetadata(REQUEST_MAPPING_META_KEY, target.constructor) || [];

    existingMappings.push({
      method: propertyKey,
      route,
      type: method,
      requestType: options?.requestType,
      filteredType: options?.filteredType ?? FILTER_TYPES.CHECK_SESSION,
      serviceLogType: options?.serviceLogType ?? MONITOR_LOGGER_TYPES.SELECT,
      multipartConfig: options?.multipartConfig
    });

    Reflect.defineMetadata(
      REQUEST_MAPPING_META_KEY,
      existingMappings,
      target.constructor
    );
  };
}

// 기존 방식 (하위 호환)
export function RequestMapping(config: REQUEST_MAPPING_OPTIONS) {
  return createRequestMapping(config.route, config.method ?? REQUEST_METHOD.POST, {
    requestType: config.requestType,
    filteredType: config.filteredType ?? FILTER_TYPES.CHECK_SESSION,
    serviceLogType: config.serviceLogType ?? MONITOR_LOGGER_TYPES.SELECT,
    multipartConfig: config.multipartConfig
  });
}

// 새로운 방식
export function Get(route: string, options?: RequestMappingOptions) {
  return createRequestMapping(route, REQUEST_METHOD.GET, options);
}

export function Post(route: string, options?: RequestMappingOptions) {
  return createRequestMapping(route, REQUEST_METHOD.POST, options);
}

export function Put(route: string, options?: RequestMappingOptions) {
  return createRequestMapping(route, REQUEST_METHOD.PUT, options);
}

export function Patch(route: string, options?: RequestMappingOptions) {
  return createRequestMapping(route, REQUEST_METHOD.PATCH, options);
}

export function Delete(route: string, options?: RequestMappingOptions) {
  return createRequestMapping(route, REQUEST_METHOD.DELETE, options);
}
