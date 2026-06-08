// /**
//  * @Application 데코레이터 감지 결과
//  */
// export interface ApplicationDetectionResult {
//   /** 감지된 Application Bean들 */
//   applications: BeanDefinition[];
//   /** 선택된 메인 Application */
//   selectedApplication?: BeanDefinition;
//   /** CoreDefultApplication 존재 여부 */
//   hasDefaultApplication: boolean;
//   /** 커스텀 Application 개수 */
//   customApplicationCount: number;
// }

// /**
//  * Application 선택 전략
//  */
// export enum ApplicationSelectionStrategy {
//   /** 우선순위 기반 선택 */
//   PRIORITY = "priority",
//   /** 이름 기반 선택 */
//   NAME = "name",
//   /** 첫 번째 발견된 것 선택 */
//   FIRST = "first",
//   /** 커스텀 Application 우선 */
//   CUSTOM_FIRST = "custom_first"
// }

// /**
//  * @Application 클래스 자동 감지기
//  *
//  * DI 컨테이너에서 @Application 데코레이터가 적용된 Bean들을 찾아서
//  * Express 서버에 사용할 메인 Application을 선택합니다.
//  */
// export class ApplicationDetector {
//   /**
//    * Application Bean들 감지 및 분석
//    */
//   static detect(beanDefinitions: BeanDefinition[]): ApplicationDetectionResult {
//     logger.info("Detecting @Application beans...");

//     // @Application Bean들 필터링
//     const applications = beanDefinitions.filter(
//       (bean) => bean.metadata.type === BeanType.APPLICATION
//     );

//     logger.info(
//       `Found ${applications.length} @Application bean(s):`,
//       applications.map((app) => app.metadata.name)
//     );

//     // CoreDefultApplication 여부 확인
//     const hasDefaultApplication = applications.some(
//       (app) => app.metadata.name === "CoreDefultApplication"
//     );

//     // 커스텀 Application 개수 계산
//     const customApplications = applications.filter(
//       (app) => app.metadata.name !== "CoreDefultApplication"
//     );
//     const customApplicationCount = customApplications.length;

//     // 메인 Application 선택
//     const selectedApplication = this.selectMainApplication(applications);

//     const result: ApplicationDetectionResult = {
//       applications,
//       selectedApplication,
//       hasDefaultApplication,
//       customApplicationCount
//     };

//     logger.info("Application detection result:", {
//       totalCount: applications.length,
//       customCount: customApplicationCount,
//       hasDefault: hasDefaultApplication,
//       selected: selectedApplication?.metadata.name || "none"
//     });

//     return result;
//   }

//   /**
//    * 메인 Application 선택
//    */
//   static selectMainApplication(
//     applications: BeanDefinition[],
//     strategy: ApplicationSelectionStrategy = ApplicationSelectionStrategy.CUSTOM_FIRST
//   ): BeanDefinition | undefined {
//     if (applications.length === 0) {
//       return undefined;
//     }

//     switch (strategy) {
//       case ApplicationSelectionStrategy.CUSTOM_FIRST:
//         return this.selectCustomFirst(applications);

//       case ApplicationSelectionStrategy.PRIORITY:
//         return this.selectByPriority(applications);

//       case ApplicationSelectionStrategy.NAME:
//         return this.selectByName(applications);

//       case ApplicationSelectionStrategy.FIRST:
//         return applications[0];

//       default:
//         return this.selectCustomFirst(applications);
//     }
//   }

//   /**
//    * 커스텀 Application 우선 선택
//    */
//   private static selectCustomFirst(
//     applications: BeanDefinition[]
//   ): BeanDefinition | undefined {
//     // 1. 커스텀 Application들 먼저 확인
//     const customApps = applications.filter(
//       (app) => app.metadata.name !== "CoreDefultApplication"
//     );

//     if (customApps.length > 0) {
//       if (customApps.length === 1) {
//         logger.info(
//           `Selected custom application: ${customApps[0].metadata.name}`
//         );
//         return customApps[0];
//       } else {
//         // 여러 커스텀 Application이 있으면 우선순위로 선택
//         logger.warn(
//           `Multiple custom applications found (${customApps.length}), selecting by priority`
//         );
//         return this.selectByPriority(customApps);
//       }
//     }

//     // 2. 커스텀 Application이 없으면 CoreDefultApplication 사용
//     const defaultApp = applications.find(
//       (app) => app.metadata.name === "CoreDefultApplication"
//     );

//     if (defaultApp) {
//       logger.info("Using CoreDefultApplication as fallback");
//       return defaultApp;
//     }

//     logger.warn("No suitable application found");
//     return undefined;
//   }

//   /**
//    * 우선순위 기반 선택 (낮은 숫자가 높은 우선순위)
//    */
//   private static selectByPriority(
//     applications: BeanDefinition[]
//   ): BeanDefinition | undefined {
//     const sorted = [...applications].sort(
//       (a, b) => a.metadata.priority - b.metadata.priority
//     );

//     if (
//       sorted.length > 1 &&
//       sorted[0].metadata.priority === sorted[1].metadata.priority
//     ) {
//       logger.warn(
//         `Multiple applications with same priority (${sorted[0].metadata.priority}): ` +
//           `${sorted[0].metadata.name}, ${sorted[1].metadata.name}. Using first one.`
//       );
//     }

//     logger.info(
//       `Selected application by priority: ${sorted[0].metadata.name} (priority: ${sorted[0].metadata.priority})`
//     );
//     return sorted[0];
//   }

//   /**
//    * 이름 기반 선택 (알파벳 순서)
//    */
//   private static selectByName(
//     applications: BeanDefinition[]
//   ): BeanDefinition | undefined {
//     const sorted = [...applications].sort((a, b) =>
//       a.metadata.name.localeCompare(b.metadata.name)
//     );
//     logger.info(`Selected application by name: ${sorted[0].metadata.name}`);
//     return sorted[0];
//   }

//   /**
//    * Application Bean 검증
//    */
//   static validateApplicationBean(beanDefinition: BeanDefinition): {
//     valid: boolean;
//     issues: string[];
//   } {
//     const issues: string[] = [];

//     // 기본 검증
//     if (!beanDefinition.target) {
//       issues.push("Application bean has no target class");
//     }

//     // @Application 데코레이터 검증
//     if (beanDefinition.metadata.type !== BeanType.APPLICATION) {
//       issues.push("Bean is not marked with @Application decorator");
//     }

//     // main() 메서드 존재 여부 검증 (선택적)
//     if (beanDefinition.target) {
//       const prototype = beanDefinition.target.prototype;
//       if (prototype && typeof prototype.main !== "function") {
//         logger.warn(
//           `Application ${beanDefinition.metadata.name} does not have main() method`
//         );
//       }
//     }

//     return {
//       valid: issues.length === 0,
//       issues
//     };
//   }

//   /**
//    * Application Bean들이 충돌하는지 확인
//    */
//   static checkForConflicts(applications: BeanDefinition[]): {
//     hasConflicts: boolean;
//     conflicts: Array<{
//       type: "duplicate_name" | "same_priority";
//       beans: BeanDefinition[];
//       message: string;
//     }>;
//   } {
//     const conflicts: any[] = [];

//     // 이름 중복 검사
//     const nameGroups = new Map<string, BeanDefinition[]>();
//     applications.forEach((app) => {
//       const name = app.metadata.name;
//       if (!nameGroups.has(name)) {
//         nameGroups.set(name, []);
//       }
//       nameGroups.get(name)!.push(app);
//     });

//     for (const [name, beans] of nameGroups) {
//       if (beans.length > 1) {
//         conflicts.push({
//           type: "duplicate_name",
//           beans,
//           message: `Duplicate application name: ${name}`
//         });
//       }
//     }

//     // 우선순위 중복 검사 (CoreDefultApplication 제외)
//     const customApps = applications.filter(
//       (app) => app.metadata.name !== "CoreDefultApplication"
//     );
//     const priorityGroups = new Map<number, BeanDefinition[]>();

//     customApps.forEach((app) => {
//       const priority = app.metadata.priority;
//       if (!priorityGroups.has(priority)) {
//         priorityGroups.set(priority, []);
//       }
//       priorityGroups.get(priority)!.push(app);
//     });

//     for (const [priority, beans] of priorityGroups) {
//       if (beans.length > 1) {
//         conflicts.push({
//           type: "same_priority",
//           beans,
//           message: `Multiple applications with same priority ${priority}: ${beans.map((b) => b.metadata.name).join(", ")}`
//         });
//       }
//     }

//     return {
//       hasConflicts: conflicts.length > 0,
//       conflicts
//     };
//   }
// }
