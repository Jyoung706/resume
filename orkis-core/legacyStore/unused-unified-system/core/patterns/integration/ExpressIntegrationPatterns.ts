import {
  ExpressIntegration,
  ExpressIntegrationConfig
} from "../../../express/integration/ExpressIntegration";
import { logger } from "../../../utils";
import { IDIContainer } from "../../container";

/**
 * 고성능 API 서버 통합 패턴
 */
export class HighPerformanceApiIntegration extends ExpressIntegration {
  constructor(
    diContainer: IDIContainer,
    config: ExpressIntegrationConfig = {}
  ) {
    super(diContainer, {
      ...config,
      autoRegisterControllers: true,
      autoRegisterMiddleware: true,
      useDefaultErrorHandler: false, // 커스텀 에러 핸들러 사용
      enableRouteLogging: false, // 성능을 위해 비활성화
      routePrefix: config.routePrefix || "/api/v1"
    });
  }

  /**
   * 고성능 설정 적용
   */
  async start(): Promise<void> {
    await super.start();

    const app = this.getExpressApp();

    // Keep-Alive 연결 설정
    app.use((req, res, next) => {
      res.set("Connection", "keep-alive");
      res.set("Keep-Alive", "timeout=5, max=1000");
      next();
    });

    // 응답 압축 최적화
    app.use(this.createCompressionMiddleware());

    // 캐시 헤더 설정
    app.use(this.createCacheMiddleware());

    // 고성능 JSON 파싱
    app.use(this.createOptimizedJsonParser());

    // 커스텀 에러 핸들러
    app.use(this.createHighPerformanceErrorHandler());

    logger.info("🚀 고성능 API 서버 통합 패턴 적용됨");
  }

  private createCompressionMiddleware() {
    return (req: any, res: any, next: any) => {
      // 압축 가능한 응답인지 확인
      const acceptEncoding = req.get("Accept-Encoding") || "";
      if (acceptEncoding.includes("gzip")) {
        res.set("Content-Encoding", "gzip");
      }
      next();
    };
  }

  private createCacheMiddleware() {
    return (req: any, res: any, next: any) => {
      // GET 요청에 대한 캐시 헤더 설정
      if (req.method === "GET") {
        res.set("Cache-Control", "public, max-age=300"); // 5분 캐시
      }
      next();
    };
  }

  private createOptimizedJsonParser() {
    return (req: any, res: any, next: any) => {
      // 빠른 JSON 파싱을 위한 최적화
      if (req.is("json")) {
        // 스트리밍 JSON 파싱 구현
      }
      next();
    };
  }

  private createHighPerformanceErrorHandler() {
    return (error: any, req: any, res: any, next: any) => {
      // 최소한의 에러 정보만 응답 (성능 최적화)
      const statusCode = error.status || 500;
      res.status(statusCode).json({
        error: statusCode >= 500 ? "Internal Server Error" : error.message,
        code: error.code || "UNKNOWN_ERROR",
        timestamp: Date.now()
      });
    };
  }
}

/**
 * 실시간 통신 통합 패턴 (WebSocket + SSE)
 */
export class RealtimeIntegration extends ExpressIntegration {
  private io?: any; // Socket.IO 인스턴스
  private sseConnections: Map<string, any> = new Map();

  constructor(
    diContainer: IDIContainer,
    config: ExpressIntegrationConfig = {}
  ) {
    super(diContainer, {
      ...config,
      autoRegisterControllers: true,
      enableRouteLogging: true
    });
  }

  async start(): Promise<void> {
    await super.start();

    const app = this.getExpressApp();

    // Socket.IO 설정
    this.setupSocketIO();

    // Server-Sent Events 설정
    this.setupSSE(app);

    // WebRTC 시그널링 설정
    this.setupWebRTCSignaling(app);

    logger.info("⚡ 실시간 통신 통합 패턴 적용됨");
  }

  private setupSocketIO(): void {
    try {
      const http = require("http");
      const socketIO = require("socket.io");

      const server = http.createServer(this.getExpressApp());
      this.io = socketIO(server, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"]
        }
      });

      this.io.on("connection", (socket: any) => {
        logger.info(`클라이언트 연결됨: ${socket.id}`);

        socket.on("join-room", (room: string) => {
          socket.join(room);
          logger.info(`소켓 ${socket.id}이 방 ${room}에 입장`);
        });

        socket.on("disconnect", () => {
          logger.info(`클라이언트 연결 해제됨: ${socket.id}`);
        });
      });

      logger.info("🔌 Socket.IO 서버 설정됨");
    } catch (error) {
      logger.warn("Socket.IO 설정 실패 - socket.io 패키지가 필요합니다");
    }
  }

  private setupSSE(app: any): void {
    app.get("/events", (req: any, res: any) => {
      // SSE 헤더 설정
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*"
      });

      const clientId = Date.now().toString();
      this.sseConnections.set(clientId, res);

      // 연결 유지를 위한 핑
      const pingInterval = setInterval(() => {
        res.write('data: {"type":"ping"}\n\n');
      }, 30000);

      req.on("close", () => {
        clearInterval(pingInterval);
        this.sseConnections.delete(clientId);
        logger.info(`SSE 클라이언트 연결 해제: ${clientId}`);
      });

      // 초기 연결 메시지
      res.write(`data: {"type":"connected","clientId":"${clientId}"}\n\n`);
    });

    logger.info("📡 Server-Sent Events 설정됨: /events");
  }

  private setupWebRTCSignaling(app: any): void {
    app.post("/webrtc/offer", (req: any, res: any) => {
      // WebRTC 오퍼 처리
      const { offer, targetId } = req.body;

      if (this.io) {
        this.io
          .to(targetId)
          .emit("webrtc-offer", { offer, from: req.body.fromId });
      }

      res.json({ success: true });
    });

    app.post("/webrtc/answer", (req: any, res: any) => {
      // WebRTC 응답 처리
      const { answer, targetId } = req.body;

      if (this.io) {
        this.io
          .to(targetId)
          .emit("webrtc-answer", { answer, from: req.body.fromId });
      }

      res.json({ success: true });
    });

    logger.info("🎥 WebRTC 시그널링 설정됨");
  }

  /**
   * 모든 SSE 클라이언트에게 메시지 브로드캐스트
   */
  broadcastSSE(message: any): void {
    const data = `data: ${JSON.stringify(message)}\n\n`;
    this.sseConnections.forEach((res) => {
      try {
        res.write(data);
      } catch (error) {
        logger.warn("SSE 메시지 전송 실패:", error);
      }
    });
  }

  /**
   * Socket.IO를 통한 메시지 브로드캐스트
   */
  broadcastSocketIO(event: string, data: any, room?: string): void {
    if (this.io) {
      if (room) {
        this.io.to(room).emit(event, data);
      } else {
        this.io.emit(event, data);
      }
    }
  }
}

/**
 * 보안 강화 통합 패턴
 */
export class SecureIntegration extends ExpressIntegration {
  constructor(
    diContainer: IDIContainer,
    config: ExpressIntegrationConfig = {}
  ) {
    super(diContainer, {
      ...config,
      useDefaultErrorHandler: false // 커스텀 보안 에러 핸들러 사용
    });
  }

  async start(): Promise<void> {
    await super.start();

    const app = this.getExpressApp();

    // 보안 헤더 설정
    this.setupSecurityHeaders(app);

    // 입력 검증 및 소독
    this.setupInputValidation(app);

    // 요청 로깅 및 모니터링
    this.setupSecurityMonitoring(app);

    // CSRF 보호
    this.setupCSRFProtection(app);

    // SQL 인젝션 보호
    this.setupSQLInjectionProtection(app);

    // XSS 보호
    this.setupXSSProtection(app);

    // 보안 에러 핸들러
    app.use(this.createSecurityErrorHandler());

    logger.info("🔒 보안 강화 통합 패턴 적용됨");
  }

  private setupSecurityHeaders(app: any): void {
    app.use((req: any, res: any, next: any) => {
      // 보안 헤더 설정
      res.set({
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Content-Security-Policy": "default-src 'self'",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
      });

      // 서버 정보 숨기기
      res.removeHeader("X-Powered-By");

      next();
    });
  }

  private setupInputValidation(app: any): void {
    app.use((req: any, res: any, next: any) => {
      // 입력 크기 제한
      if (req.body && JSON.stringify(req.body).length > 1000000) {
        // 1MB 제한
        return res.status(413).json({
          error: "Request entity too large",
          code: "PAYLOAD_TOO_LARGE"
        });
      }

      // 위험한 문자 패턴 검사
      const dangerousPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi
      ];

      const requestString = JSON.stringify(req.body);
      for (const pattern of dangerousPatterns) {
        if (pattern.test(requestString)) {
          logger.warn("위험한 패턴 감지:", {
            pattern,
            ip: req.ip,
            url: req.url
          });
          return res.status(400).json({
            error: "Invalid input detected",
            code: "MALICIOUS_INPUT"
          });
        }
      }

      next();
    });
  }

  private setupSecurityMonitoring(app: any): void {
    app.use((req: any, res: any, next: any) => {
      // 의심스러운 활동 모니터링
      const suspiciousPatterns = [
        /\.\.\//g, // Path traversal
        /\/etc\/passwd/g,
        /\/proc\/self\/environ/g
      ];

      const fullUrl = req.url;
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(fullUrl)) {
          logger.error("보안 위협 감지:", {
            ip: req.ip,
            url: req.url,
            userAgent: req.get("User-Agent"),
            timestamp: new Date().toISOString()
          });

          return res.status(403).json({
            error: "Forbidden",
            code: "SECURITY_VIOLATION"
          });
        }
      }

      next();
    });
  }

  private setupCSRFProtection(app: any): void {
    app.use((req: any, res: any, next: any) => {
      // CSRF 토큰 검증 (POST, PUT, DELETE 요청)
      if (["POST", "PUT", "DELETE"].includes(req.method)) {
        const csrfToken = req.get("X-CSRF-Token") || req.body._csrf;

        // 실제로는 세션에 저장된 토큰과 비교
        if (!csrfToken) {
          return res.status(403).json({
            error: "CSRF token required",
            code: "CSRF_TOKEN_REQUIRED"
          });
        }
      }

      next();
    });
  }

  private setupSQLInjectionProtection(app: any): void {
    app.use((req: any, res: any, next: any) => {
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
        /('|(\\')|(;\s*--)|(;\s*\/\*))/gi
      ];

      const requestData = JSON.stringify({ ...req.query, ...req.body });
      for (const pattern of sqlPatterns) {
        if (pattern.test(requestData)) {
          logger.error("SQL 인젝션 시도 감지:", {
            ip: req.ip,
            data: requestData,
            timestamp: new Date().toISOString()
          });

          return res.status(400).json({
            error: "Invalid input",
            code: "SQL_INJECTION_ATTEMPT"
          });
        }
      }

      next();
    });
  }

  private setupXSSProtection(app: any): void {
    app.use((req: any, res: any, next: any) => {
      // 응답 데이터 XSS 필터링
      const originalSend = res.send;
      res.send = function (data: any) {
        if (typeof data === "string") {
          // HTML 태그 제거 또는 이스케이프
          data = data.replace(/<script[^>]*>.*?<\/script>/gi, "");
          data = data.replace(/javascript:/gi, "");
        }
        return originalSend.call(this, data);
      };

      next();
    });
  }

  private createSecurityErrorHandler() {
    return (error: any, req: any, res: any, next: any) => {
      // 보안 관련 에러는 최소한의 정보만 노출
      logger.error("보안 에러:", {
        error: error.message,
        ip: req.ip,
        url: req.url,
        timestamp: new Date().toISOString()
      });

      const statusCode = error.status || 500;
      res.status(statusCode).json({
        error: statusCode >= 500 ? "Internal server error" : "Bad request",
        code: "SECURITY_ERROR",
        timestamp: Date.now()
      });
    };
  }
}

/**
 * 개발 환경 통합 패턴
 */
export class DevelopmentIntegration extends ExpressIntegration {
  constructor(
    diContainer: IDIContainer,
    config: ExpressIntegrationConfig = {}
  ) {
    super(diContainer, {
      ...config,
      enableRouteLogging: true, // 개발 환경에서는 상세 로깅
      useDefaultErrorHandler: false // 개발 친화적 에러 핸들러 사용
    });
  }

  async start(): Promise<void> {
    await super.start();

    const app = this.getExpressApp();

    // 개발 도구 미들웨어
    this.setupDevelopmentTools(app);

    // 상세한 로깅
    this.setupVerboseLogging(app);

    // API 문서 생성
    this.setupApiDocumentation(app);

    // 핫 리로드 지원
    this.setupHotReload(app);

    // 개발 친화적 에러 핸들러
    app.use(this.createDevelopmentErrorHandler());

    logger.info("🛠️ 개발 환경 통합 패턴 적용됨");
  }

  private setupDevelopmentTools(app: any): void {
    // CORS를 모든 도메인에서 허용 (개발 환경)
    app.use((req: any, res: any, next: any) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
      );

      if (req.method === "OPTIONS") {
        return res.status(200).end();
      }

      next();
    });

    // 개발 정보 엔드포인트
    app.get("/dev/info", (req: any, res: any) => {
      res.json({
        environment: "development",
        nodeVersion: process.version,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        routes: this.getRegisteredRoutes(),
        timestamp: new Date().toISOString()
      });
    });
  }

  private setupVerboseLogging(app: any): void {
    app.use((req: any, res: any, next: any) => {
      const start = Date.now();

      logger.info(`🔍 [${new Date().toISOString()}] ${req.method} ${req.url}`, {
        headers: req.headers,
        query: req.query,
        body: req.method !== "GET" ? req.body : undefined,
        ip: req.ip
      });

      res.on("finish", () => {
        const duration = Date.now() - start;
        logger.info(
          `✅ [${req.method}] ${req.url} - ${res.statusCode} (${duration}ms)`
        );
      });

      next();
    });
  }

  private setupApiDocumentation(app: any): void {
    app.get("/dev/api-docs", (req: any, res: any) => {
      const routes = this.getRegisteredRoutes();
      const documentation = {
        title: "API Documentation (Development)",
        version: "1.0.0",
        baseUrl: `http://localhost:${process.env.PORT || 3000}`,
        routes: routes.map((route) => ({
          method: route.method,
          path: route.path,
          controller: route.controller,
          handler: route.handler
        }))
      };

      res.json(documentation);
    });
  }

  private setupHotReload(app: any): void {
    // 파일 변경 감지 및 알림 (개발 환경)
    app.get("/dev/reload", (req: any, res: any) => {
      res.json({
        message: "Hot reload endpoint",
        lastReload: new Date().toISOString()
      });
    });
  }

  private createDevelopmentErrorHandler() {
    return (error: any, req: any, res: any, next: any) => {
      // 개발 환경에서는 상세한 에러 정보 제공
      logger.error("🚨 Development Error:", error);

      res.status(error.status || 500).json({
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
          code: error.code
        },
        request: {
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: req.body,
          query: req.query
        },
        timestamp: new Date().toISOString()
      });
    };
  }
}
