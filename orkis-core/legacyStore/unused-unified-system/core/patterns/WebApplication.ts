import { UnifiedContext } from "../context/UnifiedContext";
import { ApplicationLauncher } from "../../launcher/ApplicationLauncher";
import {
  LaunchConfiguration,
  LaunchMode
} from "../../launcher/LaunchConfiguration";
import { ExpressIntegration } from "../../express/integration/ExpressIntegration";
import { logger } from "../../utils";

/**
 * 웹 애플리케이션 설정
 */
export interface WebApplicationConfig {
  /** 포트 번호 */
  port?: number;
  /** 정적 파일 서빙 경로 */
  staticPath?: string;
  /** 뷰 엔진 설정 */
  viewEngine?: {
    engine: string;
    viewPath: string;
  };
  /** 세션 설정 */
  session?: {
    secret: string;
    resave?: boolean;
    saveUninitialized?: boolean;
  };
  /** CORS 설정 */
  cors?: {
    origin?: string | string[];
    credentials?: boolean;
  };
  /** 보안 헤더 설정 */
  security?: {
    helmet?: boolean;
    rateLimiting?: {
      windowMs: number;
      max: number;
    };
  };
  /** 로깅 설정 */
  logging?: {
    level: "error" | "warn" | "info" | "debug";
    format: "combined" | "common" | "dev";
  };
}

/**
 * WebApplication 패턴 구현체
 *
 * 전통적인 웹 애플리케이션 개발에 최적화된 패턴으로,
 * 정적 파일 서빙, 뷰 엔진, 세션 관리 등을 기본 제공합니다.
 */
export class WebApplication {
  private context?: UnifiedContext;
  private config: WebApplicationConfig;
  private launchConfig: LaunchConfiguration;

  constructor(config: WebApplicationConfig = {}) {
    this.config = {
      port: 3000,
      staticPath: "public",
      ...config
    };

    // LaunchConfiguration 생성
    this.launchConfig = {
      mode: LaunchMode.WEB,
      enableExpress: true,
      enableAutoApplication: true,
      expressConfig: {
        port: this.config.port,
        enableCors: !!this.config.cors,
        corsOptions: this.config.cors,
        enableHelmet: this.config.security?.helmet !== false,
        enableCompression: true,
        enableBodyParser: true,
        bodyParserOptions: {
          limit: "10mb",
          extended: true
        }
      },
      scanPaths: [process.cwd() + "/src"]
    };

    logger.info("WebApplication 패턴 초기화");
  }

  /**
   * 웹 애플리케이션 시작
   */
  async start(): Promise<UnifiedContext> {
    logger.info("🌐 WebApplication 시작...");

    try {
      // UnifiedContext 시작
      this.context = await ApplicationLauncher.start(this.launchConfig);

      // 웹 애플리케이션 특화 설정 적용
      await this.configureWebFeatures();

      logger.info(
        `WebApplication이 포트 ${this.config.port}에서 시작되었습니다`
      );
      logger.info(`📁 정적 파일 경로: ${this.config.staticPath}`);

      return this.context;
    } catch (error) {
      logger.error("WebApplication 시작 실패:", error);
      throw error;
    }
  }

  /**
   * 웹 애플리케이션 중지
   */
  async stop(): Promise<void> {
    if (!this.context) {
      logger.info("WebApplication이 시작되지 않았습니다");
      return;
    }

    logger.info("🛑 WebApplication 중지...");

    const expressIntegration = this.context.getExpressIntegration();
    if (expressIntegration) {
      await expressIntegration.stop();
    }

    logger.info("WebApplication 중지 완료");
  }

  /**
   * Express 앱 인스턴스 조회
   */
  getExpressApp() {
    if (!this.context) {
      throw new Error("WebApplication이 시작되지 않았습니다");
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
      throw new Error("WebApplication이 시작되지 않았습니다");
    }
    return this.context;
  }

  /**
   * 설정 조회
   */
  getConfig(): WebApplicationConfig {
    return { ...this.config };
  }

  /**
   * 웹 애플리케이션 특화 기능 설정
   */
  private async configureWebFeatures(): Promise<void> {
    if (!this.context) return;

    const expressIntegration = this.context.getExpressIntegration();
    if (!expressIntegration) return;

    const app = expressIntegration.getExpressApp();

    // 정적 파일 서빙 설정
    if (this.config.staticPath) {
      const express = require("express");
      app.use(express.static(this.config.staticPath));
      logger.info(`📂 정적 파일 서빙: /${this.config.staticPath}`);
    }

    // 뷰 엔진 설정
    if (this.config.viewEngine) {
      app.set("view engine", this.config.viewEngine.engine);
      app.set("views", this.config.viewEngine.viewPath);
      logger.info(`👀 뷰 엔진: ${this.config.viewEngine.engine}`);
    }

    // 세션 설정
    if (this.config.session) {
      const session = require("express-session");
      app.use(
        session({
          secret: this.config.session.secret,
          resave: this.config.session.resave !== false,
          saveUninitialized: this.config.session.saveUninitialized !== false,
          cookie: {
            secure: process.env.NODE_ENV === "production",
            maxAge: 1000 * 60 * 60 * 24 // 24시간
          }
        })
      );
      logger.info("🔐 세션 미들웨어 설정됨");
    }

    // 속도 제한 설정
    if (this.config.security?.rateLimiting) {
      const rateLimit = require("express-rate-limit");
      const limiter = rateLimit({
        windowMs: this.config.security.rateLimiting.windowMs,
        max: this.config.security.rateLimiting.max,
        message: {
          error: "Too many requests from this IP, please try again later."
        }
      });
      app.use(limiter);
      logger.info("🚦 속도 제한 설정됨");
    }

    // 로깅 설정
    if (this.config.logging) {
      const morgan = require("morgan");
      app.use(morgan(this.config.logging.format || "combined"));
      logger.info(`HTTP 로깅: ${this.config.logging.format}`);
    }

    // 기본 에러 페이지 설정
    this.setupErrorPages(app);
  }

  /**
   * 에러 페이지 설정
   */
  private setupErrorPages(app: any): void {
    // 404 핸들러
    app.use((req: any, res: any, next: any) => {
      res.status(404);

      // API 요청인지 확인
      if (req.xhr || req.get("Accept")?.includes("application/json")) {
        res.json({
          error: "Not Found",
          message: "The requested resource was not found",
          path: req.url,
          timestamp: new Date().toISOString()
        });
      } else {
        // HTML 응답
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>404 - Page Not Found</title>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; margin-top: 100px; }
              h1 { color: #e74c3c; }
              p { color: #7f8c8d; }
            </style>
          </head>
          <body>
            <h1>404 - Page Not Found</h1>
            <p>The page you are looking for does not exist.</p>
            <a href="/">Go Home</a>
          </body>
          </html>
        `);
      }
    });

    // 500 에러 핸들러
    app.use((error: any, req: any, res: any, next: any) => {
      logger.error("Unhandled error in WebApplication:", error);

      res.status(500);

      if (req.xhr || req.get("Accept")?.includes("application/json")) {
        res.json({
          error: "Internal Server Error",
          message:
            process.env.NODE_ENV === "production"
              ? "Something went wrong on our end"
              : error.message,
          timestamp: new Date().toISOString()
        });
      } else {
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>500 - Internal Server Error</title>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; margin-top: 100px; }
              h1 { color: #e74c3c; }
              p { color: #7f8c8d; }
            </style>
          </head>
          <body>
            <h1>500 - Internal Server Error</h1>
            <p>Something went wrong on our end. Please try again later.</p>
            <a href="/">Go Home</a>
          </body>
          </html>
        `);
      }
    });

    logger.info("에러 페이지 설정됨");
  }
}
