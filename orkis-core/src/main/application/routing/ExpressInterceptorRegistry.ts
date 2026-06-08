import { ApplicationContextClass } from "../../core/container";
import { BEAN_SCAN_TYPES, IF_POINT_CUT } from "../../core/constants";
import { BEAN, INTERCEPTOR_OPTION } from "../../core/types";
import { systemLog } from "../../utils/Logger";
import { BaseInterceptor } from "../server";
import { Request, Response } from "../types";

export interface InterceptorGroups {
  filter: BEAN[];
  before: BEAN[];
  after: BEAN[];
  exception: BEAN[];
}

/**
 * Express Interceptor 관리 레지스트리
 * Interceptor 정렬 및 실행 관리
 */
export class ExpressInterceptorRegistry {
  private constructor() {}

  /**
   * Interceptor 정렬
   */
  public static initialize(
    context: ApplicationContextClass
  ): InterceptorGroups {
    const interceptors = context.getScanBeans(
      BEAN_SCAN_TYPES.INTERCEPTOR,
      true
    ) as BEAN[];

    const groups: InterceptorGroups = {
      filter: [],
      before: [],
      after: [],
      exception: []
    };

    if (!interceptors || interceptors.length === 0) {
      systemLog.info("No interceptors found");
      return groups;
    }

    // Interceptor 분류
    interceptors.forEach((bean: BEAN) => {
      const option = bean.option as INTERCEPTOR_OPTION;

      if (!option.USE) return;

      const pointCut = (bean.option as INTERCEPTOR_OPTION).POINT_CUT;

      switch (pointCut) {
        case IF_POINT_CUT.FILTER:
          groups.filter.push(bean);
          break;
        case IF_POINT_CUT.BEFORE:
          groups.before.push(bean);
          break;
        case IF_POINT_CUT.AFTER:
          groups.after.push(bean);
          break;
        case IF_POINT_CUT.EXCEPTION:
          groups.exception.push(bean);
          break;
        default:
          systemLog.warn(
            `Interceptor ${bean.name} has unknown POINT_CUT: ${pointCut}`
          );
          break;
      }
    });

    // 정렬
    this.sortByPriority(groups.filter);
    this.sortByPriority(groups.before);
    this.sortByPriority(groups.after);
    this.sortByPriority(groups.exception);

    systemLog.info(
      `Interceptors initialized:
      FILTER : ${groups.filter.length}
      BEFORE: ${groups.before.length}
      AFTER: ${groups.after.length}
      EXCEPTION: ${groups.exception.length}`
    );

    return groups;
  }

  private static sortByPriority(interceptors: BEAN[]): void {
    interceptors.sort((a: BEAN, b: BEAN) => {
      const priorityA = (a.option as INTERCEPTOR_OPTION).PRIORITY ?? 0;
      const priorityB = (b.option as INTERCEPTOR_OPTION).PRIORITY ?? 0;
      return priorityA - priorityB;
    });
  }

  /**
   * Interceptor 실행
   * @param interceptors 실행할 인터셉터 목록
   * @param context 애플리케이션 컨텍스트
   * @param req Express Request
   * @param res Express Response
   * @param error EXCEPTION 모드일 때 전달되는 에러 객체
   */
  public static async executeInterceptors(
    interceptors: BEAN[],
    context: ApplicationContextClass,
    req: Request,
    res: Response,
    error?: Error
  ): Promise<void> {
    const isExceptionMode = error !== undefined;

    for (const bean of interceptors) {
      // EXCEPTION 모드에서 이미 응답 전송됐으면 중단
      if (isExceptionMode && res.headersSent) return;

      const component: BaseInterceptor = context.getBean(bean.name);

      try {
        if (isExceptionMode) {
          await component.handle(req, res, error);
        } else {
          await component.handle(req, res);
        }
      } catch (interceptorError) {
        if (isExceptionMode) {
          // EXCEPTION 모드에서는 에러 로깅만 하고 계속 진행
          systemLog.warn(
            `Exception interceptor ${bean.name} failed:`,
            interceptorError
          );
        } else {
          // 일반 모드에서는 에러 전파
          throw interceptorError;
        }
      }
    }
  }

  public static matchPath(
    routePath: string,
    includePatterns?: string[],
    excludePatterns?: string[]
  ): boolean {
    if (excludePatterns && excludePatterns.length > 0) {
      const isExcluded = excludePatterns.some((pattern) =>
        this.matchPattern(routePath, pattern)
      );

      if (isExcluded) return false;
    }

    if (!includePatterns || includePatterns.length === 0) return true;

    return includePatterns.some((pattern) =>
      this.matchPattern(routePath, pattern)
    );
  }

  private static matchPattern(routePath: string, pattern: string): boolean {
    if (pattern === "*" || pattern === "/*") return true;

    if (pattern.endsWith("/*")) {
      const prefix = pattern.slice(0, -2);
      return routePath === prefix || routePath.startsWith(prefix + "/");
    }

    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1);
      return routePath.startsWith(prefix);
    }

    return routePath === pattern;
  }

  public static filterByPath(interceptors: BEAN[], routePath: string): BEAN[] {
    return interceptors.filter((bean) => {
      const option = bean.option as INTERCEPTOR_OPTION;
      return this.matchPath(routePath, option.PATH, option.EXCLUDE);
    });
  }
}
