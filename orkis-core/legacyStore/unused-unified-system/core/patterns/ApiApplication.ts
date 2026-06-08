import { UnifiedContext } from "../context/UnifiedContext";
import { ApplicationLauncher } from "../../launcher/ApplicationLauncher";
import {
  LaunchConfiguration,
  LaunchMode
} from "../../launcher/LaunchConfiguration";
import { logger } from "../../utils";

/**
 * API 애플리케이션 설정
 */
export interface ApiApplicationConfig {
  /** 포트 번호 */
  port?: number;
  /** API 버전 */
  version?: string;
  /** API 경로 접두사 */
  basePath?: string;
  /** 인증 설정 */
  authentication?: {
    jwt?: {
      secret: string;
      expiresIn?: string;
    };
    apiKey?: {
      header: string;
      required: boolean;
    };
  };
  /** CORS 설정 */
  cors?: {
    origin?: string | string[];
    methods?: string[];
    allowedHeaders?: string[];
    credentials?: boolean;
  };
  /** 속도 제한 설정 */
  rateLimiting?: {
    windowMs: number;
    max: number;
    message?: string;
  };
  /** API 문서화 설정 */
  documentation?: {
    enabled: boolean;
    title?: string;
    description?: string;
    version?: string;
    path?: string;
  };
  /** 응답 압축 설정 */
  compression?: {
    enabled: boolean;
    threshold?: number;
  };
  /** 로깅 설정 */
  logging?: {
    enabled: boolean;
    level: "error" | "warn" | "info" | "debug";
    includeBody?: boolean;
  };
  /** 요청 검증 설정 */
  validation?: {
    enabled: boolean;
    stripUnknown?: boolean;
  };
}

/**
 * API 응답 래퍼
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    version: string;
    requestId?: string;
  };
}

/**
 * ApiApplication 패턴 구현체
 *
 * REST API 개발에 최적화된 패턴으로,
 * 인증, 검증, 문서화, 속도 제한 등 API 개발에 필요한 기능을 제공합니다.
 */
export class ApiApplication {
  private context?: UnifiedContext;
  private config: ApiApplicationConfig;
  private launchConfig: LaunchConfiguration;

  constructor(config: ApiApplicationConfig = {}) {
    this.config = {
      port: 3000,
      version: "1.0.0",
      basePath: "/api",
      ...config
    };

    // LaunchConfiguration 생성
    this.launchConfig = {
      mode: LaunchMode.API,
      enableExpress: true,
      enableAutoApplication: true,
      expressConfig: {
        port: this.config.port,
        enableCors: true,
        corsOptions: this.config.cors || {
          origin: "*",
          methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
          allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
          credentials: false
        },
        enableHelmet: true,
        enableCompression: this.config.compression?.enabled !== false,
        enableBodyParser: true,
        bodyParserOptions: {
          limit: "50mb",
          extended: true
        }
      },
      scanPaths: [process.cwd() + "/src"]
    };

    logger.info("ApiApplication 패턴 초기화");
  }

  /**
   * API 애플리케이션 시작
   */
  async start(): Promise<UnifiedContext> {
    logger.info("ApiApplication 시작...");

    try {
      // UnifiedContext 시작
      this.context = await ApplicationLauncher.start(this.launchConfig);

      // API 애플리케이션 특화 설정 적용
      await this.configureApiFeatures();

      logger.info(
        `ApiApplication이 포트 ${this.config.port}에서 시작되었습니다`
      );
      logger.info(`API 경로: ${this.config.basePath}`);
      logger.info(`📜 API 버전: ${this.config.version}`);

      return this.context;
    } catch (error) {
      logger.error("ApiApplication 시작 실패:", error);
      throw error;
    }
  }

  /**
   * API 애플리케이션 중지
   */
  async stop(): Promise<void> {
    if (!this.context) {
      logger.info("ApiApplication이 시작되지 않았습니다");
      return;
    }

    logger.info("🛑 ApiApplication 중지...");

    const expressIntegration = this.context.getExpressIntegration();
    if (expressIntegration) {
      await expressIntegration.stop();
    }

    logger.info("ApiApplication 중지 완료");
  }

  /**
   * Express 앱 인스턴스 조회
   */
  getExpressApp() {
    if (!this.context) {
      throw new Error("ApiApplication이 시작되지 않았습니다");
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
      throw new Error("ApiApplication이 시작되지 않았습니다");
    }
    return this.context;
  }

  /**
   * 설정 조회
   */
  getConfig(): ApiApplicationConfig {
    return { ...this.config };
  }

  /**
   * 표준화된 API 응답 생성
   */
  static createResponse<T>(
    data?: T,
    meta?: { requestId?: string; [key: string]: any }
  ): ApiResponse<T> {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        ...meta
      }
    };
  }

  /**
   * 표준화된 에러 응답 생성
   */
  static createErrorResponse(
    code: string,
    message: string,
    details?: any,
    meta?: { requestId?: string; [key: string]: any }
  ): ApiResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        ...meta
      }
    };
  }

  /**
   * API 애플리케이션 특화 기능 설정
   */
  private async configureApiFeatures(): Promise<void> {
    if (!this.context) return;

    const expressIntegration = this.context.getExpressIntegration();
    if (!expressIntegration) return;

    const app = expressIntegration.getExpressApp();

    // 요청 ID 생성 미들웨어
    app.use((req: any, res: any, next: any) => {
      req.requestId = this.generateRequestId();
      res.set("X-Request-ID", req.requestId);
      next();
    });

    // API 로깅 미들웨어
    if (this.config.logging?.enabled !== false) {
      this.setupApiLogging(app);
    }

    // 속도 제한 설정
    if (this.config.rateLimiting) {
      this.setupRateLimiting(app);
    }

    // JWT 인증 설정
    if (this.config.authentication?.jwt) {
      this.setupJwtAuthentication(app);
    }

    // API 키 인증 설정
    if (this.config.authentication?.apiKey) {
      this.setupApiKeyAuthentication(app);
    }

    // 요청 검증 설정
    if (this.config.validation?.enabled !== false) {
      this.setupValidation(app);
    }

    // API 문서화 설정
    if (this.config.documentation?.enabled) {
      this.setupApiDocumentation(app);
    }

    // 표준 응답 헬퍼 설정
    this.setupResponseHelpers(app);

    // API 에러 핸들링 설정
    this.setupApiErrorHandling(app);
  }

  /**
   * API 로깅 설정
   */
  private setupApiLogging(app: any): void {
    app.use((req: any, res: any, next: any) => {
      const start = Date.now();
      const originalSend = res.send;

      res.send = function (body: any) {
        const duration = Date.now() - start;
        const logData = {
          method: req.method,
          url: req.url,
          requestId: req.requestId,
          duration: `${duration}ms`,
          statusCode: res.statusCode,
          userAgent: req.get("User-Agent"),
          ip: req.ip
        };

        if (req.config?.logging?.includeBody) {
          (logData as any).requestBody = req.body;
          (logData as any).responseBody = body;
        }

        logger.info(`[API] ${JSON.stringify(logData)}`);
        return originalSend.call(this, body);
      };

      next();
    });

    logger.info("API 로깅 설정됨");
  }

  /**
   * 속도 제한 설정
   */
  private setupRateLimiting(app: any): void {
    try {
      const rateLimit = require("express-rate-limit");
      const limiter = rateLimit({
        windowMs: this.config.rateLimiting!.windowMs,
        max: this.config.rateLimiting!.max,
        message: ApiApplication.createErrorResponse(
          "RATE_LIMIT_EXCEEDED",
          this.config.rateLimiting!.message || "Too many requests from this IP"
        ),
        standardHeaders: true,
        legacyHeaders: false
      });

      app.use(limiter);
      logger.info("🚦 속도 제한 설정됨");
    } catch (error) {
      logger.warn(
        "속도 제한 설정 실패 - express-rate-limit 패키지가 필요합니다"
      );
    }
  }

  /**
   * JWT 인증 설정
   */
  private setupJwtAuthentication(app: any): void {
    app.use("/api", (req: any, res: any, next: any) => {
      // Public 엔드포인트는 건너뛰기
      if (this.isPublicEndpoint(req.path)) {
        return next();
      }

      const token = req.get("Authorization")?.replace("Bearer ", "");

      if (!token) {
        return res
          .status(401)
          .json(
            ApiApplication.createErrorResponse(
              "AUTHENTICATION_REQUIRED",
              "JWT token is required",
              null,
              { requestId: req.requestId }
            )
          );
      }

      try {
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(
          token,
          this.config.authentication!.jwt!.secret
        );
        req.user = decoded;
        next();
      } catch (error: any) {
        return res
          .status(401)
          .json(
            ApiApplication.createErrorResponse(
              "INVALID_TOKEN",
              "Invalid JWT token",
              error.message,
              { requestId: req.requestId }
            )
          );
      }
    });

    logger.info("🔐 JWT 인증 설정됨");
  }

  /**
   * API 키 인증 설정
   */
  private setupApiKeyAuthentication(app: any): void {
    if (!this.config.authentication?.apiKey?.required) return;

    const headerName = this.config.authentication.apiKey.header;

    app.use("/api", (req: any, res: any, next: any) => {
      if (this.isPublicEndpoint(req.path)) {
        return next();
      }

      const apiKey = req.get(headerName);

      if (!apiKey) {
        return res
          .status(401)
          .json(
            ApiApplication.createErrorResponse(
              "API_KEY_REQUIRED",
              `API key is required in ${headerName} header`,
              null,
              { requestId: req.requestId }
            )
          );
      }

      // API 키 검증 로직 (실제 구현에서는 데이터베이스나 캐시에서 확인)
      req.apiKey = apiKey;
      next();
    });

    logger.info(`🔑 API 키 인증 설정됨 (${headerName})`);
  }

  /**
   * 요청 검증 설정
   */
  private setupValidation(app: any): void {
    // 기본 JSON 스키마 검증 미들웨어
    app.use((req: any, res: any, next: any) => {
      if (
        req.method !== "GET" &&
        req.body &&
        Object.keys(req.body).length > 0
      ) {
        // 요청 본문 기본 검증
        if (this.config.validation?.stripUnknown) {
          // 알 수 없는 필드 제거 로직
          req.body = this.stripUnknownFields(req.body);
        }
      }
      next();
    });

    logger.info("요청 검증 설정됨");
  }

  /**
   * API 문서화 설정
   */
  private setupApiDocumentation(app: any): void {
    const docPath = this.config.documentation?.path || "/api-docs";

    // 간단한 API 문서 엔드포인트
    app.get(docPath, (req: any, res: any) => {
      const apiDoc = {
        title: this.config.documentation?.title || "API Documentation",
        description:
          this.config.documentation?.description || "REST API Documentation",
        version: this.config.documentation?.version || this.config.version,
        basePath: this.config.basePath,
        endpoints: this.generateEndpointList()
      };

      res.json(
        ApiApplication.createResponse(apiDoc, { requestId: req.requestId })
      );
    });

    logger.info(`API 문서: ${docPath}`);
  }

  /**
   * 응답 헬퍼 설정
   */
  private setupResponseHelpers(app: any): void {
    app.use((req: any, res: any, next: any) => {
      // 성공 응답 헬퍼
      res.success = (data: any, meta?: any) => {
        return res.json(
          ApiApplication.createResponse(data, {
            requestId: req.requestId,
            ...meta
          })
        );
      };

      // 에러 응답 헬퍼
      res.error = (
        code: string,
        message: string,
        details?: any,
        statusCode = 400
      ) => {
        return res.status(statusCode).json(
          ApiApplication.createErrorResponse(code, message, details, {
            requestId: req.requestId
          })
        );
      };

      next();
    });
  }

  /**
   * API 에러 핸들링 설정
   */
  private setupApiErrorHandling(app: any): void {
    // 404 핸들러
    app.use((req: any, res: any, next: any) => {
      res
        .status(404)
        .json(
          ApiApplication.createErrorResponse(
            "ENDPOINT_NOT_FOUND",
            "The requested endpoint was not found",
            { path: req.url, method: req.method },
            { requestId: req.requestId }
          )
        );
    });

    // 전역 에러 핸들러
    app.use((error: any, req: any, res: any, next: any) => {
      logger.error("API Error:", error);

      const statusCode = error.status || error.statusCode || 500;
      const isDevelopment = process.env.NODE_ENV !== "production";

      res
        .status(statusCode)
        .json(
          ApiApplication.createErrorResponse(
            error.code || "INTERNAL_SERVER_ERROR",
            error.message || "Internal server error occurred",
            isDevelopment ? error.stack : undefined,
            { requestId: req.requestId }
          )
        );
    });

    logger.info("API 에러 핸들링 설정됨");
  }

  /**
   * 요청 ID 생성
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Public 엔드포인트 확인
   */
  private isPublicEndpoint(path: string): boolean {
    const publicPaths = [
      "/health",
      "/status",
      "/api-docs",
      "/auth/login",
      "/auth/register"
    ];

    return publicPaths.some((publicPath) => path.startsWith(publicPath));
  }

  /**
   * 알 수 없는 필드 제거
   */
  private stripUnknownFields(obj: any): any {
    // 간단한 구현 - 실제로는 스키마 기반으로 검증
    if (typeof obj === "object" && obj !== null) {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith("_") || key.includes("$")) continue;
        cleaned[key] =
          typeof value === "object" ? this.stripUnknownFields(value) : value;
      }
      return cleaned;
    }
    return obj;
  }

  /**
   * 엔드포인트 목록 생성
   */
  private generateEndpointList(): any[] {
    // 실제 구현에서는 등록된 라우트에서 추출
    return [
      { method: "GET", path: "/health", description: "Health check endpoint" },
      { method: "GET", path: "/api-docs", description: "API documentation" }
    ];
  }
}
