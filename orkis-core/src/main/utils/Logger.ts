import { LOG_LEVEL, LogLevelInput } from "../core/constants";
import chalk, { Chalk } from "chalk";
import DateUtil from "./DateUtil";

interface LogConfig {
  level: LOG_LEVEL;
  label: string;
  color: Chalk;
  labelColor: Chalk;
}

export class Logger {
  private static applicationLogLevel: LOG_LEVEL | null = null;

  public static setApplicationLogLevel(level: LogLevelInput): void {
    if (typeof level === "number") {
      Logger.applicationLogLevel = level;
    } else {
      const key = level.toUpperCase() as keyof typeof LOG_LEVEL;
      Logger.applicationLogLevel = LOG_LEVEL[key];
    }
  }

  private get currentLogLevel(): LOG_LEVEL {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    if (
      envLevel &&
      LOG_LEVEL[envLevel as keyof typeof LOG_LEVEL] !== undefined
    ) {
      return LOG_LEVEL[envLevel as keyof typeof LOG_LEVEL];
    }

    if (Logger.applicationLogLevel !== null) {
      return Logger.applicationLogLevel;
    }

    return LOG_LEVEL.INFO;
  }

  private readonly logConfigs: Record<string, LogConfig> = {
    error: {
      level: LOG_LEVEL.ERROR,
      label: "ERROR",
      color: chalk.red,
      labelColor: chalk.bgRed.white.bold
    },
    warn: {
      level: LOG_LEVEL.WARN,
      label: "WARN",
      color: chalk.yellow,
      labelColor: chalk.bgYellow.white.bold
    },
    info: {
      level: LOG_LEVEL.INFO,
      label: "INFO",
      color: chalk.white,
      labelColor: chalk.green.bold
    },
    debug: {
      level: LOG_LEVEL.DEBUG,
      label: "DEBUG",
      color: chalk.cyan,
      labelColor: chalk.cyan.bold
    }
  };

  private formatValue(value: any, color: Chalk): string {
    if (typeof value === "string") {
      return color(value);
    } else if (value instanceof Error) {
      return color(value.stack || value.toString());
    } else {
      try {
        const json = JSON.stringify(value, null, 2);
        return color(json);
      } catch (e) {
        return color(require("util").inspect(value));
      }
    }
  }

  private log(configKey: keyof typeof this.logConfigs, ...args: any[]) {
    const config = this.logConfigs[configKey];

    if (this.currentLogLevel >= config.level) {
      const timestamp = `[${DateUtil.getCurrentDateTime()}]`;

      const prefix = `${config.labelColor(config.label)} ${chalk.dim(timestamp)}`;

      if (args.length === 0) {
        console.log(prefix);
        return;
      }

      const formattedArgs = args.map((arg) =>
        this.formatValue(arg, config.color)
      );

      console.log(prefix, ...formattedArgs);
    }
  }

  private createLogMethod(configKey: keyof typeof this.logConfigs) {
    return (...args: any[]) => this.log(configKey, ...args);
  }

  public error = this.createLogMethod("error");
  public warn = this.createLogMethod("warn");
  public info = this.createLogMethod("info");
  public debug = this.createLogMethod("debug");
}

const logger = new Logger();
export default logger;

const printsystemLog = (label: string, args: any[]): void => {
  const timestamp = `[${DateUtil.getCurrentDateTime()}]`;
  const prefix = `${chalk.magenta.bold(label)} ${chalk.dim(timestamp)}`;

  if (args.length === 0) {
    console.log(prefix);
    return;
  }

  const formattedArgs = args.map((arg) => {
    if (typeof arg === "string") return chalk.bold.white(arg);
    if (arg instanceof Error)
      return chalk.bold.white(arg.stack || arg.toString());
    try {
      return chalk.bold.white(JSON.stringify(arg, null, 2));
    } catch {
      return chalk.bold.white(require("util").inspect(arg));
    }
  });

  console.log(prefix, ...formattedArgs);
};

/**
 * 코어 내부 전용 시스템 로그 (항상 출력, 로그 레벨 무시)
 */
export const systemLog = {
  debug: (...args: any[]): void => printsystemLog("SYSTEM:DEBUG", args),
  info: (...args: any[]): void => printsystemLog("SYSTEM", args),
  warn: (...args: any[]): void => printsystemLog("SYSTEM:WARN", args),
  error: (...args: any[]): void => printsystemLog("SYSTEM:ERROR", args)
};
