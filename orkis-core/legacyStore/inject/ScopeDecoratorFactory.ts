import DiSupplier from "./DiSupplier";

import logger from "../utils/Logger";
import {
  BEAN_META,
  DEFAULT_META_KEY,
  META_KEY_TYPE,
  META_INJECTOR
} from "../static";

export class ScopeDecoratorGenerator {
  public diSupplier: DiSupplier;
  public metaData: BEAN_META = {
    key: DEFAULT_META_KEY,
    injectTargets: []
  };
  public target: any;
  constructor(
    mainMetaKey: META_KEY_TYPE,
    _diSupplier: DiSupplier,
    _target: any
  ) {
    if (mainMetaKey) this.metaData.key = mainMetaKey;
    this.diSupplier = _diSupplier;
    this.target = _target;
  }

  public generateMetaData(
    flag: string,
    propType: any,
    paramName: string,
    index?: number,
    args?: any[]
  ): ScopeDecoratorGenerator {
    this.metaData.type = propType;
    this.metaData.target = { name: paramName, index: index };
    this.metaData.propertyKey = Symbol(
      `${flag}_${this.target.constructor.name}_${paramName}${index ? `${index}` : ""}`
    );

    if (!args) {
      let injertTarget: META_INJECTOR = {
        origin: undefined,
        runner: undefined
      };
      injertTarget.runner = this.diSupplier.requestScopeInjectSupplier();
      this.metaData.injectTargets.push(injertTarget);
    } else {
      for (let argIdx = 0; argIdx < args.length; argIdx++) {
        let argParam: any = args[argIdx];
        let injertTarget: META_INJECTOR = {
          origin: argParam,
          runner: undefined
        };
        injertTarget.runner =
          this.diSupplier.requestScopeInjectSupplier(argParam);
        this.metaData.injectTargets.push(injertTarget);
      }
    }

    return this;
  }

  public appendMetadata() {
    if (!this.metaData || !this.target) {
      logger.error("generate metadata error in @SCOPE");
      return;
    }

    Reflect.defineMetadata(
      this.metaData.propertyKey,
      this.metaData,
      this.target,
      this.metaData.key
    );
  }
}
