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

export const REQUEST_ARG_TYPE = {
  BODY: Symbol("BODY"),
  QUERY: Symbol("QUERY"),
  FILES: Symbol("FILE"),
  REQUEST_MAP: Symbol("REQUEST_MAP"),
  HEADERS: Symbol("HEADERS"),
  PARAM: Symbol("PARAM"),
  PART: Symbol("PART"),
  REQUEST: Symbol("REQUEST"),
  RESPONSE: Symbol("RESPONSE"),
  SESSION: Symbol("SESSION"),
  SSE: Symbol("SSE_CONNECTION")
} as const;

export type REQUEST_ARG_TYPE =
  (typeof REQUEST_ARG_TYPE)[keyof typeof REQUEST_ARG_TYPE];
