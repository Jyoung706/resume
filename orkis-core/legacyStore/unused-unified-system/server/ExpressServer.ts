// import express, {
//   Application as ExpressApp,
//   Request,
//   Response,
//   NextFunction
// } from "express";
// import { ExpressConfig } from "../../launcher/LaunchConfiguration";
// import { logger } from "../../../src/main/utils";

// /**
//  * Express 서버 래퍼 클래스
//  *
//  * Express 서버의 생성, 설정, 시작/종료를 담당하는 래퍼입니다.
//  */
// export class ExpressServer {
//   /** Express 애플리케이션 인스턴스 */
//   private app: ExpressApp;

//   /** HTTP 서버 인스턴스 */
//   private server?: any;

//   /** 서버 설정 */
//   private config: ExpressConfig;

//   /** 서버 실행 상태 */
//   private running = false;

//   /** 시작 시간 */
//   private startTime?: Date;

//   constructor(config: ExpressConfig = {}) {
//     this.config = {
//       port: 3000,
//       host: "0.0.0.0",
//       enableCors: true,
//       bodyParser: {
//         json: true,
//         urlencoded: true,
//         limit: "10mb"
//       },
//       ...config
//     };

//     this.app = express();
//     this.setupMiddleware();
//   }

//   /**
//    * Express 애플리케이션 인스턴스 조회
//    */
//   getApp(): ExpressApp {
//     return this.app;
//   }

//   /**
//    * 서버 시작
//    */
//   async start(): Promise<void> {
//     if (this.running) {
//       logger.info("Express server is already running");
//       return;
//     }

//     return new Promise((resolve, reject) => {
//       try {
//         this.server = this.app.listen(
//           this.config.port || 3000,
//           this.config.host || "0.0.0.0",
//           () => {
//             this.running = true;
//             this.startTime = new Date();
//             logger.info(
//               `Express server started on http://${this.config.host}:${this.config.port}`
//             );
//             resolve();
//           }
//         );

//         this.server.on("error", (error: any) => {
//           logger.error("Express server error:", error);
//           reject(error);
//         });
//       } catch (error) {
//         logger.error("Failed to start Express server:", error);
//         reject(error);
//       }
//     });
//   }

//   /**
//    * 서버 중지
//    */
//   async stop(): Promise<void> {
//     if (!this.running || !this.server) {
//       logger.info("Express server is not running");
//       return;
//     }

//     return new Promise((resolve, reject) => {
//       this.server.close((error: any) => {
//         if (error) {
//           logger.error("Error stopping Express server:", error);
//           reject(error);
//         } else {
//           this.running = false;
//           this.startTime = undefined;
//           logger.info("Express server stopped");
//           resolve();
//         }
//       });
//     });
//   }

//   /**
//    * 서버 실행 상태 확인
//    */
//   isRunning(): boolean {
//     return this.running;
//   }

//   /**
//    * 서버 실행 시간 조회
//    */
//   getUptime(): number {
//     if (!this.startTime) return 0;
//     return Date.now() - this.startTime.getTime();
//   }

//   /**
//    * 서버 설정 조회
//    */
//   getConfig(): ExpressConfig {
//     return { ...this.config };
//   }

//   /**
//    * 서버 상태 정보 조회
//    */
//   getStatus(): {
//     running: boolean;
//     uptime: number;
//     port?: number;
//     host?: string;
//   } {
//     return {
//       running: this.running,
//       uptime: this.getUptime(),
//       port: this.config.port,
//       host: this.config.host
//     };
//   }

//   /**
//    * 기본 미들웨어 설정
//    */
//   private setupMiddleware(): void {
//     // CORS 설정
//     if (this.config.enableCors) {
//       this.app.use((req: Request, res: Response, next: NextFunction) => {
//         res.header("Access-Control-Allow-Origin", "*");
//         res.header(
//           "Access-Control-Allow-Methods",
//           "GET,PUT,POST,DELETE,OPTIONS"
//         );
//         res.header(
//           "Access-Control-Allow-Headers",
//           "Content-Type, Authorization"
//         );

//         if (req.method === "OPTIONS") {
//           res.sendStatus(200);
//         } else {
//           next();
//         }
//       });
//     }

//     // Body Parser 설정
//     if (this.config.bodyParser?.json) {
//       this.app.use(
//         express.json({
//           limit: this.config.bodyParser.limit || "10mb"
//         })
//       );
//     }

//     if (this.config.bodyParser?.urlencoded) {
//       this.app.use(
//         express.urlencoded({
//           extended: true,
//           limit: this.config.bodyParser.limit || "10mb"
//         })
//       );
//     }

//     // 정적 파일 설정
//     if (this.config.staticPath) {
//       this.app.use(express.static(this.config.staticPath));
//       logger.info(`Static files served from: ${this.config.staticPath}`);
//     }

//     // 커스텀 미들웨어 설정
//     if (this.config.customMiddleware) {
//       for (const middleware of this.config.customMiddleware) {
//         this.app.use(middleware);
//       }
//       logger.info(
//         `Applied ${this.config.customMiddleware.length} custom middleware(s)`
//       );
//     }

//     // 기본 헬스체크 엔드포인트
//     this.app.get("/health", (req: Request, res: Response) => {
//       res.json({
//         status: "ok",
//         timestamp: new Date().toISOString(),
//         uptime: this.getUptime(),
//         version: process.env.npm_package_version || "1.0.0"
//       });
//     });

//     // 404 핸들러
//     this.app.use((req: Request, res: Response) => {
//       res.status(404).json({
//         error: "Not Found",
//         message: `Route ${req.method} ${req.path} not found`,
//         timestamp: new Date().toISOString()
//       });
//     });

//     // 에러 핸들러
//     this.app.use(
//       (error: any, req: Request, res: Response, next: NextFunction) => {
//         logger.error("Express error:", error);

//         res.status(error.status || 500).json({
//           error: error.name || "Internal Server Error",
//           message: error.message || "An unexpected error occurred",
//           timestamp: new Date().toISOString(),
//           ...(process.env.NODE_ENV === "development" && { stack: error.stack })
//         });
//       }
//     );
//   }
// }
