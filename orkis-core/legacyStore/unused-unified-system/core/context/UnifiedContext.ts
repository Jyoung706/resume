import {
  LaunchMode,
  LaunchConfiguration,
  LaunchConfigurationUtils
} from "../../launcher/LaunchConfiguration";
import {
  DIContainer,
  BeanType,
  BeanDefinition,
  IDIContainer
} from "../container";
import {
  ExpressIntegration,
  ExpressIntegrationConfig,
  IntegrationState
} from "../../express/integration";
// import { ApplicationContextCompatibilityLayer } from "../compatibility";
import { logger } from "../../utils";

/**
 * 통합 애플리케이션 컨텍스트
 *
 * 모든 사용 패턴을 하나의 일관된 시스템으로 지원하는 핵심 컨텍스트입니다.
 * DI 컨테이너, Express 서버, 생명주기 관리를 통합적으로 제공합니다.
 */
export class UnifiedContext {
  /** DI 컨테이너 */
  private diContainer: IDIContainer;

  /** Express 통합 객체 */
  private expressIntegration?: ExpressIntegration;

  /** ApplicationContext 호환성 레이어 */
  // private applicationContextCompatibility?: ApplicationContextCompatibilityLayer;

  /** 생명주기 관리자 */
  private lifecycleManager?: any; // TODO: LifecycleManager 타입 정의

  /** 런처 설정 */
  private config: LaunchConfiguration = {};

  /** 컨텍스트 상태 */
  private state: "initializing" | "running" | "shutting-down" | "shutdown" =
    "initializing";

  /** 시작 시간 */
  private startTime?: Date;

  /** 종료 시간 */
  private shutdownTime?: Date;

  constructor() {
    this.diContainer = new DIContainer();
  }

  /**
   * 통합 컨텍스트 시작
   */
  async launch(config: LaunchConfiguration): Promise<void> {
    if (this.state !== "initializing") {
      throw new Error(`Cannot launch context in ${this.state} state`);
    }

    try {
      this.startTime = new Date();
      this.config = LaunchConfigurationUtils.merge(config);

      logger.info("Starting ORKIS Core Unified Context...");
      logger.info(`Launch Mode: ${this.config.mode}`);
      logger.info(`Scan Paths: ${this.config.scanPaths?.join(", ")}`);

      // 설정 검증
      LaunchConfigurationUtils.validate(this.config);

      // 1. DI 컨테이너 초기화
      await this.initializeDIContainer();

      // 2. ApplicationContext 호환성 레이어 초기화
      this.initializeCompatibilityLayer();

      // 3. 모드별 처리
      await this.processLaunchMode();

      // 4. 생명주기 이벤트 발생
      await this.fireApplicationStartedEvent();

      this.state = "running";
      logger.info("ORKIS Core Unified Context started successfully");

      // 시작 완료 콜백
      if (this.config.onStarted) {
        await this.config.onStarted(this);
      }
    } catch (error) {
      logger.error("Failed to start Unified Context:", error);
      this.state = "shutdown";
      throw error;
    }
  }

  /**
   * Bean 조회 (타입 기반)
   */
  getBean<T>(type: new (...args: any[]) => T): T {
    this.assertRunning();
    return this.diContainer.getBean(type);
  }

  /**
   * Bean 조회 (이름 기반)
   */
  getBeanByName<T>(name: string): T {
    this.assertRunning();
    return this.diContainer.getBeanByName<T>(name);
  }

  /**
   * 의존성 주입
   */
  injectDependencies(target: any): void {
    this.assertRunning();
    this.diContainer.injectDependencies(target);
  }

  /**
   * DI 컨테이너 직접 접근
   */
  getDIContainer(): IDIContainer {
    return this.diContainer;
  }

  /**
   * Express 통합 시스템 접근
   */
  getExpressIntegration(): ExpressIntegration | undefined {
    return this.expressIntegration;
  }

  /**
   * ApplicationContext 호환성 레이어 접근
   */
  // getApplicationContextCompatibility():
  //   | ApplicationContextCompatibilityLayer
  //   | undefined {
  //   return this.applicationContextCompatibility;
  // }

  /**
   * 현재 설정 조회
   */
  getConfiguration(): LaunchConfiguration {
    return { ...this.config }; // 불변성 보장
  }

  /**
   * 컨텍스트 상태 조회
   */
  getState(): string {
    return this.state;
  }

  /**
   * 실행 시간 조회
   */
  getUptime(): number {
    if (!this.startTime) return 0;
    return Date.now() - this.startTime.getTime();
  }

  /**
   * 컨텍스트 종료
   */
  async shutdown(): Promise<void> {
    if (this.state === "shutdown" || this.state === "shutting-down") {
      logger.info("Context already shutting down or shutdown");
      return;
    }

    logger.info("🛑 Shutting down ORKIS Core Unified Context...");
    this.state = "shutting-down";
    this.shutdownTime = new Date();

    try {
      // 종료 전 콜백
      if (this.config.onBeforeShutdown) {
        await this.config.onBeforeShutdown(this);
      }

      // Express 서버 종료
      if (this.expressIntegration) {
        await this.expressIntegration.stop();
      }

      // DI 컨테이너 소멸
      if (this.diContainer) {
        await this.diContainer.destroy();
      }

      this.state = "shutdown";
      logger.info("ORKIS Core Unified Context shutdown completed");
    } catch (error) {
      logger.error("Error during context shutdown:", error);
      this.state = "shutdown";
      throw error;
    }
  }

  /**
   * DI 컨테이너 초기화
   */
  private async initializeDIContainer(): Promise<void> {
    logger.info("Initializing DI Container...");

    // DI 설정 적용
    if (this.config.diConfig) {
      // TODO: DIContainer 설정 적용
      logger.info("Applying DI configuration...");
    }

    // 컴포넌트 스캔 및 초기화
    await this.diContainer.initialize(this.config.scanPaths || []);

    logger.info("DI Container initialized successfully");
  }

  /**
   * ApplicationContext 호환성 레이어 초기화
   */
  private initializeCompatibilityLayer(): void {
    logger.info("Initializing ApplicationContext compatibility layer...");

    // 호환성 레이어 생성
    // this.applicationContextCompatibility =
    //   new ApplicationContextCompatibilityLayer(this);

    logger.info("ApplicationContext compatibility layer initialized");
  }

  /**
   * 실행 모드별 처리
   */
  private async processLaunchMode(): Promise<void> {
    switch (this.config.mode) {
      case LaunchMode.AUTO:
        await this.autoModeLaunch();
        break;

      case LaunchMode.WEB_EXPLICIT:
        await this.webExplicitLaunch();
        break;

      case LaunchMode.DI_ONLY:
        logger.info("DI-only mode: Skipping Express server initialization");
        break;

      case LaunchMode.CUSTOM:
        await this.customLaunch();
        break;

      default:
        throw new Error(`Unsupported launch mode: ${this.config.mode}`);
    }
  }

  /**
   * 자동 모드 실행
   */
  private async autoModeLaunch(): Promise<void> {
    logger.info("Processing AUTO mode launch...");

    // @Application 데코레이터가 있는 Bean 찾기
    const applicationBeans = this.diContainer.findBeansByType(
      BeanType.APPLICATION
    );
    logger.info(`Found ${applicationBeans.length} @Application beans`);

    if (applicationBeans.length === 0) {
      logger.info("No @Application found, running in DI-only mode");
      return;
    }

    // 활성 애플리케이션 선택
    const appBean = this.selectActiveApplication(applicationBeans);
    if (appBean) {
      logger.info(`Selected application: ${appBean.metadata.name}`);
      await this.startExpressServer(appBean);
    }
  }

  /**
   * 명시적 웹 모드 실행
   */
  private async webExplicitLaunch(): Promise<void> {
    logger.info("Processing WEB_EXPLICIT mode launch...");

    if (this.config.customApplicationClass) {
      // 사용자 지정 애플리케이션 클래스 사용
      const appInstance = this.diContainer.getBean(
        this.config.customApplicationClass
      );
      await this.startExpressServerWithCustomApp(appInstance);
    } else {
      // 기본 Express 서버 시작
      await this.startDefaultExpressServer();
    }
  }

  /**
   * 커스텀 모드 실행
   */
  private async customLaunch(): Promise<void> {
    logger.info("Processing CUSTOM mode launch...");

    if (this.config.customInitializer) {
      await this.config.customInitializer(this);
    } else {
      throw new Error("Custom mode requires customInitializer function");
    }
  }

  /**
   * 활성 애플리케이션 선택
   */
  private selectActiveApplication(
    applicationBeans: BeanDefinition[]
  ): BeanDefinition | null {
    // 1. CoreDefultApplication이 아닌 Application 우선
    const customApps = applicationBeans.filter(
      (bean) => bean.metadata.name !== "CoreDefultApplication"
    );

    if (customApps.length > 0) {
      if (customApps.length > 1) {
        // 우선순위로 정렬
        customApps.sort((a, b) => a.metadata.priority - b.metadata.priority);
        logger.warn(
          `Multiple custom @Application found. Using highest priority: ${customApps[0].metadata.name}`
        );
      }
      return customApps[0];
    }

    // 2. CoreDefultApplication을 fallback으로 사용
    const defaultApp = applicationBeans.find(
      (bean) => bean.metadata.name === "CoreDefultApplication"
    );

    if (defaultApp) {
      logger.info("Using CoreDefultApplication as fallback");
      return defaultApp;
    }

    return null;
  }

  /**
   * Express 서버 시작 (Application Bean 사용)
   */
  private async startExpressServer(appBean: BeanDefinition): Promise<void> {
    logger.info(`Starting Express server with ${appBean.metadata.name}...`);

    try {
      // Application Bean 인스턴스 생성
      const appInstance = this.diContainer.getBeanByName(appBean.metadata.name);

      // Express 통합 설정
      const integrationConfig: ExpressIntegrationConfig = {
        expressConfig: this.config.expressConfig,
        autoRegisterControllers: true,
        autoRegisterMiddleware: true,
        useDefaultErrorHandler: true,
        enableRouteLogging: true,
        routePrefix: this.config.expressConfig?.routePrefix
      };

      // Express 통합 시스템 초기화
      this.expressIntegration = new ExpressIntegration(
        this.diContainer,
        integrationConfig
      );

      // Express 통합 시작
      await this.expressIntegration.start();

      logger.info(`Express Integration started successfully`);

      // main() 메서드가 있으면 호출
      if (typeof (appInstance as any).main === "function") {
        const result = (appInstance as any).main();
        if (result instanceof Promise) {
          await result;
        }
        logger.info(`Application.main() completed: ${appBean.metadata.name}`);
      }
    } catch (error) {
      logger.error(`Failed to start Express server:`, error);
      throw error;
    }
  }

  /**
   * 커스텀 애플리케이션으로 Express 서버 시작
   */
  private async startExpressServerWithCustomApp(
    appInstance: any
  ): Promise<void> {
    logger.info("Starting Express server with custom application...");

    // Express 통합 설정
    const integrationConfig: ExpressIntegrationConfig = {
      expressConfig: this.config.expressConfig,
      autoRegisterControllers: true,
      autoRegisterMiddleware: true,
      useDefaultErrorHandler: true,
      enableRouteLogging: true,
      routePrefix: this.config.expressConfig?.routePrefix
    };

    // Express 통합 시스템 초기화
    this.expressIntegration = new ExpressIntegration(
      this.diContainer,
      integrationConfig
    );

    // Express 통합 시작
    await this.expressIntegration.start();

    logger.info("Custom Express application started successfully");
  }

  /**
   * 기본 Express 서버 시작
   */
  private async startDefaultExpressServer(): Promise<void> {
    logger.info("Starting default Express server...");

    // Express 통합 설정
    const integrationConfig: ExpressIntegrationConfig = {
      expressConfig: this.config.expressConfig,
      autoRegisterControllers: true,
      autoRegisterMiddleware: true,
      useDefaultErrorHandler: true,
      enableRouteLogging: true,
      routePrefix: this.config.expressConfig?.routePrefix
    };

    // Express 통합 시스템 초기화
    this.expressIntegration = new ExpressIntegration(
      this.diContainer,
      integrationConfig
    );

    // Express 통합 시작
    await this.expressIntegration.start();

    logger.info("Default Express server started successfully");
  }

  /**
   * 애플리케이션 시작 완료 이벤트 발생
   */
  private async fireApplicationStartedEvent(): Promise<void> {
    logger.info("Application started event fired");
    // TODO: 이벤트 시스템 구현
  }

  /**
   * 컨텍스트 실행 상태 확인
   */
  private assertRunning(): void {
    if (this.state !== "running") {
      throw new Error(`Context is not running. Current state: ${this.state}`);
    }
  }
}
