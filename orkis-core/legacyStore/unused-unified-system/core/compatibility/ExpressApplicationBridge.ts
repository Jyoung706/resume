// import { ExpressApplication } from "../../express/model/ExpressApplication";
// import { UnifiedContext } from "../context/UnifiedContext";
// import { ApplicationContextCompatibilityLayer } from "./ApplicationContextCompatibilityLayer";
// import {
//   LaunchConfiguration,
//   LaunchMode
// } from "../../launcher/LaunchConfiguration";
// import { ApplicationLauncher } from "../../launcher/ApplicationLauncher";
// import { logger } from "../../utils";

// /**
//  * ExpressApplication 브리지 클래스
//  *
//  * 기존 ExpressApplication 패턴을 새로운 UnifiedContext와 연결하여
//  * 레거시 코드가 수정 없이 동작할 수 있도록 지원합니다.
//  */
// export class ExpressApplicationBridge extends ExpressApplication {
//   /** 통합 컨텍스트 */
//   private unifiedContext?: UnifiedContext;

//   /** 브리지 설정 */
//   private bridgeConfig: LaunchConfiguration;

//   constructor(config?: LaunchConfiguration) {
//     super();

//     // 기본 설정
//     this.bridgeConfig = {
//       mode: LaunchMode.AUTO,
//       enableExpress: true,
//       enableAutoApplication: true,
//       scanPaths: config?.scanPaths || [process.cwd() + "/src"],
//       ...config
//     };

//     logger.info("ExpressApplicationBridge 초기화");
//   }

//   /**
//    * 브리지 초기화
//    */
//   private async initializeBridge(): Promise<void> {
//     logger.info("UnifiedContext 브리지 초기화 시작...");

//     try {
//       // UnifiedContext 시작
//       this.unifiedContext = await ApplicationLauncher.start(this.bridgeConfig);

//       // ApplicationContext 호환성 레이어 설정
//       const compatibilityLayer =
//         this.unifiedContext.getApplicationContextCompatibility();
//       if (compatibilityLayer) {
//         // 기존 ApplicationContext를 호환성 레이어로 대체
//         this.ApplicationContext = compatibilityLayer as any;
//         logger.info("ApplicationContext가 호환성 레이어로 대체되었습니다");
//       }

//       logger.info("UnifiedContext 브리지 초기화 완료");
//     } catch (error) {
//       logger.error("브리지 초기화 실패:", error);
//       throw error;
//     }
//   }

//   /**
//    * 메인 메서드 (추상 메서드 구현)
//    */
//   public async main(args?: string[]): Promise<any> {
//     logger.info("ExpressApplicationBridge main() 시작");

//     // 브리지 초기화
//     await this.initializeBridge();

//     // 사용자 정의 main 로직 실행 가능
//     if (this.onMain) {
//       return await this.onMain(args);
//     }

//     return "ExpressApplicationBridge initialized";
//   }

//   /**
//    * 사용자 정의 main 로직 (옵션)
//    */
//   protected onMain?: (args?: string[]) => Promise<any>;

//   /**
//    * 서버 초기화 (오버라이드)
//    */
//   public initializeServer(): void {
//     logger.info(
//       "ExpressApplicationBridge initializeServer() - 새로운 시스템 사용"
//     );

//     // 새로운 시스템이 이미 Express 서버를 초기화했으므로
//     // 기존 초기화 로직 건너뛰기
//     if (this.unifiedContext?.getExpressIntegration()) {
//       const expressIntegration = this.unifiedContext.getExpressIntegration();
//       if (expressIntegration) {
//         // Express 앱 인스턴스 연결 (타입 캐스팅으로 호환성 문제 해결)
//         this.server = expressIntegration.getExpressApp() as any;
//         logger.info("Express 서버가 UnifiedContext에서 관리됩니다");
//       }
//     } else {
//       // Fallback: 기존 방식으로 초기화
//       super.initializeServer();
//     }
//   }

//   /**
//    * 컴포넌트 초기화 (오버라이드)
//    */
//   public initializeComponents(): void {
//     logger.info(
//       "ExpressApplicationBridge initializeComponents() - 새로운 시스템 사용"
//     );

//     // 새로운 시스템이 이미 컴포넌트를 초기화했으므로
//     // 기존 초기화 로직 건너뛰기
//     if (this.unifiedContext) {
//       logger.info("컴포넌트가 UnifiedContext에서 관리됩니다");

//       // 라우트 정보 출력
//       const expressIntegration = this.unifiedContext.getExpressIntegration();
//       if (expressIntegration) {
//         const routes = expressIntegration.getRegisteredRoutes();
//         logger.info(`등록된 라우트 수: ${routes.length}`);
//       }
//     } else {
//       // Fallback: 기존 방식으로 초기화
//       super.initializeComponents();
//     }
//   }

//   /**
//    * 서버 시작 (오버라이드)
//    */
//   public startServer(): void {
//     logger.info("ExpressApplicationBridge startServer() - 새로운 시스템 사용");

//     // 새로운 시스템이 이미 서버를 시작했으므로
//     // 기존 시작 로직 건너뛰기
//     if (this.unifiedContext?.getExpressIntegration()) {
//       const status = this.unifiedContext
//         .getExpressIntegration()!
//         .getExpressServer()
//         .getStatus();
//       logger.info(`Express 서버 상태:`, status);

//       if (!status.running) {
//         logger.warn(
//           "Express 서버가 아직 시작되지 않았습니다. 수동으로 시작합니다."
//         );
//         super.startServer();
//       }
//     } else {
//       // Fallback: 기존 방식으로 시작
//       super.startServer();
//     }
//   }

//   /**
//    * UnifiedContext 접근
//    */
//   public getUnifiedContext(): UnifiedContext | undefined {
//     return this.unifiedContext;
//   }

//   /**
//    * 브리지 정보 조회
//    */
//   public getBridgeInfo(): {
//     bridgeEnabled: boolean;
//     unifiedContextState?: string;
//     compatibilityLayerActive: boolean;
//     expressIntegrationActive: boolean;
//   } {
//     return {
//       bridgeEnabled: !!this.unifiedContext,
//       unifiedContextState: this.unifiedContext?.getState(),
//       compatibilityLayerActive:
//         !!this.unifiedContext?.getApplicationContextCompatibility(),
//       expressIntegrationActive: !!this.unifiedContext?.getExpressIntegration()
//     };
//   }

//   /**
//    * 정적 팩토리 메서드 - 간편한 생성
//    */
//   static create(config?: LaunchConfiguration): ExpressApplicationBridge {
//     return new ExpressApplicationBridge(config);
//   }

//   /**
//    * 레거시 애플리케이션을 브리지로 래핑
//    */
//   static wrapLegacyApplication<T extends ExpressApplication>(
//     LegacyApp: new () => T,
//     config?: LaunchConfiguration
//   ): ExpressApplicationBridge {
//     const bridge = new ExpressApplicationBridge(config);

//     // 레거시 애플리케이션의 main 메서드 위임
//     const legacyInstance = new LegacyApp();
//     bridge.onMain = async (args?: string[]) => {
//       // 레거시 main 메서드 호출
//       if (typeof (legacyInstance as any).main === "function") {
//         return await (legacyInstance as any).main(args);
//       }
//     };

//     return bridge;
//   }
// }
