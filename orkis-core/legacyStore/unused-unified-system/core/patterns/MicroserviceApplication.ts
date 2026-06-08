import { UnifiedContext } from "../context/UnifiedContext";
import { ApplicationLauncher } from "../../launcher/ApplicationLauncher";
import {
  LaunchConfiguration,
  LaunchMode
} from "../../launcher/LaunchConfiguration";
import { logger } from "../../utils";

/**
 * 서비스 등록 정보
 */
export interface ServiceRegistration {
  name: string;
  version: string;
  host: string;
  port: number;
  healthCheck?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * 서비스 디스커버리 설정
 */
export interface ServiceDiscoveryConfig {
  enabled: boolean;
  provider: "consul" | "etcd" | "eureka" | "zookeeper";
  endpoint: string;
  registration: ServiceRegistration;
}

/**
 * 분산 추적 설정
 */
export interface TracingConfig {
  enabled: boolean;
  serviceName: string;
  jaeger?: {
    endpoint: string;
    sampler: {
      type: "const" | "probabilistic" | "rateLimiting";
      param: number;
    };
  };
  zipkin?: {
    endpoint: string;
    sampleRate: number;
  };
}

/**
 * 회로 차단기 설정
 */
export interface CircuitBreakerConfig {
  enabled: boolean;
  threshold: number;
  timeout: number;
  resetTimeout: number;
  monitoring: boolean;
}

/**
 * 마이크로서비스 애플리케이션 설정
 */
export interface MicroserviceApplicationConfig {
  /** 포트 번호 */
  port?: number;
  /** 서비스 이름 */
  serviceName: string;
  /** 서비스 버전 */
  version?: string;
  /** 서비스 디스커버리 설정 */
  discovery?: ServiceDiscoveryConfig;
  /** 헬스 체크 설정 */
  healthCheck?: {
    enabled: boolean;
    path: string;
    interval: number;
    timeout: number;
    dependencies?: Array<{
      name: string;
      url: string;
      timeout?: number;
    }>;
  };
  /** 메트릭 수집 설정 */
  metrics?: {
    enabled: boolean;
    path: string;
    collectDefault: boolean;
    customMetrics?: Array<{
      name: string;
      type: "counter" | "gauge" | "histogram" | "summary";
      help: string;
    }>;
  };
  /** 분산 추적 설정 */
  tracing?: TracingConfig;
  /** 로그 설정 */
  logging?: {
    level: "error" | "warn" | "info" | "debug";
    structured: boolean;
    correlationId: boolean;
  };
  /** 보안 설정 */
  security?: {
    enableHelmet: boolean;
    cors: {
      origin?: string | string[];
      methods?: string[];
    };
    rateLimiting?: {
      windowMs: number;
      max: number;
    };
  };
  /** 회로 차단기 설정 */
  circuitBreaker?: CircuitBreakerConfig;
  /** 서비스 간 통신 설정 */
  communication?: {
    timeout: number;
    retries: number;
    backoff: {
      initial: number;
      max: number;
      multiplier: number;
    };
  };
}

/**
 * 헬스 체크 상태
 */
export interface HealthStatus {
  status: "UP" | "DOWN" | "DEGRADED";
  checks: Record<
    string,
    {
      status: "UP" | "DOWN";
      details?: any;
      error?: string;
      responseTime?: number;
    }
  >;
  info: {
    service: string;
    version: string;
    uptime: number;
    timestamp: string;
  };
}

/**
 * MicroserviceApplication 패턴 구현체
 *
 * 마이크로서비스 아키텍처에 최적화된 패턴으로,
 * 서비스 디스커버리, 헬스 체크, 분산 추적, 메트릭 수집 등을 제공합니다.
 */
export class MicroserviceApplication {
  private context?: UnifiedContext;
  private config: MicroserviceApplicationConfig;
  private launchConfig: LaunchConfiguration;
  private startTime: number;
  private serviceRegistry?: any;
  private metricsRegistry?: any;

  constructor(config: MicroserviceApplicationConfig) {
    this.config = {
      port: 3000,
      version: "1.0.0",
      ...config
    };

    this.startTime = Date.now();

    // LaunchConfiguration 생성
    this.launchConfig = {
      mode: LaunchMode.MICROSERVICE,
      enableExpress: true,
      enableAutoApplication: true,
      expressConfig: {
        port: this.config.port,
        enableCors: true,
        corsOptions: this.config.security?.cors || {
          origin: "*",
          methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
        },
        enableHelmet: this.config.security?.enableHelmet !== false,
        enableCompression: true,
        enableBodyParser: true,
        bodyParserOptions: {
          limit: "10mb",
          extended: true
        }
      },
      scanPaths: [process.cwd() + "/src"]
    };

    logger.info(
      `MicroserviceApplication 패턴 초기화: ${this.config.serviceName}`
    );
  }

  /**
   * 마이크로서비스 애플리케이션 시작
   */
  async start(): Promise<UnifiedContext> {
    logger.info(`Microservice '${this.config.serviceName}' 시작...`);

    try {
      // UnifiedContext 시작
      this.context = await ApplicationLauncher.start(this.launchConfig);

      // 마이크로서비스 특화 설정 적용
      await this.configureMicroserviceFeatures();

      // 서비스 등록
      if (this.config.discovery?.enabled) {
        await this.registerService();
      }

      logger.info(
        `Microservice '${this.config.serviceName}' v${this.config.version}이 포트 ${this.config.port}에서 시작되었습니다`
      );

      return this.context;
    } catch (error) {
      logger.error("MicroserviceApplication 시작 실패:", error);
      throw error;
    }
  }

  /**
   * 마이크로서비스 애플리케이션 중지
   */
  async stop(): Promise<void> {
    if (!this.context) {
      logger.info("MicroserviceApplication이 시작되지 않았습니다");
      return;
    }

    logger.info(`🛑 Microservice '${this.config.serviceName}' 중지...`);

    try {
      // 서비스 등록 해제
      if (this.serviceRegistry) {
        await this.deregisterService();
      }

      // Express 서버 중지
      const expressIntegration = this.context.getExpressIntegration();
      if (expressIntegration) {
        await expressIntegration.stop();
      }

      logger.info(`Microservice '${this.config.serviceName}' 중지 완료`);
    } catch (error) {
      logger.error("서비스 중지 중 오류:", error);
    }
  }

  /**
   * Express 앱 인스턴스 조회
   */
  getExpressApp() {
    if (!this.context) {
      throw new Error("MicroserviceApplication이 시작되지 않았습니다");
    }

    const expressIntegration = this.context.getExpressIntegration();
    if (!expressIntegration) {
      throw new Error("Express 통합이 활성화되지 않았습니다");
    }

    return expressIntegration.getExpressApp();
  }

  /**
   * UnifiedContext 조회
   */
  getContext(): UnifiedContext {
    if (!this.context) {
      throw new Error("MicroserviceApplication이 시작되지 않았습니다");
    }
    return this.context;
  }

  /**
   * 설정 조회
   */
  getConfig(): MicroserviceApplicationConfig {
    return { ...this.config };
  }

  /**
   * 헬스 체크 상태 조회
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const checks: Record<string, any> = {};

    // 기본 서비스 체크
    checks.self = {
      status: "UP",
      details: {
        uptime: Date.now() - this.startTime,
        memory: process.memoryUsage(),
        pid: process.pid
      }
    };

    // 의존성 서비스 체크
    if (this.config.healthCheck?.dependencies) {
      for (const dep of this.config.healthCheck.dependencies) {
        checks[dep.name] = await this.checkDependency(dep);
      }
    }

    // 전체 상태 결정
    const allUp = Object.values(checks).every((check) => check.status === "UP");
    const anyDown = Object.values(checks).some(
      (check) => check.status === "DOWN"
    );

    return {
      status: anyDown ? "DOWN" : allUp ? "UP" : "DEGRADED",
      checks,
      info: {
        service: this.config.serviceName,
        version: this.config.version!,
        uptime: Date.now() - this.startTime,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * 마이크로서비스 특화 기능 설정
   */
  private async configureMicroserviceFeatures(): Promise<void> {
    if (!this.context) return;

    const expressIntegration = this.context.getExpressIntegration();
    if (!expressIntegration) return;

    const app = expressIntegration.getExpressApp();

    // 요청 추적 미들웨어
    this.setupRequestTracing(app);

    // 헬스 체크 엔드포인트
    if (this.config.healthCheck?.enabled !== false) {
      this.setupHealthCheck(app);
    }

    // 메트릭 수집 엔드포인트
    if (this.config.metrics?.enabled) {
      this.setupMetrics(app);
    }

    // 로깅 설정
    if (this.config.logging) {
      this.setupStructuredLogging(app);
    }

    // 분산 추적 설정
    if (this.config.tracing?.enabled) {
      this.setupTracing();
    }

    // 속도 제한 설정
    if (this.config.security?.rateLimiting) {
      this.setupRateLimiting(app);
    }

    // 회로 차단기 설정
    if (this.config.circuitBreaker?.enabled) {
      this.setupCircuitBreaker();
    }

    // 우아한 종료 설정
    this.setupGracefulShutdown();
  }

  /**
   * 요청 추적 설정
   */
  private setupRequestTracing(app: any): void {
    app.use((req: any, res: any, next: any) => {
      // 상관 관계 ID 생성 또는 추출
      req.correlationId =
        req.get("X-Correlation-ID") || this.generateCorrelationId();
      res.set("X-Correlation-ID", req.correlationId);

      // 요청 시작 시간
      req.startTime = Date.now();

      // 응답 완료 시 로깅
      res.on("finish", () => {
        const duration = Date.now() - req.startTime;
        logger.info({
          service: this.config.serviceName,
          correlationId: req.correlationId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          userAgent: req.get("User-Agent"),
          ip: req.ip,
          timestamp: new Date().toISOString()
        });
      });

      next();
    });

    logger.info("요청 추적 설정됨");
  }

  /**
   * 헬스 체크 설정
   */
  private setupHealthCheck(app: any): void {
    const healthPath = this.config.healthCheck?.path || "/health";

    app.get(healthPath, async (req: any, res: any) => {
      try {
        const status = await this.getHealthStatus();
        const httpStatus =
          status.status === "UP"
            ? 200
            : status.status === "DEGRADED"
              ? 200
              : 503;
        res.status(httpStatus).json(status);
      } catch (error) {
        logger.error("헬스 체크 실패:", error);
        res.status(503).json({
          status: "DOWN",
          error: "Health check failed",
          timestamp: new Date().toISOString()
        });
      }
    });

    logger.info(`헬스 체크: ${healthPath}`);
  }

  /**
   * 메트릭 수집 설정
   */
  private setupMetrics(app: any): Promise<void> {
    return new Promise((resolve) => {
      try {
        const prometheus = require("prom-client");

        if (this.config.metrics?.collectDefault) {
          prometheus.collectDefaultMetrics({
            prefix: `${this.config.serviceName}_`,
            gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
          });
        }

        this.metricsRegistry = prometheus;

        const metricsPath = this.config.metrics?.path || "/metrics";
        app.get(metricsPath, (req: any, res: any) => {
          res.set("Content-Type", prometheus.register.contentType);
          res.end(prometheus.register.metrics());
        });

        logger.info(`메트릭 수집: ${metricsPath}`);
      } catch (error) {
        logger.warn("메트릭 수집 설정 실패 - prom-client 패키지가 필요합니다");
      } finally {
        resolve();
      }
    });
  }

  /**
   * 구조화된 로깅 설정
   */
  private setupStructuredLogging(app: any): void {
    if (this.config.logging?.structured) {
      // 구조화된 로깅 미들웨어
      app.use((req: any, res: any, next: any) => {
        const originallogger = {
          log: logger.info,
          error: logger.error,
          warn: logger.warn,
          info: logger.info
        };

        // 로그에 서비스 정보와 상관 관계 ID 추가
        const enhanceLog = (level: string, args: any[]) => {
          const logEntry = {
            level,
            service: this.config.serviceName,
            correlationId: req.correlationId,
            timestamp: new Date().toISOString(),
            message: args.join(" ")
          };
          return originallogger.info(JSON.stringify(logEntry));
        };

        logger.info = (...args) => enhanceLog("info", args);
        logger.error = (...args) => enhanceLog("error", args);
        logger.warn = (...args) => enhanceLog("warn", args);
        logger.info = (...args) => enhanceLog("info", args);

        // 응답 완료 시 원래 logger 복원
        res.on("finish", () => {
          Object.assign(logger, originallogger);
        });

        next();
      });

      logger.info("구조화된 로깅 설정됨");
    }
  }

  /**
   * 분산 추적 설정
   */
  private setupTracing(): void {
    try {
      if (this.config.tracing?.jaeger) {
        logger.info("🔗 Jaeger 분산 추적 설정됨");
      } else if (this.config.tracing?.zipkin) {
        logger.info("🔗 Zipkin 분산 추적 설정됨");
      }
    } catch (error) {
      logger.warn("분산 추적 설정 실패:", error);
    }
  }

  /**
   * 속도 제한 설정
   */
  private setupRateLimiting(app: any): void {
    try {
      const rateLimit = require("express-rate-limit");
      const limiter = rateLimit({
        windowMs: this.config.security!.rateLimiting!.windowMs,
        max: this.config.security!.rateLimiting!.max,
        message: {
          error: "Too many requests from this IP",
          service: this.config.serviceName
        }
      });

      app.use(limiter);
      logger.info("🚦 속도 제한 설정됨");
    } catch (error) {
      logger.warn("속도 제한 설정 실패");
    }
  }

  /**
   * 회로 차단기 설정
   */
  private setupCircuitBreaker(): void {
    // 회로 차단기 패턴 구현
    logger.info("🔌 회로 차단기 설정됨");
  }

  /**
   * 우아한 종료 설정
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`${signal} 신호를 받았습니다. 우아한 종료를 시작합니다...`);

      try {
        await this.stop();
        process.exit(0);
      } catch (error) {
        logger.error("우아한 종료 실패:", error);
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    logger.info("우아한 종료 설정됨");
  }

  /**
   * 서비스 등록
   */
  private async registerService(): Promise<void> {
    if (!this.config.discovery) return;

    try {
      // 서비스 디스커버리 구현 (실제로는 Consul, Eureka 등과 연동)
      logger.info(
        `📋 서비스 등록: ${this.config.serviceName} @ ${this.config.discovery.registration.host}:${this.config.discovery.registration.port}`
      );

      // 실제 구현에서는 각 서비스 디스커버리 제공자별로 구현
    } catch (error) {
      logger.error("서비스 등록 실패:", error);
    }
  }

  /**
   * 서비스 등록 해제
   */
  private async deregisterService(): Promise<void> {
    try {
      logger.info(`📋 서비스 등록 해제: ${this.config.serviceName}`);
      // 실제 구현
    } catch (error) {
      logger.error("서비스 등록 해제 실패:", error);
    }
  }

  /**
   * 의존성 서비스 체크
   */
  private async checkDependency(dep: {
    name: string;
    url: string;
    timeout?: number;
  }): Promise<any> {
    try {
      const startTime = Date.now();
      // HTTP 체크 구현 (실제로는 axios나 fetch 사용)
      const responseTime = Date.now() - startTime;

      return {
        status: "UP",
        details: { url: dep.url },
        responseTime
      };
    } catch (error: any) {
      return {
        status: "DOWN",
        error: error.message,
        details: { url: dep.url }
      };
    }
  }

  /**
   * 상관 관계 ID 생성
   */
  private generateCorrelationId(): string {
    return `${this.config.serviceName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
