// import { BeanDefinition, BeanType } from "../../core/container/types";
// import {
//   RequestMappingBridge,
//   RequestMappingMetadata
// } from "../../core/compatibility/RequestMappingBridge";
// import { logger } from "../../utils";

// /**
//  * @Controller 데코레이터 감지 결과
//  */
// export interface ControllerDetectionResult {
//   /** 감지된 Controller Bean들 */
//   controllers: BeanDefinition[];
//   /** 라우팅 경로별 컨트롤러 맵 */
//   routeMap: Map<string, BeanDefinition>;
//   /** 충돌하는 라우팅 경로들 */
//   routeConflicts: Array<{
//     path: string;
//     controllers: BeanDefinition[];
//   }>;
//   /** 전체 컨트롤러 개수 */
//   totalCount: number;
// }

// /**
//  * Controller 정렬 전략
//  */
// export enum ControllerSortStrategy {
//   /** 우선순위 기반 정렬 */
//   PRIORITY = "priority",
//   /** 경로 기반 정렬 (알파벳 순) */
//   PATH = "path",
//   /** 이름 기반 정렬 */
//   NAME = "name",
//   /** 등록 순서 유지 */
//   REGISTRATION_ORDER = "registration_order"
// }

// /**
//  * Controller Bean 메타데이터
//  */
// export interface ControllerMetadata {
//   /** 기본 경로 */
//   basePath: string;
//   /** 설명 */
//   description?: string;
//   /** 태그 */
//   tags?: string[];
//   /** API 버전 */
//   version?: string;
// }

// /**
//  * @Controller 클래스 자동 감지기
//  *
//  * DI 컨테이너에서 @Controller 데코레이터가 적용된 Bean들을 찾아서
//  * Express 라우터에 등록할 수 있도록 분석합니다.
//  */
// export class ControllerDetector {
//   /**
//    * Controller Bean들 감지 및 분석
//    */
//   static detect(beanDefinitions: BeanDefinition[]): ControllerDetectionResult {
//     logger.info("Detecting @Controller beans...");

//     // @Controller Bean들 필터링
//     const controllers = beanDefinitions.filter(
//       (bean) => bean.metadata.type === BeanType.CONTROLLER
//     );

//     logger.info(
//       `Found ${controllers.length} @Controller bean(s):`,
//       controllers.map((ctrl) => ctrl.metadata.name)
//     );

//     // 라우팅 경로별 컨트롤러 맵 생성
//     const routeMap = this.buildRouteMap(controllers);

//     // 라우팅 충돌 검사
//     const routeConflicts = this.checkRouteConflicts(controllers);

//     const result: ControllerDetectionResult = {
//       controllers,
//       routeMap,
//       routeConflicts,
//       totalCount: controllers.length
//     };

//     logger.info("Controller detection result:", {
//       totalCount: controllers.length,
//       uniqueRoutes: routeMap.size,
//       conflicts: routeConflicts.length
//     });

//     // 충돌이 있으면 경고 출력
//     if (routeConflicts.length > 0) {
//       logger.warn("Route conflicts detected:");
//       routeConflicts.forEach((conflict) => {
//         logger.warn(
//           `  - Path "${conflict.path}": ${conflict.controllers.map((c) => c.metadata.name).join(", ")}`
//         );
//       });
//     }

//     return result;
//   }

//   /**
//    * Controller들을 특정 전략으로 정렬
//    */
//   static sortControllers(
//     controllers: BeanDefinition[],
//     strategy: ControllerSortStrategy = ControllerSortStrategy.PRIORITY
//   ): BeanDefinition[] {
//     const sorted = [...controllers];

//     switch (strategy) {
//       case ControllerSortStrategy.PRIORITY:
//         return sorted.sort((a, b) => a.metadata.priority - b.metadata.priority);

//       case ControllerSortStrategy.PATH:
//         return sorted.sort((a, b) => {
//           const pathA = this.extractBasePath(a) || "";
//           const pathB = this.extractBasePath(b) || "";
//           return pathA.localeCompare(pathB);
//         });

//       case ControllerSortStrategy.NAME:
//         return sorted.sort((a, b) =>
//           a.metadata.name.localeCompare(b.metadata.name)
//         );

//       case ControllerSortStrategy.REGISTRATION_ORDER:
//         return sorted; // 원본 순서 유지

//       default:
//         return sorted.sort((a, b) => a.metadata.priority - b.metadata.priority);
//     }
//   }

//   /**
//    * Controller Bean 검증
//    */
//   static validateControllerBean(beanDefinition: BeanDefinition): {
//     valid: boolean;
//     issues: string[];
//     warnings: string[];
//   } {
//     const issues: string[] = [];
//     const warnings: string[] = [];

//     // 기본 검증
//     if (!beanDefinition.target) {
//       issues.push("Controller bean has no target class");
//     }

//     // @Controller 데코레이터 검증
//     if (beanDefinition.metadata.type !== BeanType.CONTROLLER) {
//       issues.push("Bean is not marked with @Controller decorator");
//     }

//     // 경로 검증
//     const basePath = this.extractBasePath(beanDefinition);
//     if (!basePath) {
//       warnings.push("Controller has no base path defined");
//     } else {
//       // 경로 형식 검증
//       if (!basePath.startsWith("/")) {
//         issues.push(`Controller base path should start with '/': ${basePath}`);
//       }

//       // 경로 패턴 검증
//       if (basePath.includes("//")) {
//         issues.push(
//           `Controller base path contains double slashes: ${basePath}`
//         );
//       }
//     }

//     // 메서드 검증
//     if (beanDefinition.target) {
//       const prototype = beanDefinition.target.prototype;
//       if (prototype) {
//         const methods = Object.getOwnPropertyNames(prototype);
//         const routeMethods = methods.filter(
//           (method) =>
//             method !== "constructor" && typeof prototype[method] === "function"
//         );

//         if (routeMethods.length === 0) {
//           warnings.push("Controller has no route methods");
//         }

//         // RequestMapping 데코레이터 검사
//         const routeMethodsWithMapping = routeMethods.filter((method) => {
//           try {
//             return (
//               Reflect.hasMetadata("requestMapping", prototype[method]) ||
//               Reflect.hasMetadata("route", prototype[method])
//             );
//           } catch {
//             return false;
//           }
//         });

//         if (routeMethodsWithMapping.length === 0) {
//           warnings.push(
//             "Controller has no methods with @RequestMapping decorator"
//           );
//         }
//       }
//     }

//     return {
//       valid: issues.length === 0,
//       issues,
//       warnings
//     };
//   }

//   /**
//    * Controller들의 경로 충돌 검사
//    */
//   static checkRouteConflicts(controllers: BeanDefinition[]): Array<{
//     path: string;
//     controllers: BeanDefinition[];
//   }> {
//     const pathGroups = new Map<string, BeanDefinition[]>();

//     // 경로별로 컨트롤러 그룹화
//     controllers.forEach((controller) => {
//       const basePath = this.extractBasePath(controller);
//       if (basePath) {
//         const normalizedPath = this.normalizePath(basePath);
//         if (!pathGroups.has(normalizedPath)) {
//           pathGroups.set(normalizedPath, []);
//         }
//         pathGroups.get(normalizedPath)!.push(controller);
//       }
//     });

//     // 충돌 검사 (같은 경로에 여러 컨트롤러)
//     const conflicts: Array<{ path: string; controllers: BeanDefinition[] }> =
//       [];

//     for (const [path, controllerList] of pathGroups) {
//       if (controllerList.length > 1) {
//         conflicts.push({
//           path,
//           controllers: controllerList
//         });
//       }
//     }

//     return conflicts;
//   }

//   /**
//    * 특정 경로의 Controller 찾기
//    */
//   static findControllerByPath(
//     controllers: BeanDefinition[],
//     path: string
//   ): BeanDefinition | undefined {
//     const normalizedPath = this.normalizePath(path);

//     return controllers.find((controller) => {
//       const basePath = this.extractBasePath(controller);
//       return basePath && this.normalizePath(basePath) === normalizedPath;
//     });
//   }

//   /**
//    * Controller의 라우트 메서드들 분석
//    */
//   static analyzeControllerRoutes(controllerBean: BeanDefinition): Array<{
//     methodName: string;
//     httpMethod: string;
//     path: string;
//     fullPath: string;
//     metadata?: RequestMappingMetadata;
//   }> {
//     const routes: Array<{
//       methodName: string;
//       httpMethod: string;
//       path: string;
//       fullPath: string;
//       metadata?: RequestMappingMetadata;
//     }> = [];

//     if (!controllerBean.target) {
//       return routes;
//     }

//     const basePath = this.extractBasePath(controllerBean) || "";

//     try {
//       // RequestMappingBridge를 사용하여 레거시 RequestMapping 지원
//       const requestMappings = RequestMappingBridge.extractRequestMappings(
//         controllerBean.target
//       );

//       for (const [methodName, mappings] of requestMappings) {
//         for (const mapping of mappings) {
//           const httpMethods = Array.isArray(mapping.method)
//             ? mapping.method
//             : [mapping.method];

//           for (const httpMethod of httpMethods) {
//             const httpMethodStr =
//               RequestMappingBridge.convertRequestTypeToHttpMethod(httpMethod);
//             const fullPath = RequestMappingBridge.combinePaths(
//               basePath,
//               mapping.path
//             );

//             routes.push({
//               methodName,
//               httpMethod: httpMethodStr,
//               path: mapping.path,
//               fullPath,
//               metadata: mapping
//             });
//           }
//         }
//       }

//       // Fallback: 기존 방식으로도 확인
//       if (routes.length === 0) {
//         this.analyzeRoutesFallback(controllerBean, basePath, routes);
//       }
//     } catch (error: any) {
//       logger.warn(
//         `RequestMapping 분석 실패, fallback 사용:`,
//         error?.message || error
//       );
//       this.analyzeRoutesFallback(controllerBean, basePath, routes);
//     }

//     return routes;
//   }

//   /**
//    * Fallback 라우트 분석 (기존 방식)
//    */
//   private static analyzeRoutesFallback(
//     controllerBean: BeanDefinition,
//     basePath: string,
//     routes: Array<{
//       methodName: string;
//       httpMethod: string;
//       path: string;
//       fullPath: string;
//       metadata?: RequestMappingMetadata;
//     }>
//   ): void {
//     const prototype = controllerBean.target.prototype;

//     if (prototype) {
//       const methods = Object.getOwnPropertyNames(prototype);

//       for (const methodName of methods) {
//         if (methodName === "constructor") continue;

//         try {
//           const method = prototype[methodName];
//           if (typeof method !== "function") continue;

//           // @RequestMapping 메타데이터 확인
//           const requestMapping = Reflect.getMetadata("requestMapping", method);
//           if (requestMapping) {
//             const httpMethods = Array.isArray(requestMapping.method)
//               ? requestMapping.method
//               : [requestMapping.method || "GET"];

//             const routePath = requestMapping.path || "";
//             const fullPath = this.combinePaths(basePath, routePath);

//             for (const httpMethod of httpMethods) {
//               routes.push({
//                 methodName,
//                 httpMethod: httpMethod.toUpperCase(),
//                 path: routePath,
//                 fullPath
//               });
//             }
//           }
//         } catch (error: any) {
//           logger.warn(
//             `Failed to analyze route for ${controllerBean.metadata.name}.${methodName}:`,
//             error?.message || error
//           );
//         }
//       }
//     }
//   }

//   /**
//    * 라우팅 경로별 컨트롤러 맵 생성
//    */
//   private static buildRouteMap(
//     controllers: BeanDefinition[]
//   ): Map<string, BeanDefinition> {
//     const routeMap = new Map<string, BeanDefinition>();

//     controllers.forEach((controller) => {
//       const basePath = this.extractBasePath(controller);
//       if (basePath) {
//         const normalizedPath = this.normalizePath(basePath);

//         // 충돌이 있으면 우선순위가 높은 것으로 덮어쓰기
//         const existing = routeMap.get(normalizedPath);
//         if (
//           !existing ||
//           controller.metadata.priority < existing.metadata.priority
//         ) {
//           routeMap.set(normalizedPath, controller);
//         }
//       }
//     });

//     return routeMap;
//   }

//   /**
//    * Controller Bean에서 기본 경로 추출
//    */
//   private static extractBasePath(
//     beanDefinition: BeanDefinition
//   ): string | null {
//     try {
//       // Controller 데코레이터의 메타데이터에서 경로 추출
//       const controllerMetadata = Reflect.getMetadata(
//         "controller",
//         beanDefinition.target
//       );

//       if (controllerMetadata) {
//         // 문자열인 경우 (단순 경로)
//         if (typeof controllerMetadata === "string") {
//           return controllerMetadata;
//         }

//         // 객체인 경우 (설정 객체)
//         if (typeof controllerMetadata === "object" && controllerMetadata.path) {
//           return controllerMetadata.path;
//         }

//         // basePath 속성 확인
//         if (
//           typeof controllerMetadata === "object" &&
//           controllerMetadata.basePath
//         ) {
//           return controllerMetadata.basePath;
//         }
//       }

//       // 기본값으로 클래스명 기반 경로 생성
//       const className = beanDefinition.metadata.name;
//       if (className.endsWith("Controller")) {
//         const baseName = className.slice(0, -10); // 'Controller' 제거
//         return `/${baseName.toLowerCase()}`;
//       }

//       return `/${className.toLowerCase()}`;
//     } catch (error: any) {
//       logger.warn(
//         `Failed to extract base path for ${beanDefinition.metadata.name}:`,
//         error?.message || error
//       );
//       return null;
//     }
//   }

//   /**
//    * 경로 정규화
//    */
//   private static normalizePath(path: string): string {
//     // 앞뒤 공백 제거
//     let normalized = path.trim();

//     // 빈 문자열 처리
//     if (!normalized) {
//       return "/";
//     }

//     // 시작 슬래시 추가
//     if (!normalized.startsWith("/")) {
//       normalized = "/" + normalized;
//     }

//     // 마지막 슬래시 제거 (루트 경로 제외)
//     if (normalized.length > 1 && normalized.endsWith("/")) {
//       normalized = normalized.slice(0, -1);
//     }

//     // 연속된 슬래시 제거
//     normalized = normalized.replace(/\/+/g, "/");

//     return normalized;
//   }

//   /**
//    * 두 경로 결합
//    */
//   private static combinePaths(basePath: string, subPath: string): string {
//     const normalizedBase = this.normalizePath(basePath);
//     const normalizedSub = this.normalizePath(subPath);

//     if (normalizedSub === "/") {
//       return normalizedBase;
//     }

//     if (normalizedBase === "/") {
//       return normalizedSub;
//     }

//     return normalizedBase + normalizedSub;
//   }
// }
