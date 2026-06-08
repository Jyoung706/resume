import {
  APPLICATION_OPTION,
  BEAN,
  BEAN_SCAN_TYPE,
  BeanMetadata,
  BEANS,
  SCOPE_TYPES
} from "../types";
import {
  BEAN_SCAN_TYPES,
  BEAN_STATES,
  DATABASE_CONFIGS_REGISTRY_KEY
} from "../constants";
import { COMPONENT_SCAN_BEAN_META_KEY } from "../constants/internalKeys";
import { DatabaseConnectionManager } from "../../database";
import { BeanResolver } from "./BeanResolver";
import { systemLog } from "../../utils/Logger";
import { ApplicationEnvironment } from "../../config";
import ComponentScan from "./ComponentScan";
import path from "path";
import * as fs from "fs-extra";

// Singleton 생성
export class ApplicationContextClass {
  private static instance: ApplicationContextClass;
  private application?: BEAN;

  private constructor(
    private databaseManager: DatabaseConnectionManager = DatabaseConnectionManager.getInstance(),
    private beanResolver = new BeanResolver(this),
    public beans: BEANS = {}
  ) {}

  public static getInstance(): ApplicationContextClass {
    if (!ApplicationContextClass.instance) {
      ApplicationContextClass.instance = new ApplicationContextClass();
    }

    return ApplicationContextClass.instance;
  }

  public async initialize() {
    await this.initializeCore();
  }

  private getCoreExtensionsPath(): string | null {
    const isDevelopment =
      ApplicationEnvironment.__MODE !== "prod" ||
      process.env.NODE_ENV !== "prod";

    if (isDevelopment) {
      const localPath = path.resolve(process.cwd(), "src/main/extensions");
      if (fs.existsSync(localPath)) {
        return localPath;
      }
    }

    try {
      const corePath = require.resolve("@orkis/core");
      const coreDir = path.dirname(corePath);
      const extensionsPath = path.join(coreDir, "extensions");

      if (fs.existsSync(extensionsPath)) {
        return extensionsPath;
      }
    } catch {
      return null;
    }

    return null;
  }

  private shouldScanCoreExtensions(appOption?: APPLICATION_OPTION): boolean {
    const envValue = process.env.ORKIS_SCAN_CORE_EXTENSIONS;
    if (envValue !== undefined) {
      return envValue.toLowerCase() !== "false";
    }

    if (appOption?.scanCoreExtensions !== undefined) {
      return appOption.scanCoreExtensions;
    }

    return true;
  }

  private getApplicationOptionFromMetadata(): APPLICATION_OPTION | undefined {
    const applications = this.getScanBeans(
      BEAN_SCAN_TYPES.APPLICATION,
      true
    ) as BEAN[];
    if (applications && applications.length > 0) {
      return applications[0].option as APPLICATION_OPTION;
    }
    return undefined;
  }

  private async initializeCore(): Promise<void> {
    this.addBean({
      name: "ApplicationContext",
      state: BEAN_STATES.SINGLETON_GENERATED,
      target: {
        name: "ApplicationContext",
        origin: this.constructor,
        instance: this
      },
      scanType: BEAN_SCAN_TYPES.APPLICATION_CONTEXT,
      scope: SCOPE_TYPES.SINGLETON_SCOPE
    });

    systemLog.info("--- Bootstrapping ---");

    // [1/5] Configuration
    systemLog.info("[1/5] Loading configuration...");

    // [2/5] Component Scan
    systemLog.info("[2/5] Scanning components...");
    await this.scanBeans();
    this.logScannedBeans();

    // [3/5] Database
    systemLog.info("[3/5] Initializing database connections...");
    await this.initializeDatabaseConfig();

    // [4/5] Bean Initialization
    systemLog.info("[4/5] Initializing beans...");
    this.initializeBeans();

    // [5/5] Application
    systemLog.info("[5/5] Preparing application...");
    let applications = this.getScanBeans(
      BEAN_SCAN_TYPES.APPLICATION,
      true
    ) as BEAN[];

    if (!applications || applications.length < 1) {
      systemLog.error("There is no Application added");
      process.exit(0);
    }
    if (applications.length != 1) {
      systemLog.error("Application should be single");
      process.exit(0);
    }

    this.application = applications[0];

    this.beanResolver.resolveBean(this.application.name);
  }

  private logScannedBeans(): void {
    const counts = {
      controller: 0,
      service: 0,
      dao: 0,
      others: 0
    };

    for (const beanName of Object.keys(this.beans)) {
      const bean = this.beans[beanName];
      const type = bean?.scanType?.description;

      if (type === "CONTROLLER") counts.controller++;
      else if (type === "SERVICE") counts.service++;
      else if (type === "DAO") counts.dao++;
      else counts.others++;
    }

    const total = Object.keys(this.beans).length;
    systemLog.info(
      `      -> Found ${total} beans (${counts.controller} Controllers, ${counts.service} Services, ${counts.dao} DAOs, ${counts.others} Others)`
    );
  }

  private initializeBeans(): void {
    const beanNames = Object.keys(this.beans);
    let initializedCount = 0;

    for (const beanName of beanNames) {
      const bean = this.beans[beanName];

      if (
        bean?.scope === SCOPE_TYPES.SINGLETON_SCOPE &&
        bean.scanType?.description !== "APPLICATION"
      ) {
        try {
          this.beanResolver.resolveBean(beanName);
          initializedCount++;
        } catch (error) {
          systemLog.error(`Failed to initialize bean: ${beanName}`, error);
          throw error;
        }
      }
    }

    systemLog.info(`      -> ${initializedCount} singleton beans initialized`);
  }

  private registerBeansFromClasses(classes: any[]): void {
    for (const cls of classes) {
      if (!Reflect.hasMetadata(COMPONENT_SCAN_BEAN_META_KEY, cls)) continue;

      const metadata: BeanMetadata = Reflect.getMetadata(
        COMPONENT_SCAN_BEAN_META_KEY,
        cls
      );

      if (this.beans[metadata.name]) continue;

      this.beans[metadata.name] = {
        name: metadata.name,
        state: BEAN_STATES.SCAN_SUCCEED,
        target: {
          name: metadata.name,
          origin: cls
        },
        scanType: metadata.scanType,
        scope: metadata.scope,
        option: metadata.option
      };
    }
  }

  public run(args?: string[]) {
    const appInstance = this.getBean(this.application!.name);
    if (!appInstance) {
      systemLog.error("Application instance not found");
      process.exit(1);
    }
    appInstance.run(args);
  }

  private async initializeDatabaseConfig(): Promise<void> {
    const configs = Reflect.getMetadata(DATABASE_CONFIGS_REGISTRY_KEY, global);

    if (!configs || configs.length === 0) {
      systemLog.info("      -> No database configurations found");
      return;
    }

    // 보안 데이터베이스 관련 키 메타데이터에서 삭제
    Reflect.deleteMetadata(DATABASE_CONFIGS_REGISTRY_KEY, global);

    if (!this.databaseManager) {
      systemLog.error("Failed to get DatabaseConnectionManager bean");
      return;
    }

    for (const config of configs) {
      try {
        if (config.autoConnect !== false) {
          await this.databaseManager.initialize(config);
          systemLog.info(
            `      -> Connected: ${config.databaseName} (${config.databaseType})`
          );
        } else {
          systemLog.info(
            `      -> Skipped: ${config.databaseName} (autoConnect: false)`
          );
        }
      } catch (error) {
        systemLog.error(
          `Failed to initialize database ${config.databaseName}`,
          error
        );
      }
    }
  }

  public async scanBeans(...args: string[]) {
    const scanPathArr: string[] = [ApplicationEnvironment.__APPROOT, ...args];

    const backendClasses = await ComponentScan.scan(scanPathArr);

    this.registerBeansFromClasses(backendClasses);

    const appOption = this.getApplicationOptionFromMetadata();

    if (this.shouldScanCoreExtensions(appOption)) {
      const coreExtPath = this.getCoreExtensionsPath();
      if (coreExtPath) {
        const coreClasses = await ComponentScan.scan([coreExtPath]);
        this.registerBeansFromClasses(coreClasses);
        systemLog.info(`Core extensions scanned successfully`);
      } else {
        systemLog.info(`Core extensions path not found`);
      }
    } else {
      systemLog.info("Core extensions scan disabled");
    }
  }

  public addBean(bean: BEAN) {
    if (this.beans[bean.name]) {
      throw new Error(`Bean already exists: ${bean.name}`);
    }
    this.beans[bean.name] = bean;
  }

  // get bean from container or create
  public getBean(beanKey: string) {
    const bean = this.beans[beanKey];
    if (!bean) {
      systemLog.error(`Bean not found: ${beanKey}`);
      return undefined;
    }
    return bean.target?.instance;
  }

  public getScanBeans(scanType?: BEAN_SCAN_TYPE, isBean = false) {
    if (!scanType) return [];
    let retBeans: any[] = [];

    // Symbol 비교를 description 기반으로 수정
    let beans = Object.keys(this.beans).filter((beanKey) => {
      const bean = this.beans[beanKey];
      if (!bean || !bean.scanType) return false;

      // Symbol의 description을 비교하여 동일한 타입인지 확인
      return bean.scanType.description === scanType.description;
    });

    if (isBean) {
      beans.map((beanKey) => {
        retBeans.push(this.beans[beanKey]);
      });
    } else {
      beans.map((beanKey) => {
        retBeans.push(this.getBean(beanKey));
      });
    }

    return retBeans;
  }

  public getApplication() {
    return this.application;
  }

  public getDatabaseManager(): DatabaseConnectionManager | undefined {
    return this.databaseManager;
  }
}

export const ApplicationContext: ApplicationContextClass =
  ApplicationContextClass.getInstance();
