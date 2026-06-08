export const IF_POINT_CUT = {
  FILTER: 0,
  BEFORE: 1,
  AFTER: 2,
  EXCEPTION: 3
} as const;

export type IF_POINT_CUT = (typeof IF_POINT_CUT)[keyof typeof IF_POINT_CUT];

export const IF_MODULE_TYPE = {
  REQUEST: 0,
  SESSION: 1
} as const;

export type IF_MODULE_TYPE =
  (typeof IF_MODULE_TYPE)[keyof typeof IF_MODULE_TYPE];
