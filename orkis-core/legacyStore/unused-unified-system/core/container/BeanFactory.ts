import { logger } from "../../utils";
import {
  BeanDefinition,
  BeanFactory as IBeanFactory,
  DependencyDefinition,
  IDIContainer
} from "./types";

/**
 * Bean 팩토리
 *
 * Bean 인스턴스의 생성과 생명주기 관리를 담당합니다.
 */
export class BeanFactory implements IBeanFactory {
  /** DI 컨테이너 참조 */
  private readonly container: IDIContainer;

  constructor(container: IDIContainer) {
    this.container = container;
  }

  /**
   * Bean 인스턴스 생성
   */
  createBean<T>(definition: BeanDefinition): T {
    const { target, metadata } = definition;

    try {
      logger.info(`Creating bean: ${metadata.name}`);

      // 생성자 호출
      const instance = new target();

      // 의존성 주입
      this.injectDependencies(instance, definition.dependencies);

      // 초기화 메서드 호출
      if (metadata.initMethod) {
        this.callInitMethod(instance, metadata.initMethod);
      }

      logger.info(`Bean created successfully: ${metadata.name}`);
      return instance as T;
    } catch (error) {
      logger.error(`Failed to create bean ${metadata.name}:`, error);
      throw error;
    }
  }

  /**
   * Bean 의존성 주입
   */
  injectDependencies(
    target: any,
    dependencies: Map<string, DependencyDefinition>
  ): void {
    if (!target || dependencies.size === 0) {
      return;
    }

    logger.info(`Injecting dependencies for ${target.constructor.name}...`);

    for (const [propertyKey, dependency] of dependencies) {
      try {
        const dependencyInstance = this.resolveDependency(dependency);
        if (dependencyInstance !== undefined) {
          target[propertyKey] = dependencyInstance;
          logger.info(`Injected dependency: ${propertyKey}`);
        }
      } catch (error: any) {
        if (dependency.required) {
          throw new Error(
            `Failed to inject required dependency ${propertyKey} for ${target.constructor.name}: ${error?.message || error}`
          );
        } else {
          logger.warn(
            `Optional dependency ${propertyKey} could not be resolved for ${target.constructor.name}:`,
            error?.message || error
          );
        }
      }
    }
  }

  /**
   * Bean 초기화 메서드 호출
   */
  async callInitMethod(target: any, methodName?: string): Promise<void> {
    if (!methodName || typeof target[methodName] !== "function") {
      return;
    }

    try {
      logger.info(
        `Calling init method: ${target.constructor.name}.${methodName}()`
      );

      const result = target[methodName]();

      // 비동기 메서드 지원
      if (result instanceof Promise) {
        await result;
      }

      logger.info(
        `Init method completed: ${target.constructor.name}.${methodName}()`
      );
    } catch (error) {
      logger.error(
        `Init method failed: ${target.constructor.name}.${methodName}():`,
        error
      );
      throw error;
    }
  }

  /**
   * Bean 소멸 메서드 호출
   */
  async callDestroyMethod(target: any, methodName?: string): Promise<void> {
    if (!methodName || typeof target[methodName] !== "function") {
      return;
    }

    try {
      logger.info(
        `Calling destroy method: ${target.constructor.name}.${methodName}()`
      );

      const result = target[methodName]();

      // 비동기 메서드 지원
      if (result instanceof Promise) {
        await result;
      }

      logger.info(
        `Destroy method completed: ${target.constructor.name}.${methodName}()`
      );
    } catch (error) {
      logger.error(
        `Destroy method failed: ${target.constructor.name}.${methodName}():`,
        error
      );
      // destroy 메서드 실패는 로그만 남기고 진행
    }
  }

  /**
   * 의존성 해결
   */
  private resolveDependency(dependency: DependencyDefinition): any {
    const { type, isArray, qualifier, required } = dependency;

    try {
      if (isArray) {
        // 배열 타입 의존성 - 해당 타입의 모든 Bean 반환
        return this.container.getBeansByType(type);
      } else {
        // 단일 타입 의존성
        if (qualifier) {
          // 한정자가 있는 경우 이름으로 조회
          return this.container.getBeanByName(qualifier);
        } else {
          // 타입으로 조회
          return this.container.getBean(type);
        }
      }
    } catch (error) {
      if (required) {
        throw error;
      } else {
        // 선택적 의존성인 경우 undefined 반환
        return undefined;
      }
    }
  }

  /**
   * 의존성 순서 정렬
   *
   * Bean들을 의존성 순서대로 정렬하여 순환 의존성을 방지합니다.
   */
  static sortBeansByDependency(
    definitions: BeanDefinition[]
  ): BeanDefinition[] {
    const sorted: BeanDefinition[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (definition: BeanDefinition) => {
      const { metadata } = definition;

      if (visited.has(metadata.name)) {
        return; // 이미 처리됨
      }

      if (visiting.has(metadata.name)) {
        throw new Error(`Circular dependency detected: ${metadata.name}`);
      }

      visiting.add(metadata.name);

      // 의존성들을 먼저 처리
      for (const [, dependency] of definition.dependencies) {
        const dependencyName = dependency.qualifier || dependency.type.name;
        const dependencyDefinition = definitions.find(
          (d) => d.metadata.name === dependencyName
        );

        if (
          dependencyDefinition &&
          !visited.has(dependencyDefinition.metadata.name)
        ) {
          visit(dependencyDefinition);
        }
      }

      visiting.delete(metadata.name);
      visited.add(metadata.name);
      sorted.push(definition);
    };

    // 모든 정의를 방문
    for (const definition of definitions) {
      if (!visited.has(definition.metadata.name)) {
        visit(definition);
      }
    }

    return sorted;
  }

  /**
   * Bean이 생성 가능한지 확인
   */
  static canCreateBean(
    definition: BeanDefinition,
    availableBeans: Set<string>
  ): boolean {
    // 모든 필수 의존성이 사용 가능한지 확인
    for (const [, dependency] of definition.dependencies) {
      if (dependency.required) {
        const dependencyName = dependency.qualifier || dependency.type.name;
        if (!availableBeans.has(dependencyName)) {
          return false;
        }
      }
    }

    return true;
  }
}
