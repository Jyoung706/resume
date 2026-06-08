import { Request, Response, NextFunction } from "express";
import { getRequestMappings } from "../../express/components/decorators/method/RequestMapping";
import { REQUEST_TYPE } from "../../static/CommonEnum";
import { logger } from "../../utils";

/**
 * RequestMapping 메타데이터 구조
 */
export interface RequestMappingMetadata {
  path: string;
  method: REQUEST_TYPE | REQUEST_TYPE[] | string | string[];
  consumes?: string[];
  produces?: string[];
  headers?: { [key: string]: string };
  middleware?: Array<(req: Request, res: Response, next: NextFunction) => void>;
}

/**
 * RequestMapping 호환성 브리지
 *
 * 레거시 RequestMapping 데코레이터를 새로운 라우팅 시스템과 호환되도록 변환합니다.
 */
export class RequestMappingBridge {
  /**
   * 컨트롤러 클래스에서 RequestMapping 정보 추출
   */
  public static extractRequestMappings(
    controllerClass: any
  ): Map<string, RequestMappingMetadata[]> {
    const mappings = new Map<string, RequestMappingMetadata[]>();

    try {
      // 레거시 getRequestMappings 함수 사용
      const legacyMappings = getRequestMappings(controllerClass);

      if (legacyMappings && typeof legacyMappings === "object") {
        for (const [methodName, mappingData] of Object.entries(
          legacyMappings
        )) {
          if (Array.isArray(mappingData)) {
            const convertedMappings = mappingData.map((data) =>
              this.convertLegacyMapping(data)
            );
            mappings.set(methodName, convertedMappings);
          } else {
            mappings.set(methodName, [this.convertLegacyMapping(mappingData)]);
          }
        }
      }

      // 직접 메타데이터 확인 (fallback)
      if (mappings.size === 0) {
        this.extractDirectMetadata(controllerClass, mappings);
      }
    } catch (error) {
      logger.warn(`RequestMapping 추출 실패:`, error);
      // Fallback: 직접 메타데이터 확인
      this.extractDirectMetadata(controllerClass, mappings);
    }

    return mappings;
  }

  /**
   * 직접 메타데이터 추출 (reflect-metadata 사용)
   */
  private static extractDirectMetadata(
    controllerClass: any,
    mappings: Map<string, RequestMappingMetadata[]>
  ): void {
    const prototype = controllerClass.prototype;

    if (!prototype) {
      return;
    }

    // 프로토타입의 모든 메서드 확인
    const methodNames = Object.getOwnPropertyNames(prototype);

    for (const methodName of methodNames) {
      if (methodName === "constructor") continue;

      try {
        const method = prototype[methodName];
        if (typeof method !== "function") continue;

        // RequestMapping 메타데이터 확인
        const requestMapping = Reflect.getMetadata(
          "requestMapping",
          prototype,
          methodName
        );
        if (requestMapping) {
          const metadata = this.normalizeRequestMapping(requestMapping);
          mappings.set(methodName, [metadata]);
        }

        // 다른 HTTP 메서드 데코레이터 확인
        const httpMethods = [
          "get",
          "post",
          "put",
          "delete",
          "patch",
          "head",
          "options"
        ];
        for (const httpMethod of httpMethods) {
          const methodMetadata = Reflect.getMetadata(
            httpMethod,
            prototype,
            methodName
          );
          if (methodMetadata) {
            const metadata = this.normalizeHttpMethodMapping(
              httpMethod.toUpperCase(),
              methodMetadata
            );

            const existing = mappings.get(methodName) || [];
            existing.push(metadata);
            mappings.set(methodName, existing);
          }
        }
      } catch (error) {
        logger.warn(`메서드 ${methodName} 메타데이터 추출 실패:`, error);
      }
    }
  }

  /**
   * 레거시 매핑 데이터를 RequestMappingMetadata로 변환
   */
  private static convertLegacyMapping(
    mappingData: any
  ): RequestMappingMetadata {
    // null/undefined 처리
    if (!mappingData) {
      return {
        path: "/",
        method: REQUEST_TYPE.GET
      };
    }

    // 이미 RequestMappingMetadata 형식인 경우
    if (typeof mappingData === "object" && mappingData.path !== undefined) {
      return {
        path: mappingData.path || "/",
        method: mappingData.method || REQUEST_TYPE.GET,
        consumes: mappingData.consumes,
        produces: mappingData.produces,
        headers: mappingData.headers,
        middleware: mappingData.middleware
      };
    }

    // 문자열인 경우 (경로만 있는 경우)
    if (typeof mappingData === "string") {
      return {
        path: mappingData,
        method: REQUEST_TYPE.GET
      };
    }

    // 기존 레거시 형식 처리
    if (typeof mappingData === "object") {
      // value나 path 속성으로 경로 추출
      const path = mappingData.value || mappingData.path || "/";

      // method 속성 처리 (문자열, 배열, REQUEST_TYPE 지원)
      let method = mappingData.method || REQUEST_TYPE.GET;
      if (typeof method === "string") {
        method = method.toUpperCase(); // 문자열을 대문자로 변환
      }

      return {
        path: path,
        method: method,
        consumes: mappingData.consumes,
        produces: mappingData.produces,
        headers: mappingData.headers,
        middleware: mappingData.middleware
      };
    }

    // 기본값 반환
    return {
      path: "/",
      method: REQUEST_TYPE.GET
    };
  }

  /**
   * RequestMapping 데이터 정규화
   */
  private static normalizeRequestMapping(mapping: any): RequestMappingMetadata {
    if (typeof mapping === "string") {
      // 단순 경로 문자열
      return {
        path: mapping,
        method: REQUEST_TYPE.GET
      };
    }

    if (typeof mapping === "object") {
      return {
        path: mapping.path || "/",
        method: mapping.method || REQUEST_TYPE.GET,
        consumes: mapping.consumes,
        produces: mapping.produces,
        headers: mapping.headers,
        middleware: mapping.middleware
      };
    }

    // 기본값
    return {
      path: "/",
      method: REQUEST_TYPE.GET
    };
  }

  /**
   * HTTP 메서드별 매핑 정규화
   */
  private static normalizeHttpMethodMapping(
    method: string,
    mapping: any
  ): RequestMappingMetadata {
    // 문자열 기반으로 처리 (REQUEST_TYPE enum의 한계 때문)
    const requestType = method.toUpperCase() as any;

    if (typeof mapping === "string") {
      return {
        path: mapping,
        method: requestType
      };
    }

    if (typeof mapping === "object") {
      return {
        path: mapping.path || "/",
        method: requestType,
        consumes: mapping.consumes,
        produces: mapping.produces,
        headers: mapping.headers,
        middleware: mapping.middleware
      };
    }

    return {
      path: "/",
      method: requestType
    };
  }

  /**
   * REQUEST_TYPE을 Express HTTP 메서드 문자열로 변환
   */
  public static convertRequestTypeToHttpMethod(
    requestType: REQUEST_TYPE | string
  ): string {
    // 기존 REQUEST_TYPE enum 처리
    if (typeof requestType === "symbol" || typeof requestType === "number") {
      if (requestType === REQUEST_TYPE.GET) {
        return "GET";
      } else if (requestType === REQUEST_TYPE.POST) {
        return "POST";
      }
    }

    // 문자열로 처리 (확장성을 위해)
    if (typeof requestType === "string") {
      return requestType.toUpperCase();
    }

    // 기본값
    return "GET";
  }

  /**
   * 경로 결합 (컨트롤러 기본 경로 + 메서드 경로)
   */
  public static combinePaths(basePath: string, methodPath: string): string {
    // 경로 정규화
    const normalizeBasePath = basePath.startsWith("/")
      ? basePath
      : `/${basePath}`;
    const normalizeMethodPath = methodPath.startsWith("/")
      ? methodPath
      : `/${methodPath}`;

    // 루트 경로 처리
    if (normalizeBasePath === "/" && normalizeMethodPath === "/") {
      return "/";
    }

    if (normalizeBasePath === "/") {
      return normalizeMethodPath;
    }

    if (normalizeMethodPath === "/") {
      return normalizeBasePath;
    }

    // 경로 결합
    const combined = normalizeBasePath + normalizeMethodPath;

    // 중복 슬래시 제거
    return combined.replace(/\/+/g, "/");
  }

  /**
   * RequestMapping에서 Express 라우트 생성
   */
  public static createExpressRoute(
    app: any,
    basePath: string,
    methodName: string,
    mapping: RequestMappingMetadata,
    handler: (req: Request, res: Response, next: NextFunction) => void
  ): void {
    const fullPath = this.combinePaths(basePath, mapping.path);
    const httpMethods = Array.isArray(mapping.method)
      ? mapping.method
      : [mapping.method];

    for (const httpMethod of httpMethods) {
      const method =
        this.convertRequestTypeToHttpMethod(httpMethod).toLowerCase();

      // 미들웨어 체인 구성
      const middlewareChain: Array<
        (req: Request, res: Response, next: NextFunction) => void
      > = [];

      // Content-Type 검증 미들웨어
      if (mapping.consumes && mapping.consumes.length > 0) {
        middlewareChain.push(this.createConsumesMiddleware(mapping.consumes));
      }

      // Accept 헤더 검증 미들웨어
      if (mapping.produces && mapping.produces.length > 0) {
        middlewareChain.push(this.createProducesMiddleware(mapping.produces));
      }

      // 커스텀 헤더 검증 미들웨어
      if (mapping.headers && Object.keys(mapping.headers).length > 0) {
        middlewareChain.push(this.createHeadersMiddleware(mapping.headers));
      }

      // 커스텀 미들웨어 추가
      if (mapping.middleware && mapping.middleware.length > 0) {
        middlewareChain.push(...mapping.middleware);
      }

      // 최종 핸들러 추가
      middlewareChain.push(handler);

      // Express 라우트 등록
      if (method === "all") {
        app.all(fullPath, ...middlewareChain);
      } else if (typeof app[method] === "function") {
        app[method](fullPath, ...middlewareChain);
      } else {
        logger.warn(`지원하지 않는 HTTP 메서드: ${method}`);
      }

      logger.info(
        `라우트 등록: ${method.toUpperCase()} ${fullPath} → ${methodName}`
      );
    }
  }

  /**
   * Content-Type 검증 미들웨어 생성
   */
  private static createConsumesMiddleware(
    consumes: string[]
  ): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      const contentType = req.get("Content-Type");

      if (!contentType) {
        return res.status(415).json({
          error: "Unsupported Media Type",
          message: "Content-Type header is required"
        });
      }

      const isValid = consumes.some((type) => contentType.includes(type));

      if (!isValid) {
        return res.status(415).json({
          error: "Unsupported Media Type",
          message: `Content-Type must be one of: ${consumes.join(", ")}`
        });
      }

      next();
    };
  }

  /**
   * Accept 헤더 검증 미들웨어 생성
   */
  private static createProducesMiddleware(
    produces: string[]
  ): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      const accept = req.get("Accept");

      if (!accept || accept === "*/*") {
        // Accept 헤더가 없거나 모든 타입 허용
        res.set("Content-Type", produces[0]); // 첫 번째 타입을 기본으로 설정
        return next();
      }

      const isValid = produces.some((type) => accept.includes(type));

      if (!isValid) {
        return res.status(406).json({
          error: "Not Acceptable",
          message: `Accept header must be one of: ${produces.join(", ")}`
        });
      }

      // 응답 Content-Type 설정
      const matchedType = produces.find((type) => accept.includes(type));
      if (matchedType) {
        res.set("Content-Type", matchedType);
      }

      next();
    };
  }

  /**
   * 헤더 검증 미들웨어 생성
   */
  private static createHeadersMiddleware(headers: {
    [key: string]: string;
  }): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      for (const [headerName, expectedValue] of Object.entries(headers)) {
        const actualValue = req.get(headerName);

        if (!actualValue) {
          return res.status(400).json({
            error: "Bad Request",
            message: `Required header '${headerName}' is missing`
          });
        }

        if (actualValue !== expectedValue) {
          return res.status(400).json({
            error: "Bad Request",
            message: `Header '${headerName}' must be '${expectedValue}'`
          });
        }
      }

      next();
    };
  }
}
