/**
 * 로거 유틸리티
 * erasableSyntaxOnly 제약으로 enum 대신 const object 사용
 */
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

interface LoggerConfig {
  minLevel: LogLevel;
  enableTimestamp: boolean;
  enableContext: boolean;
}

const isProduction =
  typeof import.meta !== "undefined"
    ? import.meta.env?.PROD === true
    : false;

const defaultConfig: LoggerConfig = {
  minLevel: isProduction ? LogLevel.WARN : LogLevel.DEBUG,
  enableTimestamp: true,
  enableContext: true,
};

class Logger {
  private context: string;
  private config: LoggerConfig;

  constructor(context: string, config: Partial<LoggerConfig> = {}) {
    this.context = context;
    this.config = { ...defaultConfig, ...config };
  }

  private formatMessage(level: string, message: string): string {
    const parts: string[] = [];
    if (this.config.enableTimestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }
    parts.push(`[${level}]`);
    if (this.config.enableContext) {
      parts.push(`[${this.context}]`);
    }
    parts.push(message);
    return parts.join(" ");
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.minLevel;
  }

  debug(message: string, data?: unknown): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    const formatted = this.formatMessage("DEBUG", message);
    if (data !== undefined) console.debug(formatted, data);
    else console.debug(formatted);
  }

  info(message: string, data?: unknown): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const formatted = this.formatMessage("INFO", message);
    if (data !== undefined) console.info(formatted, data);
    else console.info(formatted);
  }

  warn(message: string, data?: unknown): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const formatted = this.formatMessage("WARN", message);
    if (data !== undefined) console.warn(formatted, data);
    else console.warn(formatted);
  }

  error(message: string, data?: unknown): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    const formatted = this.formatMessage("ERROR", message);
    if (data !== undefined) console.error(formatted, data);
    else console.error(formatted);
  }
}

export function getLogger(
  context: string,
  config?: Partial<LoggerConfig>,
): Logger {
  return new Logger(context, config);
}
