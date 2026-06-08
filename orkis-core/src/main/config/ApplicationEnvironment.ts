import dotenv from "dotenv";
import path from "path";
import fs from "fs-extra";
import { getSplittedEnv } from "../utils";
import { systemLog } from "../utils/Logger";

// Singleton 생성
export class ApplicationEnvironmentClass {
  private static instance: ApplicationEnvironmentClass;

  public __APPROOT: string = "";
  public __RESOURCEPATH: string = "";
  public __MODE?: string = "prod";
  public __PORT?: number | string;
  public __SOCKET_PATH?: string;

  private constructor() {}

  public static getInstance(): ApplicationEnvironmentClass {
    if (!ApplicationEnvironmentClass.instance) {
      ApplicationEnvironmentClass.instance = new ApplicationEnvironmentClass();
    }

    return ApplicationEnvironmentClass.instance;
  }

  public loadConfiguration(mode: string) {
    const modeValue = mode || this.__MODE || "prod";
    const projectRoot = this.findProjectRoot();

    this.__MODE = modeValue;
    this.__RESOURCEPATH = path.join(projectRoot, "resources");

    // env 파일 로드
    const envPath = path.join(this.__RESOURCEPATH, `${modeValue}.env`);

    if (fs.existsSync(envPath)) {
      try {
        this.loadEnvFile(envPath);
        systemLog.info(
          `[ApplicationEnvironment] Environment loaded: ${envPath}`
        );
      } catch (e) {
        systemLog.error(
          `[ApplicationEnvironment] Failed to load environment file: ${envPath}`,
          e
        );
      }
    } else {
      systemLog.warn(
        `[ApplicationEnvironment] Environment file not found: ${envPath} — proceeding without file (process.env will be used as-is)`
      );
    }

    // APPROOT: entry file의 디렉토리 (dev: src/, prod: lib/src/)
    this.__APPROOT = this.getEntryDirectory();

    this.validatePaths();
  }

  /**
   * 경로 검증
   */
  private validatePaths(): void {
    // APPROOT 필수
    if (!fs.existsSync(this.__APPROOT)) {
      throw new Error(`[FATAL] APPROOT does not exist: ${this.__APPROOT}`);
    }

    // RESOURCEPATH 선택 (없어도 경고만)
    if (!fs.existsSync(this.__RESOURCEPATH)) {
      systemLog.warn(
        `[ApplicationEnvironment] RESOURCEPATH does not exist: ${this.__RESOURCEPATH}`
      );
    }

    systemLog.info(`[ApplicationEnvironment] ✓ APPROOT: ${this.__APPROOT}`);
    systemLog.info(
      `[ApplicationEnvironment] ✓ RESOURCEPATH: ${this.__RESOURCEPATH}`
    );
  }

  private findProjectRoot(): string {
    return process.env.ORKIS_APP_ROOT || process.cwd();
  }

  public loadEnvFile(filePath: string) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Environment file [${filePath}] does not exist`);
    }

    const conf: any = dotenv.config({ path: filePath });
    if (conf.error) {
      throw conf.error;
    }

    let parsedResult = conf.parsed;
    let returnObj: any = {};

    Object.keys(parsedResult).forEach((key) => {
      let splittedKey = key.split(".");
      if (splittedKey.length > 1) {
        returnObj = getSplittedEnv(returnObj, splittedKey, parsedResult[key]);
      } else {
        returnObj[key] = parsedResult[key];
      }
    });

    return returnObj;
  }

  private getEntryDirectory(): string {
    // 환경변수 override
    if (process.env.ORKIS_APP_ROOT) {
      systemLog.info(
        `[ApplicationEnvironment] APPROOT from env: ${process.env.ORKIS_APP_ROOT}`
      );
      return process.env.ORKIS_APP_ROOT;
    }

    // entry file의 디렉토리 사용 (dev: src/, prod: lib/src/)
    const entryFile =
      process.argv[1] || require.main?.filename || module.filename;
    const entryDir = path.dirname(path.resolve(entryFile));

    systemLog.info(`[ApplicationEnvironment] APPROOT: ${entryDir}`);
    return entryDir;
  }
}

export const ApplicationEnvironment: ApplicationEnvironmentClass =
  ApplicationEnvironmentClass.getInstance();
