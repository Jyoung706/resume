import fs, { promises as fsPromises } from "fs";
import * as path from "path";
import "reflect-metadata";
import {
  BeanDefinition,
  BeanType,
  BeanScope,
  BeanMetadata,
  ComponentScanner as IComponentScanner
} from "./types";
import { logger } from "../../utils";

/**
 * 컴포넌트 스캐너
 *
 * 지정된 경로에서 데코레이터가 적용된 클래스들을 자동으로 찾아서
 * Bean 정의로 변환합니다.
 */
export class ComponentScanner implements IComponentScanner {
  /** 스캔할 파일 확장자 */
  private readonly supportedExtensions = [".js", ".ts"];

  /** 제외할 파일 패턴 */
  private readonly excludePatterns = [
    /\.d\.ts$/,
    /\.test\./,
    /\.spec\./,
    /\.map$/,
    /node_modules/
  ];

  /**
   * 지정된 경로에서 컴포넌트 스캔
   */
  async scan(paths: string[]): Promise<BeanDefinition[]> {
    logger.info("Starting component scan...");
    const beanDefinitions: BeanDefinition[] = [];

    for (const scanPath of paths) {
      logger.info(`Scanning path: ${scanPath}`);

      if (!fs.existsSync(scanPath)) {
        logger.warn(`Scan path does not exist: ${scanPath}`);
        continue;
      }

      const files = await this.findJsFiles(scanPath);
      logger.info(`Found ${files.length} files to scan in ${scanPath}`);

      for (const file of files) {
        try {
          const definitions = await this.scanFile(file);
          beanDefinitions.push(...definitions);
        } catch (error: any) {
          logger.warn(`Failed to scan file ${file}:`, error?.message || error);
        }
      }
    }

    logger.info(
      `Component scan completed. Found ${beanDefinitions.length} bean definitions`
    );
    return beanDefinitions;
  }

  /**
   * 특정 클래스에서 Bean 정의 추출
   */
  extractBeanDefinition(target: any): BeanDefinition | null {
    if (!target || typeof target !== "function") {
      return null;
    }

    const beanType = this.getBeanType(target);
    if (!beanType) {
      return null; // 데코레이터가 없는 클래스는 무시
    }

    const metadata = this.extractBeanMetadata(target, beanType);
    const dependencies = this.extractDependencies(target);

    return {
      metadata,
      target,
      dependencies,
      initialized: false,
      destroyed: false
    };
  }

  /**
   * JavaScript 파일들을 재귀적으로 찾기
   */
  private async findJsFiles(dirPath: string): Promise<string[]> {
    const jsFiles: string[] = [];

    try {
      const files = await fsPromises.readdir(dirPath, { withFileTypes: true });

      const promises = files.map(async (file) => {
        const filePath = path.join(dirPath, file.name);

        if (file.isDirectory()) {
          return await this.findJsFiles(filePath);
        } else if (file.isFile()) {
          if (this.isValidFile(file.name)) {
            return [filePath];
          }
        }
        return [];
      });

      const results = await Promise.all(promises);
      return results.flat();
    } catch (error) {
      logger.warn(`Failed to read directory ${dirPath}`, error);
      return [];
    }

    return jsFiles;
  }

  /**
   * 파일이 스캔 대상인지 확인
   */
  private isValidFile(fileName: string): boolean {
    // 지원하는 확장자 체크
    const hasValidExtension = this.supportedExtensions.some((ext) =>
      fileName.endsWith(ext)
    );
    if (!hasValidExtension) {
      return false;
    }

    // 제외 패턴 체크
    const shouldExclude = this.excludePatterns.some((pattern) =>
      pattern.test(fileName)
    );
    return !shouldExclude;
  }

  private async scanFile(filePath: string): Promise<BeanDefinition[]> {
    const beanDefinitions: BeanDefinition[] = [];

    try {
      const moduleExports = await this.loadModule(filePath);

      if (!moduleExports) {
        return beanDefinitions;
      }

      // CommonJS와 ES6 모듈 모두 처리
      const exportsToCheck = new Map<string, any>();

      // default export 확인
      if (moduleExports.default) {
        if (typeof moduleExports.default === "function") {
          exportsToCheck.set("default", moduleExports.default);
        } else if (typeof moduleExports.default === "object") {
          // default가 객체인 경우 그 안의 함수들도 확인
          Object.entries(moduleExports.default).forEach(([key, value]) => {
            if (typeof value === "function") {
              exportsToCheck.set(key, value);
            }
          });
        }
      }

      // named exports 확인
      Object.entries(moduleExports).forEach(([key, value]) => {
        if (key !== "default" && typeof value === "function") {
          exportsToCheck.set(key, value);
        }
      });

      // 각 export에 대해 Bean 정의 추출
      for (const [exportName, exportValue] of exportsToCheck) {
        const definition = this.extractBeanDefinition(exportValue);
        if (definition) {
          logger.info(
            `Found bean: ${definition.metadata.name} (${exportName}) in ${filePath}`
          );
          beanDefinitions.push(definition);
        }
      }
    } catch (error: any) {
      logger.warn(
        `Failed to load module ${filePath}:`,
        error?.message || error
      );
    }

    return beanDefinitions;
  }

  /**
   * 모듈 동적 로드
   */
  private async loadModule(filePath: string): Promise<any> {
    try {
      const absolutePath = path.resolve(filePath);
      const isDevelopment = process.env.NODE_ENV !== "prod";

      let importPath = absolutePath;
      if (!isDevelopment && filePath.endsWith(".ts")) {
        importPath = absolutePath.replace(/\.ts$/, ".js");

        if (!fs.existsSync(importPath)) {
          throw new Error(`Compiled JavaScript file not found: ${importPath}`);
        }
      }

      if (isDevelopment && filePath.endsWith(".ts")) {
        return require(absolutePath);
      } else {
        const module = await import(importPath);
        return module;
      }
    } catch (error: any) {
      throw new Error(
        `Cannot load module ${filePath}: ${error?.message || error}`
      );
    }
  }

  /**
   * 클래스의 Bean 타입 결정
   */
  private getBeanType(target: any): BeanType | null {
    // 각 데코레이터의 메타데이터 확인
    if (Reflect.hasMetadata("application", target)) {
      return BeanType.APPLICATION;
    }

    if (Reflect.hasMetadata("controller", target)) {
      return BeanType.CONTROLLER;
    }

    if (Reflect.hasMetadata("service", target)) {
      return BeanType.SERVICE;
    }

    if (Reflect.hasMetadata("component", target)) {
      return BeanType.COMPONENT;
    }

    if (Reflect.hasMetadata("configuration", target)) {
      return BeanType.CONFIGURATION;
    }

    if (Reflect.hasMetadata("dao", target)) {
      return BeanType.DAO;
    }

    if (Reflect.hasMetadata("middleware", target)) {
      return BeanType.MIDDLEWARE;
    }

    return null; // 데코레이터가 없는 클래스
  }

  /**
   * Bean 메타데이터 추출
   */
  private extractBeanMetadata(target: any, beanType: BeanType): BeanMetadata {
    const className = target.name;

    // 기본 메타데이터
    let metadata: BeanMetadata = {
      name: className,
      type: beanType,
      scope: BeanScope.SINGLETON,
      priority: 0,
      lazy: false,
      profiles: []
    };

    // 각 데코레이터별 메타데이터 확인 및 병합
    const decoratorMetadata = this.getDecoratorMetadata(target, beanType);
    if (decoratorMetadata) {
      metadata = { ...metadata, ...decoratorMetadata };
    }

    return metadata;
  }

  /**
   * 데코레이터별 메타데이터 추출
   */
  private getDecoratorMetadata(
    target: any,
    beanType: BeanType
  ): Partial<BeanMetadata> | null {
    const metadataKey = beanType.toLowerCase();

    try {
      return Reflect.getMetadata(metadataKey, target) || null;
    } catch (error: any) {
      logger.warn(
        `Failed to extract metadata for ${target.name}:`,
        error?.message || error
      );
      return null;
    }
  }

  /**
   * 클래스의 의존성 정보 추출
   */
  private extractDependencies(target: any): Map<string, any> {
    const dependencies = new Map();

    try {
      // @Autowired 메타데이터 추출
      const autowiredMetadata = Reflect.getMetadata("autowired", target);
      if (autowiredMetadata instanceof Map) {
        return autowiredMetadata;
      }

      // 레거시 형식 처리
      if (autowiredMetadata && typeof autowiredMetadata === "object") {
        for (const [key, value] of Object.entries(autowiredMetadata)) {
          dependencies.set(key, value);
        }
      }
    } catch (error: any) {
      logger.warn(
        `Failed to extract dependencies for ${target.name}:`,
        error?.message || error
      );
    }

    return dependencies;
  }
}
