/**
 * Bean 정의 관련 타입들
 */

/** Bean 스코프 타입 */
export enum BeanScope {
  SINGLETON = 'singleton',
  PROTOTYPE = 'prototype',
  REQUEST = 'request',
  SESSION = 'session'
}

/** Bean 타입 분류 */
export enum BeanType {
  APPLICATION = 'APPLICATION',
  CONTROLLER = 'CONTROLLER', 
  SERVICE = 'SERVICE',
  COMPONENT = 'COMPONENT',
  CONFIGURATION = 'CONFIGURATION',
  DAO = 'DAO',
  MIDDLEWARE = 'MIDDLEWARE'
}

/** Bean 메타데이터 인터페이스 */
export interface BeanMetadata {
  /** Bean의 고유 이름 */
  name: string;
  /** Bean 타입 */
  type: BeanType;
  /** Bean 스코프 */
  scope: BeanScope;
  /** Bean 우선순위 (낮을수록 우선) */
  priority: number;
  /** Bean이 지연 로딩되는지 여부 */
  lazy: boolean;
  /** Bean이 활성 프로파일에 의존하는지 여부 */
  profiles: string[];
  /** Bean의 초기화 메서드명 */
  initMethod?: string;
  /** Bean의 소멸 메서드명 */
  destroyMethod?: string;
  /** Bean의 설정 정보 */
  configuration?: any;
}

/** Bean 정의 인터페이스 */
export interface BeanDefinition {
  /** Bean 메타데이터 */
  metadata: BeanMetadata;
  /** Bean의 생성자 함수 */
  target: new (...args: any[]) => any;
  /** Bean 인스턴스 (싱글톤인 경우) */
  instance?: any;
  /** 의존성 주입할 속성들 */
  dependencies: Map<string, DependencyDefinition>;
  /** Bean 생성 완료 여부 */
  initialized: boolean;
  /** Bean 소멸 완료 여부 */
  destroyed: boolean;
}

/** 의존성 정의 인터페이스 */
export interface DependencyDefinition {
  /** 속성명 */
  propertyKey: string;
  /** 의존성 타입 */
  type: any;
  /** 의존성이 필수인지 여부 */
  required: boolean;
  /** 의존성이 배열인지 여부 */
  isArray: boolean;
  /** 한정자 (Qualifier) */
  qualifier?: string;
}

/** Bean 생성 팩토리 인터페이스 */
export interface BeanFactory {
  /** Bean 인스턴스 생성 */
  createBean<T>(definition: BeanDefinition): T;
  /** Bean 의존성 주입 */
  injectDependencies(target: any, dependencies: Map<string, DependencyDefinition>): void;
  /** Bean 초기화 메서드 호출 */
  callInitMethod(target: any, methodName?: string): Promise<void>;
  /** Bean 소멸 메서드 호출 */
  callDestroyMethod(target: any, methodName?: string): Promise<void>;
}

/** 컴포넌트 스캐너 인터페이스 */
export interface ComponentScanner {
  /** 지정된 경로에서 컴포넌트 스캔 */
  scan(paths: string[]): Promise<BeanDefinition[]>;
  /** 특정 클래스에서 Bean 정의 추출 */
  extractBeanDefinition(target: any): BeanDefinition | null;
}

/** DI 컨테이너 인터페이스 */
export interface IDIContainer {
  /** 컨테이너 초기화 */
  initialize(scanPaths: string[]): Promise<void>;
  /** Bean 등록 */
  registerBean(definition: BeanDefinition): void;
  /** Bean 조회 */
  getBean<T>(type: new (...args: any[]) => T): T;
  /** Bean 조회 (이름으로) */
  getBeanByName<T>(name: string): T;
  /** 특정 타입의 Bean들 조회 */
  getBeansByType<T>(type: new (...args: any[]) => T): T[];
  /** Bean 타입별 조회 */
  findBeansByType(beanType: BeanType): BeanDefinition[];
  /** 의존성 주입 */
  injectDependencies(target: any): void;
  /** 컨테이너 소멸 */
  destroy(): Promise<void>;
  /** 모든 Bean 정의 조회 */
  getAllBeanDefinitions(): BeanDefinition[];
}

/** Bean 생명주기 이벤트 */
export interface BeanLifecycleEvent {
  /** 이벤트 타입 */
  type: 'creating' | 'created' | 'destroying' | 'destroyed';
  /** Bean 정의 */
  definition: BeanDefinition;
  /** Bean 인스턴스 */
  instance?: any;
  /** 타임스탬프 */
  timestamp: number;
}

/** Bean 생명주기 리스너 인터페이스 */
export interface BeanLifecycleListener {
  /** Bean 생성 시작 시 호출 */
  onBeanCreating?(event: BeanLifecycleEvent): void;
  /** Bean 생성 완료 시 호출 */
  onBeanCreated?(event: BeanLifecycleEvent): void;
  /** Bean 소멸 시작 시 호출 */
  onBeanDestroying?(event: BeanLifecycleEvent): void;
  /** Bean 소멸 완료 시 호출 */
  onBeanDestroyed?(event: BeanLifecycleEvent): void;
}

/** DI 컨테이너 설정 */
export interface DIContainerConfig {
  /** Eager 초기화 여부 */
  eagerInitialization: boolean;
  /** 순환 의존성 허용 여부 */
  allowCircularDependency: boolean;
  /** 생명주기 리스너 */
  lifecycleListeners: BeanLifecycleListener[];
  /** 활성 프로파일 */
  activeProfiles: string[];
}