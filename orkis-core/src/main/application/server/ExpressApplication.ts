import express, { NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import compression from "compression";
import { ExpressInterceptorRegistry, ExpressRouterRegistry } from "../routing";
import { ApplicationContext } from "../../core/container";
import { ApplicationEnvironment } from "../../config";
import { createServer, Server } from "http";
import { ErrorResponse } from "../errors";
import { createLogMiddleware } from "../middleware/logMiddleware";
import { COMPONENT_SCAN_BEAN_META_KEY } from "../../core/constants/internalKeys";
import { APPLICATION_OPTION } from "../../core/types";
import { Logger, systemLog } from "../../utils/Logger";
import { registerGlobalHttpModule } from "../../utils/http/global";
import cors from "cors";
import os from "os";
import path from "path";
import fs from "fs";

export abstract class ExpressApplication {
  public app = express();
  protected server!: Server;

  protected async onBeforeInitialize(): Promise<void> {}
  protected async onAfterInitialize(): Promise<void> {}
  protected async onBeforeStart(): Promise<void> {}
  protected async onAfterStart(): Promise<void> {}

  private getApplicationOption(): APPLICATION_OPTION | undefined {
    return Reflect.getMetadata(COMPONENT_SCAN_BEAN_META_KEY, this.constructor)
      ?.option;
  }

  public async run(args?: string[]): Promise<void> {
    await this.onBeforeInitialize();

    this.initializeServer();
    this.initializeComponents();

    await this.onAfterInitialize();

    await this.onBeforeStart();

    this.registerGlobalErrorHandler();

    this.startServer();

    await this.onAfterStart();
  }

  private initializeServer() {
    try {
      const option = this.getApplicationOption();

      if (option?.logLevel !== undefined) {
        Logger.setApplicationLogLevel(option.logLevel);
      }

      this.app.set("trust proxy", 1);

      if (option?.requestLogging) {
        this.app.use(createLogMiddleware(option.requestLogging));
        systemLog.info("[ExpressApplication] Request logging enabled");
      }

      registerGlobalHttpModule(option?.httpModule);

      if (option?.cors) {
        const corsConfig = option.cors === true ? {} : option.cors;

        this.app.use(cors(corsConfig));
        systemLog.info("[ExpressApplication] CORS enabled");
      }

      this.app.use(express.json({ limit: "50mb" }));
      this.app.use(express.urlencoded({ limit: "50mb", extended: true }));
      this.app.use(cookieParser());
      this.app.use(compression());
    } catch (e) {
      systemLog.error("Failed to initialize server: ", e);
    }
  }

  private initializeComponents() {
    process.on("uncaughtException", (err) => {
      systemLog.error("[Uncaught Exception]", err);
    });

    const interceptors =
      ExpressInterceptorRegistry.initialize(ApplicationContext);

    ExpressRouterRegistry.registerRoutes(
      this.app,
      ApplicationContext,
      interceptors
    );
  }

  private registerGlobalErrorHandler() {
    const globalErrorHandler = (
      err: any,
      _req: Request,
      res: Response,
      _next: NextFunction
    ) => {
      systemLog.error("[Express Error]", err);

      if (res.headersSent) {
        return;
      }

      if (err.statusCode) {
        const body: ErrorResponse = {
          success: false,
          error: {
            code: err.code || "INTERNAL_SERVER_ERROR",
            message: err.message || "Internal Server Error"
          },
          timestamp: new Date().toISOString()
        };

        res.status(err.statusCode).json(body);
        return;
      }

      const errorBody: ErrorResponse = {
        success: false,
        error: {
          code: err.code || "INTERNAL_SERVER_ERROR",
          message: err.message || "Internal Server Error"
        },
        timestamp: new Date().toISOString()
      };

      res.status(err.statusCode || 500).json(errorBody);
    };

    this.app.use(globalErrorHandler);
  }

  private startServer() {
    const socketPath =
      ApplicationEnvironment.__SOCKET_PATH || process.env.SOCKET_PATH;

    const listenTarget = socketPath
      ? this.resolveSocketPath(socketPath)
      : ApplicationEnvironment.__PORT ||
        parseInt(process.env.PORT || "0") ||
        8080;

    this.server = createServer(this.app);

    if (typeof listenTarget === "string" && process.platform !== "win32") {
      if (fs.existsSync(listenTarget)) {
        fs.unlinkSync(listenTarget);
      }
    }

    this.server.listen(listenTarget, () => {
      systemLog.info("");
      systemLog.info("--- Server Ready ---");
      systemLog.info(
        typeof listenTarget === "string"
          ? `Listening on ${listenTarget}`
          : `Listening on port ${listenTarget}`
      );
      systemLog.info("");
    });
  }

  private resolveSocketPath(name: string): string {
    if (name.startsWith("/") || name.startsWith("\\\\.\\pipe\\")) {
      return name;
    }
    if (process.platform === "win32") {
      return `\\\\.\\pipe\\${name}`;
    }
    const basePath =
      process.env.ORKIS_DATA_PATH || path.join(os.homedir(), ".orkis", "run");

    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath, { recursive: true });
    }

    return path.join(basePath, `${name}.sock`);
  }
}
