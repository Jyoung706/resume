export const MONITOR_LOGGER_TYPES = {
  SELECT: 0,
  INSERT: 1,
  UPDATE: 2,
  PROCESS: 3
} as const;

export type MONITOR_LOGGER_TYPES =
  (typeof MONITOR_LOGGER_TYPES)[keyof typeof MONITOR_LOGGER_TYPES];

export const LOG_LEVEL = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
} as const;

export type LogLevelInput =
  | LOG_LEVEL // 0, 1, 2, 3
  | "error"
  | "warn"
  | "info"
  | "debug" // 문자열 (소문자)
  | "ERROR"
  | "WARN"
  | "INFO"
  | "DEBUG"; // 문자열 (대문자)

export type LOG_LEVEL = (typeof LOG_LEVEL)[keyof typeof LOG_LEVEL];

export const LOG_LEVEL_NAMES = {
  [LOG_LEVEL.ERROR]: "error",
  [LOG_LEVEL.WARN]: "warn",
  [LOG_LEVEL.INFO]: "info",
  [LOG_LEVEL.DEBUG]: "debug"
} as const;
