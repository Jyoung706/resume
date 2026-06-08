import {
  BEAN_META,
  DYNAMIC_INJECT_META_KEY,
  META_DI_RESOLVER,
  META_INJECTOR
} from "../static";

// from "../@types/DynamicInject";

import logger from "../utils/Logger";

export default abstract class DiSupplier {
  public abstract scopeDiSupplierWorker(
    rc: any,
    className?: string
  ): Promise<any>;

  public requestScopeInjectSupplier(origin?: any): Function {
    if (!origin) {
      return (rc: any): Promise<any> => {
        return new Promise<any>(async (resolve, reject) => {
          try {
            resolve(await this.scopeDiSupplierWorker(rc));
          } catch (e) {
            // logger.error("")
            reject(e);
            // resolve(undefined)
          }
        });
      };
    }
    if (typeof origin === "string") {
      let className = origin;
      return (rc: any): Promise<any> => {
        return new Promise<any>(async (resolve, reject) => {
          try {
            resolve(await this.scopeDiSupplierWorker(rc, className));
          } catch (e) {
            // logger.error("")
            reject(e);
            // resolve(undefined)
          }
        });
      };
    } else {
      const targetType = !origin.prototype.constructor.name
        ? undefined
        : origin.prototype.constructor.name;
      const className = Object.getPrototypeOf(origin).name;
      return (rc: any) => {
        return new Promise<any>(async (resolve, reject) => {
          try {
            let isBean =
              [
                "RESOLVER",
                "BEAN",
                "MIDDLEWARE",
                "TRANSACTION_PROCESSOR"
              ].indexOf(targetType) > -1;
            if (isBean) {
              resolve(await this.scopeDiSupplierWorker(rc, className));
            } else {
              const newClass = new origin();
              // rc.addScopeData(className, newClass);
              resolve(newClass);
            }
          } catch (e) {
            reject(e);
            // resolve(undefined);
          }
        });
      };
    }
  }

  public static scopeDiResolver = (
    inputArgs: any[],
    outputArgs: any[],
    resolver: META_DI_RESOLVER
  ): Promise<any[]> => {
    return new Promise<any[]>(async (resolve, reject) => {
      // if(!resolver){
      //     throw Error?
      // }
      try {
        logger.info(
          "----------------------------------------------------------",
          outputArgs.length,
          inputArgs.length,
          resolver.maxLength
        );
        let resultArgs: any[] = [];
        let maxLen =
          outputArgs.length < resolver.maxLength
            ? resolver.maxLength
            : outputArgs.length;
        let metaData = resolver.metas;
        for (let idx = 0; idx < maxLen; idx++) {
          logger.info(
            "metaData[idx] ------------------------------- ",
            idx,
            metaData[idx]
          );
          if (metaData[idx]) {
            let diTarget: BEAN_META = metaData[idx];
            let diResult: any = [];
            for (
              let injIdx = 0;
              injIdx < diTarget.injectTargets.length;
              injIdx++
            ) {
              let injTarget: META_INJECTOR = diTarget.injectTargets[injIdx];
              if (!injTarget.runner) {
                diResult.push(injTarget.origin);
                continue;
              }

              diResult.push(await injTarget.runner(...inputArgs));
            }

            diResult =
              diResult.length < 1
                ? undefined
                : diResult.length === 1
                  ? diResult[0]
                  : diResult;
            resultArgs.push(diResult);
            continue;
          }

          if (idx < outputArgs.length) {
            resultArgs.push(outputArgs[idx]);
          } else {
            resultArgs.push(undefined);
          }
        }

        resolve(resultArgs);
      } catch (e) {
        reject(e);
      }
    });
  };

  public static DEFUALT_META_DI_RESOLVER_MAP = {
    requestScope: {
      maxLength: -1,
      metas: [],
      argsGenerateFun: this.scopeDiResolver
    },
    singletonScope: {
      maxLength: -1,
      metas: [],
      argsGenerateFun: this.scopeDiResolver
    },
    newScope: {
      maxLength: -1,
      metas: [],
      argsGenerateFun: this.scopeDiResolver
    },
    session: {
      maxLength: -1,
      metas: [],
      argsGenerateFun: this.scopeDiResolver
    },
    file: {
      maxLength: -1,
      metas: [],
      argsGenerateFun: this.scopeDiResolver
    },
    request: {
      maxLength: -1,
      metas: [],
      argsGenerateFun: this.scopeDiResolver
    },
    response: {
      maxLength: -1,
      metas: [],
      argsGenerateFun: this.scopeDiResolver
    }
  };

  public static isDynamicInject = (
    targetClass: any,
    targetServiceName: string
  ) => {
    let meta = Reflect.getMetadata(
      DYNAMIC_INJECT_META_KEY,
      targetClass,
      targetServiceName
    );
    return !!meta;
  };
}
