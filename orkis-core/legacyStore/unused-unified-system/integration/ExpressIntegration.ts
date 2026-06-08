import {
  Application as ExpressApp,
  Request,
  Response,
  NextFunction,
  Router
} from "express";
import { IDIContainer, BeanDefinition, BeanType } from "../../core/container";
import { ExpressServer } from "../server/ExpressServer";
import {
  ApplicationDetector,
  ApplicationDetectionResult
} from "../detection/ApplicationDetector";
import {
  ControllerDetector,
  ControllerDetectionResult
} from "../detection/ControllerDetector";
import { ExpressConfig } from "../../launcher/LaunchConfiguration";
import {
  RequestMappingBridge,
  RequestMappingMetadata
} from "../../core/compatibility/RequestMappingBridge";
import { logger } from "../../utils";

/**
 * Express 통합 상태
 */
export enum IntegrationState {
  INITIALIZING = "initializing",
  CONFIGURED = "configured",
  STARTED = "started",
  STOPPED = "stopped",
  ERROR = "error"
}

/**
 * Express 통합 설정
 */
export interface ExpressIntegrationConfig {
  /** Express 서버 설정 */
  expressConfig?: ExpressConfig;
  /** 자동 Controller 등록 여부 */
  autoRegisterControllers?: boolean;
  /** 자동 Middleware 등록 여부 */
  autoRegisterMiddleware?: boolean;
  /** 기본 에러 핸들러 사용 여부 */
  useDefaultErrorHandler?: boolean;
  /** 라우트 로깅 여부 */
  enableRouteLogging?: boolean;
  /** 라우트 접두사 */
  routePrefix?: string;
}

/**
 * 라우트 등록 결과
 */
export interface RouteRegistrationResult {
  /** 등록된 라우트 개수 */
  registeredRoutes: number;
  /** 등록된 컨트롤러 개수 */
  registeredControllers: number;
  /** 등록 실패한 컨트롤러들 */
  failedControllers: Array<{
    controller: BeanDefinition;
    error: string;
  }>;
  /** 등록된 라우트 목록 */
  routes: Array<{
    method: string;
    path: string;
    controller: string;
    handler: string;
  }>;
}

/**
 * Express와 DI 컨테이너 통합 클래스
 *
 * DI 컨테이너에서 관리되는 Bean들을 Express 애플리케이션과 통합하여
 * 자동으로 Controller, Middleware 등을 등록하고 라우팅을 설정합니다.
 */
export class ExpressIntegration {
  /** DI 컨테이너 */
  private diContainer: IDIContainer;

  /** Express 서버 */
  private expressServer: ExpressServer;

  /** 통합 설정 */
  private config: ExpressIntegrationConfig;

  /** 현재 상태 */
  private state: IntegrationState = IntegrationState.INITIALIZING;

  /** 등록된 라우트들 */
  private registeredRoutes: Array<{
    method: string;
    path: string;
    controller: string;
    handler: string;
  }> = [];

  /** Application 감지 결과 */
  private applicationDetection?: ApplicationDetectionResult;

  /** Controller 감지 결과 */
  private controllerDetection?: ControllerDetectionResult;

  constructor(
    diContainer: IDIContainer,
    config: ExpressIntegrationConfig = {}
  ) {
    this.diContainer = diContainer;
    this.config = {
      autoRegisterControllers: true,
      autoRegisterMiddleware: true,
      useDefaultErrorHandler: true,
      enableRouteLogging: true,
      routePrefix: "",
      ...config
    };

    // Express 서버 생성
    this.expressServer = new ExpressServer(this.config.expressConfig);

    logger.info("ExpressIntegration initialized with config:", this.config);
  }

  /**
   * Express 통합 시작
   */
  async start(): Promise<void> {
    if (this.state === IntegrationState.STARTED) {
      logger.info("ExpressIntegration is already started");
      return;
    }

    try {
      logger.info("Starting Express Integration...");
      this.state = IntegrationState.INITIALIZING;

      // 1. 컴포넌트 감지 및 분석
      await this.detectComponents();

      // 2. Express 애플리케이션 구성
      await this.configureExpress();

      // 3. 컨트롤러 등록
      if (this.config.autoRegisterControllers) {
        await this.registerControllers();
      }

      // 4. 미들웨어 등록
      if (this.config.autoRegisterMiddleware) {
        await this.registerMiddleware();
      }

      // 5. Express 서버 시작
      await this.expressServer.start();

      this.state = IntegrationState.STARTED;
      logger.info("Express Integration started successfully");
    } catch (error) {
      logger.error("Failed to start Express Integration:", error);
      this.state = IntegrationState.ERROR;
      throw error;
    }
  }

  /**
   * Express 통합 중지
   */
  async stop(): Promise<void> {
    if (this.state === IntegrationState.STOPPED) {
      logger.info("ExpressIntegration is already stopped");
      return;
    }

    try {
      logger.info("🛑 Stopping Express Integration...");

      // Express 서버 중지
      await this.expressServer.stop();

      // 등록된 라우트 정리
      this.registeredRoutes = [];

      this.state = IntegrationState.STOPPED;
      logger.info("Express Integration stopped");
    } catch (error) {
      logger.error("Error stopping Express Integration:", error);
      throw error;
    }
  }

  /**
   * Express 애플리케이션 인스턴스 조회
   */
  getExpressApp(): ExpressApp {
    return this.expressServer.getApp();
  }

  /**
   * Express 서버 인스턴스 조회
   */
  getExpressServer(): ExpressServer {
    return this.expressServer;
  }

  /**
   * 통합 상태 조회
   */
  getState(): IntegrationState {
    return this.state;
  }

  /**
   * 등록된 라우트 목록 조회
   */
  getRegisteredRoutes(): Array<{
    method: string;
    path: string;
    controller: string;
    handler: string;
  }> {
    return [...this.registeredRoutes];
  }

  /**
   * Application 감지 결과 조회
   */
  getApplicationDetection(): ApplicationDetectionResult | undefined {
    return this.applicationDetection;
  }

  /**
   * Controller 감지 결과 조회
   */
  getControllerDetection(): ControllerDetectionResult | undefined {
    return this.controllerDetection;
  }

  /**
   * 컴포넌트 감지 및 분석
   */
  private async detectComponents(): Promise<void> {
    logger.info("Detecting application components...");

    // DI 컨테이너에서 모든 Bean 정의 조회
    const allBeans = this.diContainer.getAllBeanDefinitions();

    // Application Bean 감지
    this.applicationDetection = ApplicationDetector.detect(allBeans);

    // Controller Bean 감지
    this.controllerDetection = ControllerDetector.detect(allBeans);

    logger.info("Component detection completed:", {
      applications: this.applicationDetection.applications.length,
      controllers: this.controllerDetection.controllers.length
    });
  }

  /**
   * Express 애플리케이션 구성
   */
  private async configureExpress(): Promise<void> {
    logger.info("Configuring Express application...");

    const app = this.expressServer.getApp();

    // 기본 설정은 ExpressServer에서 처리됨

    // 라우트 접두사 설정
    if (this.config.routePrefix) {
      logger.info(`Setting route prefix: ${this.config.routePrefix}`);
    }

    // 기본 에러 핸들러 설정
    if (this.config.useDefaultErrorHandler) {
      this.setupDefaultErrorHandler(app);
    }

    logger.info("Express application configured");
  }

  /**
   * 컨트롤러 등록
   */
  private async registerControllers(): Promise<RouteRegistrationResult> {
    logger.info("Registering controllers...");

    const result: RouteRegistrationResult = {
      registeredRoutes: 0,
      registeredControllers: 0,
      failedControllers: [],
      routes: []
    };

    if (!this.controllerDetection) {
      logger.info("No controller detection results found");
      return result;
    }

    const app = this.expressServer.getApp();
    const controllers = ControllerDetector.sortControllers(
      this.controllerDetection.controllers
    );

    for (const controllerBean of controllers) {
      try {
        logger.info(`Registering controller: ${controllerBean.metadata.name}`);

        // Controller Bean 인스턴스 생성
        const controllerInstance = this.diContainer.getBeanByName(
          controllerBean.metadata.name
        );

        // Controller 라우트 등록
        const routeCount = await this.registerControllerRoutes(
          app,
          controllerBean,
          controllerInstance
        );

        result.registeredControllers++;
        result.registeredRoutes += routeCount;

        logger.info(
          `Controller ${controllerBean.metadata.name} registered with ${routeCount} routes`
        );
      } catch (error: any) {
        logger.error(
          `Failed to register controller ${controllerBean.metadata.name}:`,
          error
        );
        result.failedControllers.push({
          controller: controllerBean,
          error: error?.message || error
        });
      }
    }

    result.routes = [...this.registeredRoutes];

    logger.info(`Controllers registration completed:`, {
      registered: result.registeredControllers,
      routes: result.registeredRoutes,
      failed: result.failedControllers.length
    });

    return result;
  }

  /**
   * 개별 Controller의 라우트 등록
   */
  private async registerControllerRoutes(
    app: ExpressApp,
    controllerBean: BeanDefinition,
    controllerInstance: any
  ): Promise<number> {
    let routeCount = 0;

    // Controller의 라우트 분석
    const routes = ControllerDetector.analyzeControllerRoutes(controllerBean);

    for (const route of routes) {
      try {
        // 라우트 경로 처리
        const fullPath = this.buildRoutePath(route.fullPath);
        const method = route.httpMethod.toLowerCase();

        // Express 라우트 핸들러 생성
        const handler = this.createRouteHandler(
          controllerInstance,
          route.methodName
        );

        // RequestMapping 메타데이터가 있으면 고급 라우트 등록 사용
        if (route.metadata) {
          RequestMappingBridge.createExpressRoute(
            app,
            this.extractControllerBasePath(controllerBean),
            route.methodName,
            route.metadata,
            handler
          );
        } else {
          // 기본 라우트 등록
          if (typeof (app as any)[method] === "function") {
            (app as any)[method](fullPath, handler);
          } else {
            logger.warn(`Unsupported HTTP method: ${route.httpMethod}`);
            continue;
          }
        }

        // 등록된 라우트 기록
        this.registeredRoutes.push({
          method: route.httpMethod,
          path: fullPath,
          controller: controllerBean.metadata.name,
          handler: route.methodName
        });

        if (this.config.enableRouteLogging) {
          logger.info(
            `  📍 ${route.httpMethod} ${fullPath} → ${controllerBean.metadata.name}.${route.methodName}`
          );
        }

        routeCount++;
      } catch (error: any) {
        logger.error(
          `Failed to register route ${route.httpMethod} ${route.fullPath}:`,
          error?.message || error
        );
      }
    }

    return routeCount;
  }

  /**
   * 라우트 핸들러 생성
   */
  private createRouteHandler(controllerInstance: any, methodName: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // 의존성 재주입 (요청별 컨텍스트)
        this.diContainer.injectDependencies(controllerInstance);

        // 메서드 실행
        const result = await controllerInstance[methodName](req, res, next);

        // 결과가 있고 응답이 아직 전송되지 않은 경우 JSON으로 응답
        if (result !== undefined && !res.headersSent) {
          res.json(result);
        }
      } catch (error: any) {
        logger.error(`Route handler error in ${methodName}:`, error);
        next(error);
      }
    };
  }

  /**
   * 라우트 경로 빌드
   */
  private buildRoutePath(path: string): string {
    let fullPath = path;

    // 라우트 접두사 적용
    if (this.config.routePrefix) {
      const prefix = this.config.routePrefix.startsWith("/")
        ? this.config.routePrefix
        : `/${this.config.routePrefix}`;
      fullPath = prefix + (path.startsWith("/") ? path : `/${path}`);
    }

    // 경로 정규화
    return fullPath.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
  }

  /**
   * 미들웨어 등록
   */
  private async registerMiddleware(): Promise<void> {
    logger.info("Registering middleware...");

    // Middleware Bean들 찾기
    const middlewareBeans = this.diContainer.findBeansByType(
      BeanType.MIDDLEWARE
    );

    if (middlewareBeans.length === 0) {
      logger.info("No middleware beans found");
      return;
    }

    const app = this.expressServer.getApp();

    for (const middlewareBean of middlewareBeans) {
      try {
        logger.info(`Registering middleware: ${middlewareBean.metadata.name}`);

        // Middleware Bean 인스턴스 생성
        const middlewareInstance = this.diContainer.getBeanByName(
          middlewareBean.metadata.name
        );

        // Express 미들웨어로 등록
        if (typeof (middlewareInstance as any).use === "function") {
          app.use((middlewareInstance as any).use.bind(middlewareInstance));
          logger.info(`Middleware ${middlewareBean.metadata.name} registered`);
        } else {
          logger.warn(
            `Middleware ${middlewareBean.metadata.name} does not have use() method`
          );
        }
      } catch (error: any) {
        logger.error(
          `Failed to register middleware ${middlewareBean.metadata.name}:`,
          error?.message || error
        );
      }
    }
  }

  /**
   * 컨트롤러의 기본 경로 추출
   */
  private extractControllerBasePath(controllerBean: BeanDefinition): string {
    try {
      // ControllerDetector의 방식과 동일하게 처리
      const controllerMetadata = Reflect.getMetadata(
        "controller",
        controllerBean.target
      );

      if (controllerMetadata) {
        if (typeof controllerMetadata === "string") {
          return controllerMetadata;
        }

        if (typeof controllerMetadata === "object" && controllerMetadata.path) {
          return controllerMetadata.path;
        }

        if (
          typeof controllerMetadata === "object" &&
          controllerMetadata.basePath
        ) {
          return controllerMetadata.basePath;
        }
      }

      // 기본값으로 클래스명 기반 경로 생성
      const className = controllerBean.metadata.name;
      if (className.endsWith("Controller")) {
        const baseName = className.slice(0, -10);
        return `/${baseName.toLowerCase()}`;
      }

      return `/${className.toLowerCase()}`;
    } catch (error: any) {
      logger.warn(
        `Failed to extract base path for ${controllerBean.metadata.name}:`,
        error?.message || error
      );
      return "/";
    }
  }

  /**
   * 기본 에러 핸들러 설정
   */
  private setupDefaultErrorHandler(app: ExpressApp): void {
    app.use((error: any, req: Request, res: Response, next: NextFunction) => {
      logger.error("Express Integration - Unhandled error:", error);

      if (res.headersSent) {
        return next(error);
      }

      const statusCode = error.status || error.statusCode || 500;
      const errorResponse = {
        error: {
          message: error.message || "Internal Server Error",
          status: statusCode,
          timestamp: new Date().toISOString(),
          path: req.path,
          method: req.method
        }
      };

      // 개발 환경에서는 스택 트레이스 포함
      if (process.env.NODE_ENV === "development") {
        (errorResponse.error as any).stack = error.stack;
      }

      res.status(statusCode).json(errorResponse);
    });
  }
}
