import {
  REQUIRED,
  REQUIRES_NEW,
  SUPPORTS,
  ConnectionMetadata
} from "../../database/types";
import {
  AUTOWIRED_PROPERTY_META_KEY,
  META_KEYS,
  VALUE_PROPERTY_META_KEY
} from "../constants";
import {
  ALL_CONNECTION_MAPPINGS_CACHE,
  AUTOWIRED_PROPERTIES_LIST,
  COMPONENT_SCAN_BEAN_META_KEY,
  EXECUTION_CONTEXT,
  VALUE_PROPERTIES_LIST
} from "../constants/internalKeys";
import {
  BEAN,
  PROPERTY_META_INTERFACE,
  SCOPE_TYPE,
  SCOPE_TYPES
} from "../types";
import { systemLog } from "../../utils/Logger";
import {
  createAutoCommitAdapter,
  createTransactionContext,
  executeWithAutoCommit,
  executeWithTransaction
} from "./transactionResolver";
import { ApplicationContextClass } from "./ApplicationContext";
import { DynamicConnectionSupport } from "../../database";

export class BeanResolver {
  private resolvingStack: Set<string> = new Set();

  constructor(private container: ApplicationContextClass) {}

  public resolveBean(beanKey: string, scope?: SCOPE_TYPE) {
    const bean = this.container.beans[beanKey];

    if (!bean) {
      systemLog.error(`Bean not found: ${beanKey}`);
      return undefined;
    }

    const actualScope = scope || bean.scope;

    switch (actualScope) {
      case SCOPE_TYPES.SINGLETON_SCOPE:
        return this.resolveSingleton(beanKey, bean);

      case SCOPE_TYPES.PROTOTYPE_SCOPE:
        return this.resolvePrototype(beanKey, bean);

      default:
        throw new Error(`Unsupported scope: ${String(actualScope)}`);
    }
  }

  private resolveSingleton(beanKey: string, bean: BEAN) {
    if (bean.target?.instance) {
      return bean.target.instance;
    }

    if (this.resolvingStack.has(beanKey)) {
      const stack = Array.from(this.resolvingStack).join(" -> ");
      throw new Error(`Circular dependency detected: ${stack} -> ${beanKey}`);
    }

    this.resolvingStack.add(beanKey);

    try {
      const instance = this.createInstance(bean);

      this.injectDependencies(instance, bean);

      if (bean.target) {
        bean.target.instance = instance;
      }

      return instance;
    } finally {
      this.resolvingStack.delete(beanKey);
    }
  }

  private resolvePrototype(beanKey: string, bean: BEAN) {
    const instance = this.createInstance(bean);
    this.injectDependencies(instance, bean);
    return instance;
  }

  private createInstance(bean: BEAN) {
    const targetClass = bean.target?.origin;

    if (!targetClass) {
      throw new Error(`No constructor found for bean: ${bean.name}`);
    }

    return new targetClass();
  }

  private injectDependencies(instance: any, bean: BEAN): void {
    const target =
      bean.target?.origin.prototype || Object.getPrototypeOf(instance);
    if (!target) return;

    this.injectAutowired(instance, target);
    this.injectValue(instance, target);
    this.injectConnections(instance, target);

    // Connection이 있는지 체크하고 캐싱
    const allConnectionMappings = this.collectAllMappings(instance, target);
    if (allConnectionMappings.length > 0) {
      instance[ALL_CONNECTION_MAPPINGS_CACHE] = allConnectionMappings;
    }

    const hasTransactional = this.checkHasTransactional(target);
    const hasDynamicSupport = instance instanceof DynamicConnectionSupport;

    if (hasDynamicSupport && !hasTransactional) {
      const className = target.constructor.name;
      throw new Error(
        `[${className}] DynamicConnectionSupport를 extends하면 ` +
          `@Transactional 데코레이터가 필수입니다.`
      );
    }

    // @Transactional이 있으면 메서드 래핑
    if (hasTransactional) {
      this.wrapTransactionalMethods(instance, target);
    }
  }

  private injectAutowired(instance: any, target: any) {
    const propertyNames =
      Reflect.getMetadata(AUTOWIRED_PROPERTIES_LIST, target) || [];

    for (const propName of propertyNames) {
      const metadata: PROPERTY_META_INTERFACE<string> = Reflect.getMetadata(
        AUTOWIRED_PROPERTY_META_KEY,
        target,
        propName
      );

      if (!metadata) continue;

      const dependencyName = metadata.args || metadata.name;
      const dependency = this.resolveBean(dependencyName);

      if (dependency !== undefined) {
        instance[metadata.name] = dependency;
      }
    }
  }

  private injectValue(instance: any, target: any) {
    const propertyNames =
      Reflect.getMetadata(VALUE_PROPERTIES_LIST, target) || [];

    for (const propName of propertyNames) {
      const metadata: PROPERTY_META_INTERFACE<string> = Reflect.getMetadata(
        VALUE_PROPERTY_META_KEY,
        target,
        propName
      );

      if (!metadata) continue;

      const envValue = process.env[metadata.args];

      if (envValue !== undefined) {
        instance[metadata.name] = this.convertType(envValue, target, propName);
        systemLog.debug(`@Value injected: ${metadata.args} = ${envValue}`);
      } else {
        systemLog.warn(
          `Environment variable not found: ${metadata.args} (using default value)`
        );
      }
    }
  }

  private injectConnections(instance: any, target: any): void {
    const connectionMetadata: ConnectionMetadata[] =
      Reflect.getMetadata(
        META_KEYS.CONNECTION_PROPERTIES,
        target.constructor
      ) || [];

    const databaseManager = this.container.getDatabaseManager();
    if (!databaseManager) return;

    for (const metadata of connectionMetadata) {
      const { propertyKey, datasourceName, options } = metadata;

      if (options.dynamic) {
        instance[propertyKey] = undefined;
        continue;
      }
      const adapter = databaseManager.getAdapter(datasourceName);

      if (options.type === "native") {
        instance[propertyKey] = adapter.getConnectionInstance();
      } else {
        instance[propertyKey] = createAutoCommitAdapter(adapter);
      }
    }
  }

  private convertType(value: string, target: any, propName: string): any {
    const type = Reflect.getMetadata("design:type", target, propName);

    if (type === Number) {
      const num = Number(value);
      if (isNaN(num)) {
        systemLog.warn(
          `Failed to convert @Value to number : ${propName} = "${value}"`
        );
        return undefined;
      }
      return num;
    }

    if (type === Boolean) {
      return value === "true" || value === "1";
    }

    return value;
  }

  private collectConnectionMappings(target: any): ConnectionMetadata[] {
    const connectionMetadata: ConnectionMetadata[] =
      Reflect.getMetadata(
        META_KEYS.CONNECTION_PROPERTIES,
        target.constructor
      ) || [];

    return connectionMetadata;
  }

  private collectAllMappings(instance: any, target: any): ConnectionMetadata[] {
    const allMappings: ConnectionMetadata[] = [];
    const visited = new Set<any>();

    this.collectMappingsRecursive(instance, allMappings, visited);
    return allMappings;
  }

  private collectMappingsRecursive(
    beanInstance: any,
    allMappings: ConnectionMetadata[],
    visited: Set<any>
  ) {
    // 순환 참조 방지
    if (visited.has(beanInstance)) {
      return;
    }
    visited.add(beanInstance);

    // 1. 현재 Bean의 직접 connection mappings
    const directMappings = this.collectConnectionMappings(
      Object.getPrototypeOf(beanInstance)
    );
    allMappings.push(...directMappings);

    // 2. @Autowired된 Bean들의 mappings 수집
    const target = Object.getPrototypeOf(beanInstance);
    const autowiredProps =
      Reflect.getMetadata(AUTOWIRED_PROPERTIES_LIST, target) || [];

    for (const propName of autowiredProps) {
      const autowiredBean = beanInstance[propName];
      if (!autowiredBean) continue;

      // Bean인지 확인
      const beanMeta = Reflect.getMetadata(
        COMPONENT_SCAN_BEAN_META_KEY,
        autowiredBean.constructor
      );

      if (beanMeta) {
        // 재귀적으로 하위 Bean의 mappings 수집
        const nestedMappings: ConnectionMetadata[] = [];
        this.collectMappingsRecursive(autowiredBean, nestedMappings, visited);

        // beanPropertyName 추가하여 어떤 Bean의 connection인지 구분
        const prefixedMappings = nestedMappings.map((m: any) => ({
          ...m,
          beanPropertyName: propName
        }));

        allMappings.push(...prefixedMappings);
      }
    }
  }

  private checkHasTransactional(target: any): boolean {
    const classTransactional = Reflect.getMetadata(
      META_KEYS.TRANSACTIONAL_CLASS,
      target.constructor
    );

    if (classTransactional) return true;

    const methodNames = Object.getOwnPropertyNames(target).filter(
      (name) => name !== "constructor" && typeof target[name] === "function"
    );

    for (const methodName of methodNames) {
      const methodTransactional = Reflect.getMetadata(
        META_KEYS.TRANSACTIONAL_METHOD,
        target,
        methodName
      );
      if (methodTransactional) return true;
    }

    return false;
  }

  /**
   * @Transactional 메서드 래핑
   */
  private wrapTransactionalMethods(instance: any, target: any): void {
    const classTransactionalMeta = Reflect.getMetadata(
      META_KEYS.TRANSACTIONAL_CLASS,
      target.constructor
    );

    const hasConnections = instance[ALL_CONNECTION_MAPPINGS_CACHE]?.length > 0;

    const methodNames = Object.getOwnPropertyNames(target).filter(
      (name) => name !== "constructor" && typeof target[name] === "function"
    );

    for (const methodName of methodNames) {
      const methodMeta = Reflect.getMetadata(
        META_KEYS.TRANSACTIONAL_METHOD,
        target,
        methodName
      );
      const transactionalMeta = methodMeta || classTransactionalMeta;

      if (!transactionalMeta) continue;

      const originalMethod = target[methodName];

      // 메서드 래핑
      instance[methodName] = async function (...args: any[]) {
        const { propagation = REQUIRED } = transactionalMeta;

        if (!hasConnections) {
          return await originalMethod.apply(this, args);
        }

        // 이미 트랜잭션 내부에 있는 경우
        if (this[EXECUTION_CONTEXT]) {
          if (propagation === REQUIRES_NEW) {
            // REQUIRES_NEW: 새로운 독립 트랜잭션 생성
            const ctx = createTransactionContext(this, true);
            return await executeWithTransaction(
              ctx,
              originalMethod,
              args,
              transactionalMeta
            );
          } else {
            // REQUIRED, SUPPORTS: 기존 트랜잭션 사용
            return await originalMethod.apply(this, args);
          }
        }

        // 트랜잭션 외부에서 호출된 경우
        if (propagation === SUPPORTS) {
          // SUPPORTS: 트랜잭션 없이 실행 (auto-commit)
          const ctx = createTransactionContext(this, false);
          return await executeWithAutoCommit(ctx, originalMethod, args);
        } else {
          // REQUIRED, REQUIRES_NEW: 새 트랜잭션 시작
          const ctx = createTransactionContext(this, true);
          return await executeWithTransaction(
            ctx,
            originalMethod,
            args,
            transactionalMeta
          );
        }
      };
    }
  }
}
