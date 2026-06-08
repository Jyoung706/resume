import path from "path";

import fg from "fast-glob";
import { SCAN_TYPE } from "../types";
import { systemLog } from "../../utils/Logger";

export default class ComponentScan {
  private static normalizePosix(filePath: string): string {
    return filePath.replace(/\\/g, "/");
  }

  public static async scan(pathParam: string | string[]): Promise<SCAN_TYPE[]> {
    let scannedClasses: any[] = [];
    const classMap = new Map<string, any>();
    const isDevelopment = process.env.NODE_ENV !== "prod";

    if (pathParam instanceof Array) {
      const promises = pathParam.map((elem) => this.scan(elem));
      const results = await Promise.all(promises);
      results.forEach((result) => {
        scannedClasses = [...scannedClasses, ...result];
      });
    } else {
      const filePattern = isDevelopment ? "/**/*.ts" : "/**/*.js";

      const normalizePath = this.normalizePosix(path.normalize(pathParam));
      const targetPathArr: string[] = await fg([normalizePath + filePattern], {
        ignore: ["**/*.d.ts", "**/node_modules/**"],
        absolute: true
      });

      const pathName = path.basename(pathParam);
      systemLog.info(`      -> Scanning ${targetPathArr.length} files in ${pathName}/`);

      let processedCount = 0;
      const totalCount = targetPathArr.length;

      const importPromises = targetPathArr.map(async (fileElem) => {
        try {
          let module: any;

          if (isDevelopment && fileElem.endsWith(".ts")) {
            module = await Promise.resolve(require(fileElem));
          } else {
            const importPath = fileElem.endsWith(".ts")
              ? fileElem.replace(/\.ts$/, ".js")
              : fileElem;
            module = await import(importPath);
          }

          const classes = this.extractClassesFromModule(module);

          processedCount++;
          if (totalCount > 20 && processedCount % Math.ceil(totalCount / 5) === 0) {
            systemLog.debug(`      -> Progress: ${processedCount}/${totalCount} files`);
          }

          return classes;
        } catch (error) {
          systemLog.error(error);
          systemLog.error(`${fileElem} 모듈을 import 할 수 없습니다.`);
          return [];
        }
      });

      const results = await Promise.all(importPromises);
      scannedClasses = results.flat();

      systemLog.debug(`      -> Completed: ${scannedClasses.length} classes found`);
    }

    scannedClasses.forEach((cls) => {
      if (cls && cls.name) {
        if (!classMap.has(cls.name)) {
          classMap.set(cls.name, cls);
        }
      }
    });

    return Array.from(classMap.values());
  }

  private static extractClassesFromModule(module: any) {
    const classes: any[] = [];

    if (!module || typeof module !== "object") {
      return classes;
    }

    for (const key in module) {
      const exported = module[key];

      if (this.isClass(exported)) {
        classes.push(exported);
      }
    }

    return classes;
  }

  /**
   * 주어진 객체가 클래스인지 확인
   */
  private static isClass(obj: any): boolean {
    if (typeof obj !== "function") {
      return false;
    }

    // 클래스는 함수이면서 prototype을 가짐
    if (!obj.prototype) {
      return false;
    }

    // Arrow function이나 일반 함수는 제외
    // 클래스는 'class'로 시작하는 toString을 가짐
    const str = obj.toString();
    if (str.startsWith("class ")) {
      return true;
    }

    // ES5 스타일 클래스 (function으로 정의된 constructor)
    // prototype에 constructor가 있고, constructor가 자기 자신이면 클래스
    if (obj.prototype.constructor === obj) {
      // 하지만 일반 함수도 이 조건을 만족하므로 추가 검증
      // prototype에 메서드가 있거나, Reflect 메타데이터가 있으면 클래스로 간주
      const prototypeKeys = Object.getOwnPropertyNames(obj.prototype);
      if (prototypeKeys.length > 1) {
        // constructor 외에 다른 메서드 있음
        return true;
      }

      // Reflect 메타데이터가 있으면 데코레이터가 적용된 클래스
      const metadataKeys = Reflect.getMetadataKeys(obj);
      if (metadataKeys && metadataKeys.length > 0) {
        return true;
      }
    }

    return false;
  }
}
