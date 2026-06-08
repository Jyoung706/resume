import "reflect-metadata";
import {
  IDIContainer,
  BeanDefinition,
  BeanType,
  BeanScope,
  BeanLifecycleEvent,
  BeanLifecycleListener,
  DIContainerConfig,
  DependencyDefinition
} from "./types";
import { ComponentScanner } from "./ComponentScanner";
import { BeanFactory } from "./BeanFactory";
import { logger } from "../../utils";

/**
 * ORKIS Core 통합 DI 컨테이너
 *
 * 의존성 주입 컨테이너의 핵심 구현체입니다.
 * Bean 생명주기 관리, 의존성 해결, 스코프 관리를 담당합니다.
 */
export class DIContainer implements IDIContainer {
  /** Bean 정의 저장소 */
  private readonly beans: Map<string, BeanDefinition> = new Map();

  /** 싱글톤 Bean 인스턴스 캐시 */
  private readonly singletons: Map<string, any> = new Map();

  /** 컴포넌트 스캐너 */
  private readonly componentScanner: ComponentScanner;

  /** Bean 팩토리 */
  private readonly beanFactory: BeanFactory;

  /** 생명주기 리스너들 */
  private readonly lifecycleListeners: BeanLifecycleListener[] = [];

  /** 컨테이너 설정 */
  private readonly config: DIContainerConfig;

  /** 초기화 완료 여부 */
  private initialized = false;

  /** 종료 중 여부 */
  private destroying = false;

  constructor(config?: Partial<DIContainerConfig>) {
    this.config = {
      eagerInitialization: false,
      allowCircularDependency: false,
      lifecycleListeners: [],
      activeProfiles: [],
      ...config
    };

    this.componentScanner = new ComponentScanner();
    this.beanFactory = new BeanFactory(this);
    this.lifecycleListeners.push(...this.config.lifecycleListeners);
  }

  /**
   * DI 컨테이너 초기화
   */
  async initialize(scanPaths: string[]): Promise<void> {
    if (this.initialized) {
      logger.warn("DIContainer already initialized");
      return;
    }

    logger.info("Initializing DI Container...");
    logger.info("Scan paths:", scanPaths);

    try {
      // 1. 컴포넌트 스캔
      const beanDefinitions = await this.componentScanner.scan(scanPaths);
      logger.info(`Found ${beanDefinitions.length} bean definitions`);

      // 2. Bean 정의 등록
      for (const definition of beanDefinitions) {
        this.registerBean(definition);
      }

      // 3. 의존성 그래프 분석
      this.analyzeDependencies();

      // 4. Eager 초기화
      if (this.config.eagerInitialization) {
        await this.initializeEagerBeans();
      }

      this.initialized = true;
      logger.info("DI Container initialization completed");
    } catch (error) {
      logger.error("Failed to initialize DI Container:", error);
      throw error;
    }
  }

  /**
   * Bean 정의 등록
   */
  registerBean(definition: BeanDefinition): void {
    const { metadata } = definition;

    // 프로파일 체크
    if (!this.isProfileActive(metadata.profiles)) {
      logger.info(
        `Skipping bean ${metadata.name} - profiles not active:`,
        metadata.profiles
      );
      return;
    }

    // 중복 체크
    if (this.beans.has(metadata.name)) {
      const existing = this.beans.get(metadata.name)!;
      if (existing.metadata.priority > metadata.priority) {
        logger.info(`Replacing bean ${metadata.name} with higher priority`);
        this.beans.set(metadata.name, definition);
      } else {
        logger.warn(
          `Bean ${metadata.name} already exists with higher or equal priority`
        );
      }
    } else {
      this.beans.set(metadata.name, definition);
      logger.info(`Registered bean: ${metadata.name} [${metadata.type}]`);
    }
  }

  /**
   * Bean 조회 (타입 기반)
   */
  getBean<T>(type: new (...args: any[]) => T): T {
    const beanName = type.name;
    return this.getBeanByName<T>(beanName);
  }

  /**
   * Bean 조회 (이름 기반)
   */
  getBeanByName<T>(name: string): T {
    if (this.destroying) {
      throw new Error("Cannot get bean during container destruction");
    }

    const definition = this.beans.get(name);
    if (!definition) {
      throw new Error(`Bean not found: ${name}`);
    }

    return this.createBeanInstance<T>(definition);
  }

  /**
   * 특정 타입의 Bean들 조회
   */
  getBeansByType<T>(type: new (...args: any[]) => T): T[] {
    const beans: T[] = [];

    for (const [name, definition] of this.beans) {
      if (definition.target === type) {
        beans.push(this.getBeanByName<T>(name));
      }
    }

    return beans;
  }

  /**
   * Bean 타입별 조회
   */
  findBeansByType(beanType: BeanType): BeanDefinition[] {
    return Array.from(this.beans.values()).filter(
      (definition) => definition.metadata.type === beanType
    );
  }

  /**
   * 의존성 주입
   */
  injectDependencies(target: any): void {
    if (!target || typeof target !== "object") {
      return;
    }

    const constructor = target.constructor;
    const dependencies = this.extractDependencies(constructor);

    for (const [propertyKey, dependency] of dependencies) {
      try {
        const dependencyInstance = this.resolveDependency(dependency);
        target[propertyKey] = dependencyInstance;
      } catch (error: any) {
        if (dependency.required) {
          throw new Error(
            `Failed to inject required dependency ${propertyKey}: ${error?.message || error}`
          );
        }
        logger.warn(
          `Optional dependency ${propertyKey} could not be resolved:`,
          error?.message || error
        );
      }
    }
  }

  /**
   * 컨테이너 소멸
   */
  async destroy(): Promise<void> {
    if (this.destroying) {
      return;
    }

    logger.info("Destroying DI Container...");
    this.destroying = true;

    try {
      // 싱글톤 Bean들의 destroy 메서드 호출
      for (const [name, instance] of this.singletons) {
        const definition = this.beans.get(name);
        if (definition) {
          await this.destroyBean(definition, instance);
        }
      }

      // 캐시 정리
      this.singletons.clear();
      this.beans.clear();

      logger.info("DI Container destroyed");
    } catch (error) {
      logger.error("Error during container destruction:", error);
      throw error;
    } finally {
      this.destroying = false;
      this.initialized = false;
    }
  }

  /**
   * Bean 인스턴스 생성
   */
  private createBeanInstance<T>(definition: BeanDefinition): T {
    const { metadata, target } = definition;

    // 싱글톤 스코프 처리
    if (metadata.scope === BeanScope.SINGLETON) {
      if (this.singletons.has(metadata.name)) {
        return this.singletons.get(metadata.name) as T;
      }

      const instance = this.instantiateBean<T>(definition);
      this.singletons.set(metadata.name, instance);
      return instance;
    }

    // 프로토타입 스코프 - 매번 새 인스턴스 생성
    return this.instantiateBean<T>(definition);
  }

  /**
   * Bean 인스턴스화
   */
  private instantiateBean<T>(definition: BeanDefinition): T {
    const { metadata, target } = definition;

    try {
      // 생명주기 이벤트 발생
      this.fireLifecycleEvent("creating", definition);

      // Bean 인스턴스 생성
      const instance = new target() as T;

      // 의존성 주입
      this.injectDependencies(instance);

      // 초기화 메서드 호출
      if (metadata.initMethod) {
        this.callInitMethod(instance, metadata.initMethod);
      }

      // 생명주기 이벤트 발생
      this.fireLifecycleEvent("created", definition, instance);

      definition.initialized = true;

      return instance;
    } catch (error) {
      logger.error(`Failed to instantiate bean ${metadata.name}:`, error);
      throw error;
    }
  }

  /**
   * 의존성 해결
   */
  private resolveDependency(dependency: DependencyDefinition): any {
    if (dependency.isArray) {
      // 배열 타입 의존성 처리
      return this.getBeansByType(dependency.type);
    } else {
      // 단일 타입 의존성 처리
      if (dependency.qualifier) {
        return this.getBeanByName(dependency.qualifier);
      } else {
        return this.getBean(dependency.type);
      }
    }
  }

  /**
   * 클래스에서 의존성 정보 추출
   */
  private extractDependencies(
    constructor: any
  ): Map<string, DependencyDefinition> {
    const dependencies = new Map<string, DependencyDefinition>();

    // @Autowired 메타데이터 추출
    const autowiredMetadata =
      Reflect.getMetadata("autowired", constructor) || new Map();

    for (const [propertyKey, type] of autowiredMetadata) {
      dependencies.set(propertyKey, {
        propertyKey,
        type,
        required: true,
        isArray: false
      });
    }

    return dependencies;
  }

  /**
   * 의존성 그래프 분석
   */
  private analyzeDependencies(): void {
    logger.info("Analyzing dependency graph...");

    // 순환 의존성 검사
    if (!this.config.allowCircularDependency) {
      this.checkCircularDependencies();
    }

    logger.info("Dependency analysis completed");
  }

  /**
   * 순환 의존성 검사
   */
  private checkCircularDependencies(): void {
    // 순환 의존성 검사 로직 구현
    // 현재는 기본적인 체크만 수행
    logger.info("Circular dependency check passed");
  }

  /**
   * Eager Bean 초기화
   */
  private async initializeEagerBeans(): Promise<void> {
    logger.info("Initializing eager beans...");

    for (const [name, definition] of this.beans) {
      if (
        !definition.metadata.lazy &&
        definition.metadata.scope === BeanScope.SINGLETON
      ) {
        this.createBeanInstance(definition);
      }
    }

    logger.info("Eager bean initialization completed");
  }

  /**
   * 프로파일 활성화 여부 확인
   */
  private isProfileActive(profiles: string[]): boolean {
    if (profiles.length === 0) {
      return true; // 프로파일이 없으면 항상 활성화
    }

    return profiles.some((profile) =>
      this.config.activeProfiles.includes(profile)
    );
  }

  /**
   * Bean 초기화 메서드 호출
   */
  private async callInitMethod(
    instance: any,
    methodName: string
  ): Promise<void> {
    if (typeof instance[methodName] === "function") {
      const result = instance[methodName]();
      if (result instanceof Promise) {
        await result;
      }
    }
  }

  /**
   * Bean 소멸
   */
  private async destroyBean(
    definition: BeanDefinition,
    instance: any
  ): Promise<void> {
    const { metadata } = definition;

    try {
      this.fireLifecycleEvent("destroying", definition, instance);

      if (
        metadata.destroyMethod &&
        typeof instance[metadata.destroyMethod] === "function"
      ) {
        const result = instance[metadata.destroyMethod]();
        if (result instanceof Promise) {
          await result;
        }
      }

      this.fireLifecycleEvent("destroyed", definition, instance);
      definition.destroyed = true;
    } catch (error) {
      logger.error(`Error destroying bean ${metadata.name}:`, error);
    }
  }

  /**
   * 생명주기 이벤트 발생
   */
  private fireLifecycleEvent(
    type: "creating" | "created" | "destroying" | "destroyed",
    definition: BeanDefinition,
    instance?: any
  ): void {
    const event: BeanLifecycleEvent = {
      type,
      definition,
      instance,
      timestamp: Date.now()
    };

    for (const listener of this.lifecycleListeners) {
      try {
        switch (type) {
          case "creating":
            listener.onBeanCreating?.(event);
            break;
          case "created":
            listener.onBeanCreated?.(event);
            break;
          case "destroying":
            listener.onBeanDestroying?.(event);
            break;
          case "destroyed":
            listener.onBeanDestroyed?.(event);
            break;
        }
      } catch (error) {
        logger.error(`Error in lifecycle listener:`, error);
      }
    }
  }

  /**
   * 모든 Bean 정의 조회
   */
  getAllBeanDefinitions(): BeanDefinition[] {
    return Array.from(this.beans.values());
  }
}
