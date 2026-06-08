export const APPLICATION_TYPE = {
  EXPRESS_SERVER: 0,
  ELECTRON: 1
} as const;

export type APPLICATION_TYPE =
  (typeof APPLICATION_TYPE)[keyof typeof APPLICATION_TYPE];

export const PARSE_TYPE = {
  JSON: "json",
  XML: "xml"
} as const;

export type PARSE_TYPE = (typeof PARSE_TYPE)[keyof typeof PARSE_TYPE];

export const CONFIG_TYPE = {
  EXPRESS_SERVER: 0,
  ELECTRON: 1
} as const;

export type CONFIG_TYPE = (typeof CONFIG_TYPE)[keyof typeof CONFIG_TYPE];

// export type IF_POINT_CUT = "ALL"|"BEFORE"|"AFTER"|"ROUTE"|"EXCEPTION";
export const IF_POINT_CUT = {
  FILTER: 0,
  // ROUTE: 1,
  BEFORE: 1,
  AFTER: 2,
  OUT: 3,
  EXCEPTION: 4
} as const;

export type IF_POINT_CUT = (typeof IF_POINT_CUT)[keyof typeof IF_POINT_CUT];

// export type IF_MODULE_TYPE = "REQUEST"|"SESSION";
export const IF_MODULE_TYPE = {
  REQUEST: 0,
  SESSION: 1
} as const;

export type IF_MODULE_TYPE =
  (typeof IF_MODULE_TYPE)[keyof typeof IF_MODULE_TYPE];

export const REQUEST_TYPE = {
  DEFAULT: 0,
  UPLOAD: 1,
  DOWNLOAD: 2,
  SSE: 3
} as const;

export type REQUEST_TYPE = (typeof REQUEST_TYPE)[keyof typeof REQUEST_TYPE];

export const REQUEST_METHOD = {
  GET: 0,
  POST: 1,
  PUT: 2,
  PATCH: 3,
  DELETE: 4
} as const;

export type REQUEST_METHOD =
  (typeof REQUEST_METHOD)[keyof typeof REQUEST_METHOD];

export const FILTER_TYPES = {
  CHECK_SESSION: 0,
  NONE: 1
} as const;

export type FILTER_TYPES = (typeof FILTER_TYPES)[keyof typeof FILTER_TYPES];

export const MONITOR_LOGGER_TYPES = {
  SELECT: 0,
  INSERT: 1,
  UPDATE: 2,
  PROCESS: 3
} as const;

export type MONITOR_LOGGER_TYPES =
  (typeof MONITOR_LOGGER_TYPES)[keyof typeof MONITOR_LOGGER_TYPES];

export const REQUEST_ARG_TYPE = {
  BODY: Symbol("BODY"),
  QUERY: Symbol("QUERY"),
  FILE: Symbol("FILE"),
  REQUEST_MAP: Symbol("REQUEST_MAP"),
  HEADER: Symbol("HEADER"),
  PARAM: Symbol("PARAM"),
  PART: Symbol("PART"),
  REQUEST: Symbol("REQUEST"),
  RESPONSE: Symbol("RESPONSE"),
  SESSION: Symbol("SESSION"),
  SSE: Symbol("SSE_CONNECTION")
} as const;

export type REQUEST_ARG_TYPE =
  (typeof REQUEST_ARG_TYPE)[keyof typeof REQUEST_ARG_TYPE];

export const CORE_CONF = {
  APP_ROOT: "/src",
  CORE_MODULE_ROOT: "/lib/main",
  SERVER_MODULE_ROOT: "/src/main",
  RESOURCES_PATH: "/resources"
} as const;

export type CORE_CONF = (typeof CORE_CONF)[keyof typeof CORE_CONF];

export const LOG_LEVEL = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
} as const;

export type LOG_LEVEL = (typeof LOG_LEVEL)[keyof typeof LOG_LEVEL];

export const LOG_LEVEL_NAMES = {
  [LOG_LEVEL.ERROR]: "ERROR",
  [LOG_LEVEL.WARN]: "WARN",
  [LOG_LEVEL.INFO]: "INFO",
  [LOG_LEVEL.DEBUG]: "DEBUG"
} as const;
