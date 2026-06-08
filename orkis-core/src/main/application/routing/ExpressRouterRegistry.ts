import { ApplicationContextClass } from "../../core/container";
import {
  BEAN_SCAN_TYPES,
  REQUEST_MAPPING_META_KEY,
  PARAMETER_META_KEY,
  REQUEST_TYPE,
  REQUEST_ARG_TYPE
} from "../../core/constants";
import { BEAN } from "../../core/types";
import { NextFunction, Request, Response } from "../types";
import { IFileUploadConfig } from "../../config/types";
import {
  ExpressInterceptorRegistry,
  InterceptorGroups
} from "./ExpressInterceptorRegistry";
import { PARAMETER_RESOLVER_CONFIG } from "./parameterResolverConfig";
import { systemLog } from "../../utils/Logger";
import { SSEStream } from "../../utils";
import fs from "fs-extra";
import { MulterHelper } from "./MulterHelper";
import { getHttpMethod } from "./httpMethod";
import { Application } from "express";

/**
 * Express 라우터 등록 레지스트리
 */
export class ExpressRouterRegistry {
  private static fileUploadConfigCache: IFileUploadConfig | null | undefined =
    undefined;

  private constructor() {}

  /**
   * 모든 Controller의 라우트 등록
   */
  public static registerRoutes(
    app: Application,
    context: ApplicationContextClass,
    interceptorGroups: InterceptorGroups
  ): void {
    const controllers = context.getScanBeans(
      BEAN_SCAN_TYPES.CONTROLLER,
      true
    ) as BEAN[];

    if (!controllers || controllers.length === 0) {
      systemLog.warn("No controllers found");
      return;
    }

    systemLog.info(`Registering routes for ${controllers.length} controllers`);

    controllers.forEach((controller: BEAN) => {
      const instance = context.getBean(controller.name);
      if (!instance) {
        systemLog.info(`Controller instance not found: ${controller.name}`);
        return;
      }

      const mappings =
        Reflect.getMetadata(REQUEST_MAPPING_META_KEY, instance.constructor) ||
        [];
      const baseUrl = controller.option?.path || "";

      mappings.forEach((mapping: any) => {
        this.registerEndpoint(
          app,
          context,
          instance,
          baseUrl,
          mapping,
          interceptorGroups
        );
      });
    });
  }

  /**
   * 개별 엔드포인트 등록
   */
  private static registerEndpoint(
    app: Application,
    context: ApplicationContextClass,
    controller: any,
    baseUrl: string,
    mapping: any,
    interceptorGroups: InterceptorGroups
  ): void {
    const httpMethod = getHttpMethod(mapping.type);
    const normalizedBase = this.normalizePath(baseUrl);
    const normalizedRoute = this.normalizePath(mapping.route);

    let fullPath: string;
    if (normalizedBase === "/") {
      fullPath = normalizedRoute;
    } else if (normalizedRoute === "/") {
      fullPath = normalizedBase;
    } else {
      fullPath = normalizedBase + normalizedRoute;
    }

    // PATH 기반 인터셉터 필터링
    const filteredGroups: InterceptorGroups = {
      filter: ExpressInterceptorRegistry.filterByPath(
        interceptorGroups.filter,
        fullPath
      ),
      before: ExpressInterceptorRegistry.filterByPath(
        interceptorGroups.before,
        fullPath
      ),
      after: ExpressInterceptorRegistry.filterByPath(
        interceptorGroups.after,
        fullPath
      ),
      exception: ExpressInterceptorRegistry.filterByPath(
        interceptorGroups.exception,
        fullPath
      )
    };

    // 미들웨어 구성
    const middlewares: any[] = [];
    if (mapping.requestType === REQUEST_TYPE.UPLOAD) {
      middlewares.push(
        this.createMulterMiddleware(context, controller, mapping)
      );
    }

    // 핸들러 생성
    const handler =
      mapping.requestType === REQUEST_TYPE.SSE
        ? this.createSSEHandler(context, controller, mapping, filteredGroups)
        : this.createDefaultHandler(
            context,
            controller,
            mapping,
            filteredGroups
          );

    // 라우트 등록
    app[httpMethod](fullPath, [...middlewares, handler]);

    systemLog.info(
      ` [${httpMethod.toUpperCase()}] ${fullPath} -> ${controller.constructor.name}.${mapping.method}()`
    );
  }

  private static normalizePath(path: string): string {
    if (!path) return "/";

    let normalized = path.startsWith("/") ? path : "/" + path;
    // /가 여러번 들어갈 개발자 실수 방지
    normalized = normalized.replace(/\/+/g, "/");

    return normalized.length > 1 && normalized.endsWith("/")
      ? normalized.slice(0, -1)
      : normalized;
  }

  /**
   * Multer 미들웨어 생성
   */
  private static createMulterMiddleware(
    context: ApplicationContextClass,
    controller: any,
    mapping: any
  ): any {
    const routeConfig = mapping.multipartConfig;
    const appConfig = this.getFileUploadConfig(context);
    const parameterMeta =
      Reflect.getMetadata(
        PARAMETER_META_KEY,
        controller.constructor.prototype,
        mapping.method
      ) || [];

    const configMaxCount = routeConfig?.maxCount ?? appConfig?.maxCount ?? 1;
    const fileFields = parameterMeta
      .filter((meta: any) => meta.type === REQUEST_ARG_TYPE.FILES)
      .map((meta: any) => ({
        name: meta.fieldName,
        maxCount: configMaxCount
      }));

    systemLog.info(
      `[Upload] Route: ${mapping.route}, Fields: ${JSON.stringify(fileFields)}`
    );

    return MulterHelper.createMulter(routeConfig, fileFields, appConfig);
  }

  /**
   * SSE 핸들러 생성
   */
  private static createSSEHandler(
    context: ApplicationContextClass,
    controller: any,
    mapping: any,
    { filter, before, after }: InterceptorGroups
  ): any {
    return async (req: Request, res: Response, _: NextFunction) => {
      try {
        req.context = { requestMapping: mapping };

        // Filter 인터셉터 실행 (SSE 헤더 설정 전에 실행)
        await ExpressInterceptorRegistry.executeInterceptors(
          filter,
          context,
          req,
          res
        );
        if (res.headersSent) return;

        // Before 인터셉터 실행 (SSE 헤더 설정 전에 실행)
        await ExpressInterceptorRegistry.executeInterceptors(
          before,
          context,
          req,
          res
        );
        if (res.headersSent) return;

        // SSE 헤더 설정 (인터셉터 통과 후)
        res.setHeader("Content-Encoding", "identity");
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders();

        const sse = new SSEStream(res);

        const args = this.resolveParameters(
          controller,
          mapping.method,
          req,
          res,
          { sseHelper: sse }
        );

        // 연결 종료 시 After 인터셉터 실행
        req.once("close", async () => {
          sse.close();
          try {
            await ExpressInterceptorRegistry.executeInterceptors(
              after,
              context,
              req,
              res
            );
          } catch (error) {
            systemLog.warn("[SSE] After interceptor error on close", error);
          }
        });

        await controller[mapping.method](...args);
      } catch (err: any) {
        systemLog.error("[SSE] Error in SSE Handler", err);

        // 헤더가 이미 전송된 경우 SSE 에러 이벤트로 전송
        if (res.headersSent) {
          const sse = new SSEStream(res);
          sse.send({
            event: "error",
            data: {
              message: err.message || "Internal server error",
              code: err.code || "SSE_ERROR"
            }
          });
          sse.close();
        } else {
          throw err;
        }
      }
    };
  }

  /**
   * Default 핸들러 생성
   */
  private static createDefaultHandler(
    context: ApplicationContextClass,
    controller: any,
    mapping: any,
    { filter, before, after, exception }: InterceptorGroups
  ): any {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        req.context = { requestMapping: mapping };

        // Filter 인터셉터 실행
        await ExpressInterceptorRegistry.executeInterceptors(
          filter,
          context,
          req,
          res
        );
        if (res.headersSent) return;

        // Before 인터셉터 실행
        await ExpressInterceptorRegistry.executeInterceptors(
          before,
          context,
          req,
          res
        );
        if (res.headersSent) return;

        // 컨트롤러 실행
        const args = this.resolveParameters(
          controller,
          mapping.method,
          req,
          res
        );
        const result = await controller[mapping.method](...args);
        req.context.result = result;

        // After 인터셉터 실행
        await ExpressInterceptorRegistry.executeInterceptors(
          after,
          context,
          req,
          res
        );

        // 응답 전송
        if (!res.headersSent) {
          result !== undefined ? res.json(result) : res.status(204).end();
        }
      } catch (error: any) {
        // Exception 인터셉터 실행
        await ExpressInterceptorRegistry.executeInterceptors(
          exception,
          context,
          req,
          res,
          error
        );

        if (!res.headersSent) {
          next(error);
        }
      } finally {
        if (mapping.requestType === REQUEST_TYPE.UPLOAD) {
          this.cleanupTempFiles(req);
        }
      }
    };
  }

  /**
   * 파라미터 해결
   */
  private static resolveParameters(
    controller: any,
    methodName: string,
    req: Request,
    res: Response,
    extras: Record<string, any> = {}
  ): any[] {
    const parameterMeta =
      Reflect.getMetadata(
        PARAMETER_META_KEY,
        controller.constructor.prototype,
        methodName
      ) || [];

    const args: any[] = [];

    for (const meta of parameterMeta) {
      const resolver = (PARAMETER_RESOLVER_CONFIG as any)[meta.type];

      if (!resolver) {
        systemLog.warn(
          `No resolver for type: ${meta.type} in ${controller.constructor.name}.${methodName}()`
        );
        args[meta.index] = undefined;
        continue;
      }

      try {
        args[meta.index] = resolver({ req, res, meta, ...extras });
      } catch (error) {
        systemLog.error(
          `Failed to resolve param at index ${meta.index} in ${controller.constructor.name}.${methodName}()`,
          error
        );
        args[meta.index] = undefined;
      }
    }

    return args;
  }

  /**
   * 업로드 임시 파일 정리
   */
  private static cleanupTempFiles(req: any): void {
    if (!req.files) return;

    const allFiles = Object.values(req.files)
      .filter(Array.isArray)
      .flat() as Express.Multer.File[];

    allFiles.forEach((file) => {
      if (file.path) {
        fs.unlink(file.path, (error) => {
          if (error && error.code !== "ENOENT") {
            systemLog.warn(
              `[FileCleanup] Failed to delete: ${file.path}`,
              error
            );
          }
        });
      }
    });
  }

  /**
   * 파일 업로드 설정 조회
   */
  private static getFileUploadConfig(
    context: ApplicationContextClass
  ): IFileUploadConfig | null {
    if (this.fileUploadConfigCache !== undefined) {
      return this.fileUploadConfigCache;
    }

    const configBeans = context.getScanBeans(BEAN_SCAN_TYPES.CONFIG, true);
    for (const bean of configBeans) {
      const instance = context.getBean(bean.name);
      if (instance && ("maxFileSize" in instance || "maxCount" in instance)) {
        this.fileUploadConfigCache = instance as IFileUploadConfig;
        systemLog.info(`[Upload] Configuration Bean loaded: ${bean.name}`);
        return this.fileUploadConfigCache;
      }
    }

    this.fileUploadConfigCache = null;
    return null;
  }
}
