// import { ApplicationContextClass } from "../../context/ApplicationContext";
// import { UnifiedContext } from "../context/UnifiedContext";
// import { BEAN_SCAN_TYPES, BEAN_STATES } from "../../static/ConstValues";
// import { BEAN, BEAN_SCAN_TYPE } from "../../static/Bean";
// import { SCOPE_TYPE, SCOPE_TYPES } from "../../static/Common";
// import { BeanDefinition, BeanType, BeanScope } from "../container/types";
// import { INTERCEPTOR_OPTION } from "../../static";
// import { IF_POINT_CUT } from "../../static/CommonEnum";
// import { logger } from "../../utils";

/**
 * ApplicationContext 호환성 레이어
 *
 * 기존 ApplicationContext API를 새로운 UnifiedContext로 위임하여
 * 레거시 코드가 수정 없이 동작할 수 있도록 지원합니다.
 */
// export class ApplicationContextCompatibilityLayer {
//   /** 새로운 통합 컨텍스트 */
//   private unifiedContext: UnifiedContext;

//   /** 레거시 Bean 캐시 */
//   private legacyBeanCache: Map<string, BEAN> = new Map();

//   /** 인스턴스 캐시 */
//   private instanceCache: Map<string, any> = new Map();

//   constructor(unifiedContext: UnifiedContext) {
//     this.unifiedContext = unifiedContext;
//     logger.info("ApplicationContext 호환성 레이어 초기화");
//   }

//   /**
//    * Bean 스캔 결과 조회 (레거시 호환)
//    */
//   public getScanBeans(scanType?: BEAN_SCAN_TYPE, isBean = false): any[] {
//     if (!scanType) return [];

//     logger.info(
//       `getScanBeans 호출: scanType=${String(scanType?.description)}, isBean=${isBean}`
//     );

//     try {
//       // BEAN_SCAN_TYPE을 BeanType으로 변환
//       const beanType = this.convertScanTypeToBeanType(scanType);
//       if (!beanType) {
//         logger.warn(`지원하지 않는 scanType: ${String(scanType?.description)}`);
//         return [];
//       }

//       // 새로운 DIContainer에서 Bean 정의들 조회
//       const beanDefinitions = this.unifiedContext
//         .getDIContainer()
//         .findBeansByType(beanType);
//       logger.info(`찾은 Bean 정의 개수: ${beanDefinitions.length}`);

//       if (isBean) {
//         // BEAN 객체들 반환
//         return beanDefinitions.map((definition) =>
//           this.convertBeanDefinitionToBEAN(definition)
//         );
//       } else {
//         // Bean 인스턴스들 반환
//         return beanDefinitions.map((definition) => {
//           return this.unifiedContext
//             .getDIContainer()
//             .getBeanByName(definition.metadata.name);
//         });
//       }
//     } catch (error) {
//       logger.error(`getScanBeans 오류:`, error);
//       return [];
//     }
//   }

//   /**
//    * Bean 조회 (레거시 호환)
//    */
//   public getBean(beanKey: string, scope?: SCOPE_TYPE, ...args: any[]): any {
//     logger.info(`getBean 호출: beanKey=${beanKey}, scope=${String(scope)}`);

//     try {
//       // 캐시에서 먼저 확인
//       if (this.instanceCache.has(beanKey)) {
//         return this.instanceCache.get(beanKey);
//       }

//       // 새로운 DIContainer에서 조회
//       const instance = this.unifiedContext
//         .getDIContainer()
//         .getBeanByName(beanKey);

//       // 캐시에 저장
//       if (instance) {
//         this.instanceCache.set(beanKey, instance);
//       }

//       return instance;
//     } catch (error) {
//       logger.warn(`Bean 조회 실패: ${beanKey}`, error);
//       return null;
//     }
//   }

//   /**
//    * Bean 추가 (레거시 호환)
//    */
//   public addBean(bean: BEAN): void {
//     logger.info(`addBean 호출: ${bean.name}`);

//     try {
//       // 레거시 Bean 캐시에 저장
//       this.legacyBeanCache.set(bean.name, bean);

//       // 새로운 시스템에 Bean 정의 등록
//       const beanDefinition = this.convertBEANToBeanDefinition(bean);
//       if (beanDefinition) {
//         this.unifiedContext.getDIContainer().registerBean(beanDefinition);
//       }
//     } catch (error) {
//       logger.error(`addBean 오류:`, error);
//     }
//   }

//   /**
//    * 전체 Bean 목록 조회 (레거시 호환)
//    */
//   public getBeans(): { [key: string]: BEAN } {
//     const result: { [key: string]: BEAN } = {};

//     // 새로운 시스템의 모든 Bean 정의를 레거시 형식으로 변환
//     const allBeanDefinitions = this.unifiedContext
//       .getDIContainer()
//       .getAllBeanDefinitions();

//     for (const definition of allBeanDefinitions) {
//       const legacyBean = this.convertBeanDefinitionToBEAN(definition);
//       result[legacyBean.name] = legacyBean;
//     }

//     // 레거시 캐시의 Bean들도 추가
//     for (const [name, bean] of this.legacyBeanCache) {
//       if (!result[name]) {
//         result[name] = bean;
//       }
//     }

//     return result;
//   }

//   /**
//    * 의존성 주입 실행 (레거시 호환)
//    */
//   public injectDependencies(target: any): void {
//     this.unifiedContext.injectDependencies(target);
//   }

//   /**
//    * BEAN_SCAN_TYPE을 BeanType으로 변환
//    */
//   private convertScanTypeToBeanType(scanType: BEAN_SCAN_TYPE): BeanType | null {
//     const typeMap = new Map<symbol, BeanType>([
//       [BEAN_SCAN_TYPES.APPLICATION, BeanType.APPLICATION],
//       [BEAN_SCAN_TYPES.CONTROLLER, BeanType.CONTROLLER],
//       [BEAN_SCAN_TYPES.SERVICE, BeanType.SERVICE],
//       [BEAN_SCAN_TYPES.COMPONENT, BeanType.COMPONENT],
//       [BEAN_SCAN_TYPES.MIDDLEWARE, BeanType.MIDDLEWARE],
//       [BEAN_SCAN_TYPES.DAO, BeanType.DAO],
//       [BEAN_SCAN_TYPES.CONFIG, BeanType.CONFIGURATION]
//     ]);

//     return typeMap.get(scanType) || null;
//   }

//   /**
//    * BeanDefinition을 레거시 BEAN 형식으로 변환
//    */
//   private convertBeanDefinitionToBEAN(definition: BeanDefinition): BEAN {
//     const legacyBean: BEAN = {
//       name: definition.metadata.name,
//       target: {
//         name: definition.target?.name || definition.metadata.name,
//         origin: definition.target,
//         new: definition.target
//       },
//       scanType: this.convertBeanTypeToScanType(definition.metadata.type),
//       state: BEAN_STATES.SINGLETON_GENERATED,
//       scope:
//         definition.metadata.scope === BeanScope.SINGLETON
//           ? SCOPE_TYPES.SINGLETON_SCOPE
//           : SCOPE_TYPES.PROTOTYPE_SCOPE,
//       option: this.convertBeanMetadataToOption(definition)
//     };

//     return legacyBean;
//   }

//   /**
//    * 레거시 BEAN을 BeanDefinition으로 변환
//    */
//   private convertBEANToBeanDefinition(bean: BEAN): BeanDefinition | null {
//     if (!bean.target?.origin) {
//       logger.warn(`Bean ${bean.name}에 클래스 정보가 없습니다`);
//       return null;
//     }

//     const beanType = this.convertScanTypeToBeanType(bean.scanType!);
//     if (!beanType) {
//       logger.warn(
//         `Bean ${bean.name}의 scanType을 변환할 수 없습니다: ${String(bean.scanType?.description)}`
//       );
//       return null;
//     }

//     const beanDefinition: BeanDefinition = {
//       metadata: {
//         name: bean.name,
//         type: beanType,
//         scope:
//           bean.scope === SCOPE_TYPES.SINGLETON_SCOPE
//             ? BeanScope.SINGLETON
//             : BeanScope.PROTOTYPE,
//         priority: this.extractPriorityFromOption(bean.option),
//         lazy: false,
//         profiles: []
//       },
//       target: bean.target.origin,
//       dependencies: new Map(),
//       initialized: false,
//       destroyed: false
//     };

//     return beanDefinition;
//   }

//   /**
//    * BeanType을 BEAN_SCAN_TYPE으로 변환
//    */
//   private convertBeanTypeToScanType(beanType: BeanType): BEAN_SCAN_TYPE {
//     const typeMap = new Map<BeanType, BEAN_SCAN_TYPE>([
//       [BeanType.APPLICATION, BEAN_SCAN_TYPES.APPLICATION],
//       [BeanType.CONTROLLER, BEAN_SCAN_TYPES.CONTROLLER],
//       [BeanType.SERVICE, BEAN_SCAN_TYPES.SERVICE],
//       [BeanType.COMPONENT, BEAN_SCAN_TYPES.COMPONENT],
//       [BeanType.MIDDLEWARE, BEAN_SCAN_TYPES.MIDDLEWARE],
//       [BeanType.DAO, BEAN_SCAN_TYPES.DAO],
//       [BeanType.CONFIGURATION, BEAN_SCAN_TYPES.CONFIG]
//     ]);

//     return typeMap.get(beanType) || BEAN_SCAN_TYPES.ETC;
//   }

//   /**
//    * BeanMetadata를 레거시 option으로 변환
//    */
//   private convertBeanMetadataToOption(definition: BeanDefinition): any {
//     // 기본 옵션
//     let option: any = {
//       PRIORITY: definition.metadata.priority
//     };

//     // Middleware의 경우 INTERCEPTOR_OPTION 형식으로 변환
//     if (definition.metadata.type === BeanType.MIDDLEWARE) {
//       option = {
//         POINT_CUT: IF_POINT_CUT.BEFORE, // 기본값
//         PRIORITY: definition.metadata.priority
//       } as INTERCEPTOR_OPTION;

//       // 메타데이터에서 POINT_CUT 정보 추출 시도
//       try {
//         const middlewareMetadata = Reflect.getMetadata(
//           "middleware",
//           definition.target
//         );
//         if (middlewareMetadata && middlewareMetadata.pointCut !== undefined) {
//           option.POINT_CUT = middlewareMetadata.pointCut;
//         }
//       } catch (error) {
//         logger.warn(
//           `Middleware ${definition.metadata.name}의 POINT_CUT 정보를 추출할 수 없습니다:`,
//           error
//         );
//       }
//     }

//     return option;
//   }

//   /**
//    * 레거시 option에서 priority 추출
//    */
//   private extractPriorityFromOption(option: any): number {
//     if (option && typeof option === "object") {
//       return option.PRIORITY || option.priority || 0;
//     }
//     return 0;
//   }

//   /**
//    * 호환성 레이어 정보 조회
//    */
//   public getCompatibilityInfo(): {
//     unifiedContextState: string;
//     legacyBeanCacheSize: number;
//     instanceCacheSize: number;
//     totalBeans: number;
//   } {
//     return {
//       unifiedContextState: this.unifiedContext.getState(),
//       legacyBeanCacheSize: this.legacyBeanCache.size,
//       instanceCacheSize: this.instanceCache.size,
//       totalBeans: this.unifiedContext.getDIContainer().getAllBeanDefinitions()
//         .length
//     };
//   }

//   /**
//    * 캐시 정리
//    */
//   public clearCache(): void {
//     this.instanceCache.clear();
//     this.legacyBeanCache.clear();
//     logger.info("호환성 레이어 캐시가 정리되었습니다");
//   }
// }
