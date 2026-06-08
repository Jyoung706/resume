export const APPLICATION_TYPE = {
  EXPRESS_SERVER: 0,
  ELECTRON: 1
} as const;

export type APPLICATION_TYPE =
  (typeof APPLICATION_TYPE)[keyof typeof APPLICATION_TYPE];

export const CONFIG_TYPE = {
  EXPRESS_SERVER: 0,
  ELECTRON: 1
} as const;

export type CONFIG_TYPE = (typeof CONFIG_TYPE)[keyof typeof CONFIG_TYPE];

export const PARSE_TYPE = {
  JSON: "json",
  XML: "xml"
} as const;

export type PARSE_TYPE = (typeof PARSE_TYPE)[keyof typeof PARSE_TYPE];
