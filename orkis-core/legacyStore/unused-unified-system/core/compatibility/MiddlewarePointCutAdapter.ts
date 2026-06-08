import { Request, Response, NextFunction } from "express";
import { IF_POINT_CUT } from "../../static/CommonEnum";
import { INTERCEPTOR_OPTION } from "../../static";
import { BeanDefinition } from "../container/types";
import { ExpressInterceptor } from "../../express/model/ExpressInterceptor";
import { logger } from "../../utils";

/**
 * 미들웨어 POINT_CUT 시스템 어댑터
 *
 * 레거시 POINT_CUT 기반 미들웨어를 새로운 Express 통합 시스템과 호환되도록 변환합니다.
 */
export class MiddlewarePointCutAdapter {
  /** POINT_CUT별 미들웨어 분류 */
  private filterMiddlewares: ExpressInterceptor[] = [];
  private beforeMiddlewares: ExpressInterceptor[] = [];
  private afterMiddlewares: ExpressInterceptor[] = [];
  private outMiddlewares: ExpressInterceptor[] = [];
  private exceptionMiddlewares: ExpressInterceptor[] = [];

  /**
   * 미들웨어 Bean을 POINT_CUT별로 분류
   */
  public classifyMiddleware(
    middlewareBean: BeanDefinition,
    middlewareInstance: ExpressInterceptor
  ): void {
    const option = this.extractInterceptorOption(middlewareBean);

    if (!option || option.POINT_CUT === undefined) {
      logger.warn(
        `Middleware ${middlewareBean.metadata.name}에 POINT_CUT이 정의되지 않았습니다. BEFORE로 설정합니다.`
      );
      this.beforeMiddlewares.push(middlewareInstance);
      return;
    }

    switch (option.POINT_CUT) {
      case IF_POINT_CUT.FILTER:
        this.filterMiddlewares.push(middlewareInstance);
        break;
      case IF_POINT_CUT.BEFORE:
        this.beforeMiddlewares.push(middlewareInstance);
        break;
      case IF_POINT_CUT.AFTER:
        this.afterMiddlewares.push(middlewareInstance);
        break;
      case IF_POINT_CUT.OUT:
        this.outMiddlewares.push(middlewareInstance);
        break;
      case IF_POINT_CUT.EXCEPTION:
        this.exceptionMiddlewares.push(middlewareInstance);
        break;
      default:
        logger.warn(`알 수 없는 POINT_CUT: ${option.POINT_CUT}`);
        this.beforeMiddlewares.push(middlewareInstance);
    }
  }

  /**
   * POINT_CUT별로 정렬된 미들웨어 체인 생성
   */
  public createMiddlewareChain(): Array<
    (req: Request, res: Response, next: NextFunction) => void
  > {
    const chain: Array<
      (req: Request, res: Response, next: NextFunction) => void
    > = [];

    // 1. FILTER (우선순위 0)
    this.sortByPriority(this.filterMiddlewares).forEach((middleware) => {
      chain.push(this.wrapMiddleware(middleware, "FILTER"));
    });

    // 2. BEFORE (우선순위 1)
    this.sortByPriority(this.beforeMiddlewares).forEach((middleware) => {
      chain.push(this.wrapMiddleware(middleware, "BEFORE"));
    });

    // 3. AFTER 미들웨어는 응답 후 처리를 위해 별도 처리
    // Express의 특성상 라우트 핸들러 이후 실행되도록 설정

    // 4. EXCEPTION 미들웨어는 에러 핸들러로 등록
    // Express의 에러 핸들링 미들웨어로 변환

    return chain;
  }

  /**
   * AFTER 미들웨어 체인 생성 (라우트 핸들러 이후 실행)
   */
  public createAfterMiddlewareChain(): Array<
    (req: Request, res: Response, next: NextFunction) => void
  > {
    const chain: Array<
      (req: Request, res: Response, next: NextFunction) => void
    > = [];

    // AFTER 미들웨어
    this.sortByPriority(this.afterMiddlewares).forEach((middleware) => {
      chain.push(this.wrapMiddleware(middleware, "AFTER"));
    });

    // OUT 미들웨어 (응답 전송 직전)
    this.sortByPriority(this.outMiddlewares).forEach((middleware) => {
      chain.push(this.wrapMiddleware(middleware, "OUT"));
    });

    return chain;
  }

  /**
   * 에러 핸들링 미들웨어 체인 생성
   */
  public createErrorMiddlewareChain(): Array<
    (error: any, req: Request, res: Response, next: NextFunction) => void
  > {
    const chain: Array<
      (error: any, req: Request, res: Response, next: NextFunction) => void
    > = [];

    this.sortByPriority(this.exceptionMiddlewares).forEach((middleware) => {
      chain.push(this.wrapErrorMiddleware(middleware));
    });

    return chain;
  }

  /**
   * 미들웨어를 Express 형식으로 래핑
   */
  private wrapMiddleware(
    middleware: ExpressInterceptor,
    pointCut: string
  ): (req: Request, res: Response, next: NextFunction) => void {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        logger.info(
          `[${pointCut}] Middleware 실행: ${middleware.constructor.name}`
        );

        // ExpressInterceptor의 intercept 메서드 호출
        if (typeof middleware.intercept === "function") {
          await middleware.intercept(req, res, next);
        } else {
          logger.warn(
            `Middleware ${middleware.constructor.name}에 intercept() 메서드가 없습니다`
          );
          next();
        }
      } catch (error) {
        logger.error(`[${pointCut}] Middleware 오류:`, error);
        next(error);
      }
    };
  }

  /**
   * 에러 미들웨어를 Express 형식으로 래핑
   */
  private wrapErrorMiddleware(
    middleware: ExpressInterceptor
  ): (error: any, req: Request, res: Response, next: NextFunction) => void {
    return async (
      error: any,
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      try {
        logger.info(
          `[EXCEPTION] Error Middleware 실행: ${middleware.constructor.name}`
        );

        // ExpressInterceptor의 intercept 메서드에 에러 전달
        if (typeof middleware.intercept === "function") {
          // 에러를 req 객체에 첨부하여 전달
          (req as any).__error = error;
          await middleware.intercept(req, res, next);
        } else {
          logger.warn(
            `Error Middleware ${middleware.constructor.name}에 intercept() 메서드가 없습니다`
          );
          next(error);
        }
      } catch (handlingError) {
        logger.error(
          `[EXCEPTION] Error Middleware 처리 중 오류:`,
          handlingError
        );
        next(error); // 원래 에러 전달
      }
    };
  }

  /**
   * Bean 정의에서 INTERCEPTOR_OPTION 추출
   */
  private extractInterceptorOption(
    beanDefinition: BeanDefinition
  ): INTERCEPTOR_OPTION | null {
    try {
      // 1. 직접 메타데이터에서 확인
      const metadata = Reflect.getMetadata("middleware", beanDefinition.target);
      if (metadata && typeof metadata === "object") {
        return metadata as INTERCEPTOR_OPTION;
      }

      // 2. Bean의 option 필드 확인 (호환성 레이어를 통해 변환된 경우)
      const beanOption = (beanDefinition as any).option;
      if (
        beanOption &&
        typeof beanOption === "object" &&
        beanOption.POINT_CUT !== undefined
      ) {
        return beanOption as INTERCEPTOR_OPTION;
      }

      // 3. 기본값 반환
      return {
        POINT_CUT: IF_POINT_CUT.BEFORE,
        PRIORITY: beanDefinition.metadata.priority || 0
      };
    } catch (error) {
      logger.warn(`INTERCEPTOR_OPTION 추출 실패:`, error);
      return null;
    }
  }

  /**
   * 우선순위별 정렬
   */
  private sortByPriority(
    middlewares: ExpressInterceptor[]
  ): ExpressInterceptor[] {
    return [...middlewares].sort((a, b) => {
      const priorityA = this.getMiddlewarePriority(a);
      const priorityB = this.getMiddlewarePriority(b);
      return priorityA - priorityB; // 낮은 숫자가 높은 우선순위
    });
  }

  /**
   * 미들웨어 우선순위 조회
   */
  private getMiddlewarePriority(middleware: ExpressInterceptor): number {
    try {
      const metadata = Reflect.getMetadata(
        "middleware",
        middleware.constructor
      );
      if (
        metadata &&
        typeof metadata === "object" &&
        metadata.PRIORITY !== undefined
      ) {
        return metadata.PRIORITY;
      }
    } catch (error) {
      logger.warn(`미들웨어 우선순위 조회 실패:`, error);
    }
    return 0;
  }

  /**
   * 분류된 미들웨어 정보 조회
   */
  public getClassificationInfo(): {
    filter: number;
    before: number;
    after: number;
    out: number;
    exception: number;
    total: number;
  } {
    return {
      filter: this.filterMiddlewares.length,
      before: this.beforeMiddlewares.length,
      after: this.afterMiddlewares.length,
      out: this.outMiddlewares.length,
      exception: this.exceptionMiddlewares.length,
      total:
        this.filterMiddlewares.length +
        this.beforeMiddlewares.length +
        this.afterMiddlewares.length +
        this.outMiddlewares.length +
        this.exceptionMiddlewares.length
    };
  }

  /**
   * 모든 미들웨어 초기화
   */
  public clear(): void {
    this.filterMiddlewares = [];
    this.beforeMiddlewares = [];
    this.afterMiddlewares = [];
    this.outMiddlewares = [];
    this.exceptionMiddlewares = [];
  }
}
