import { LaunchMode } from "./LaunchMode";

// LaunchMode를 다시 export (재export)
export { LaunchMode } from "./LaunchMode";

/**
 * Express 서버 설정 인터페이스
 */
export interface ExpressConfig {
  /** 서버 포트 (기본값: 3000) */
  port?: number;
  /** 호스트 주소 (기본값: '0.0.0.0') */
  host?: string;
  /** 정적 파일 서빙 경로 */
  staticPath?: string;
  /** CORS 설정 활성화 여부 */
  enableCors?: boolean;
  /** 상세한 CORS 옵션 */
  corsOptions?: {
    origin?: string | string[] | boolean;
    credentials?: boolean;
    methods?: string[];
    allowedHeaders?: string[];
  };
  /** Body parser 미들웨어 설정 */
  bodyParser?: {
    json?: boolean;
    urlencoded?: boolean;
    limit?: string;
  };
  /** Body Parser 미들웨어 활성화 */
  enableBodyParser?: boolean;
  /** 상세한 Body Parser 옵션 */
  bodyParserOptions?: {
    limit?: string;
    extended?: boolean;
    json?: {
      limit?: string;
      strict?: boolean;
    };
    urlencoded?: {
      limit?: string;
      extended?: boolean;
      parameterLimit?: number;
    };
    raw?: {
      limit?: string;
      type?: string;
    };
    text?: {
      limit?: string;
      type?: string;
    };
  };
  /** 커스텀 미들웨어 배열 */
  customMiddleware?: Array<(req: any, res: any, next: any) => void>;
  /** 라우트 접두사 */
  routePrefix?: string;
  /** Helmet 보안 미들웨어 활성화 */
  enableHelmet?: boolean;
  /** 압축 미들웨어 활성화 */
  enableCompression?: boolean;
}

/**
 * DI 컨테이너 설정 인터페이스
 */
export interface DIConfig {
  /** Bean 생성 시 Eager 초기화 여부 (기본값: false) */
  eagerInitialization?: boolean;
  /** 순환 의존성 허용 여부 (기본값: false) */
  allowCircularDependency?: boolean;
  /** Bean 생명주기 이벤트 리스너 */
  lifecycleListeners?: {
    onBeanCreated?: (beanName: string, instance: any) => void;
    onBeanDestroyed?: (beanName: string, instance: any) => void;
  };
  /** 프로파일 기반 Bean 활성화 */
  activeProfiles?: string[];
}

/**
 * 애플리케이션 시작 설정 인터페이스
 * 
 * 모든 실행 모드에서 사용할 수 있는 통합 설정 인터페이스입니다.
 * 각 모드별로 필요한 설정만 사용됩니다.
 */
export interface LaunchConfiguration {
  /** 실행 모드 (기본값: LaunchMode.AUTO) */
  mode?: LaunchMode;
  
  /** Express 서버 활성화 여부 (mode가 AUTO일 때 자동 결정) */
  enableExpress?: boolean;
  
  /** @Application 클래스 자동 감지 활성화 여부 (기본값: true) */
  enableAutoApplication?: boolean;
  
  /** 사용자 정의 Application 클래스 (CUSTOM 모드에서 사용) */
  customApplicationClass?: any;
  
  /** Express 서버 설정 */
  expressConfig?: ExpressConfig;
  
  /** DI 컨테이너 설정 */
  diConfig?: DIConfig;
  
  /** 컴포넌트 스캔 경로 배열 (기본값: [process.cwd() + '/src']) */
  scanPaths?: string[];
  
  /** 환경 프로파일 (dev, prod, test 등) */
  profile?: string;
  
  /** 로깅 레벨 설정 */
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent';
  
  /** 애플리케이션 시작 완료 후 콜백 함수 */
  onStarted?: (context: any) => void | Promise<void>;
  
  /** 애플리케이션 종료 전 콜백 함수 */
  onBeforeShutdown?: (context: any) => void | Promise<void>;
  
  /** 커스텀 초기화 함수 (CUSTOM 모드에서 사용) */
  customInitializer?: (context: any) => void | Promise<void>;
  
  /** 개발 모드 활성화 여부 (기본값: NODE_ENV === 'development') */
  developmentMode?: boolean;
  
  /** 메트릭스 및 모니터링 활성화 */
  enableMetrics?: boolean;
  
  /** 헬스체크 엔드포인트 활성화 */
  enableHealthCheck?: boolean;
}

/**
 * LaunchConfiguration 유틸리티 클래스
 */
export class LaunchConfigurationUtils {
  /**
   * 기본 설정으로 LaunchConfiguration을 생성
   */
  static createDefault(): LaunchConfiguration {
    return {
      mode: LaunchMode.AUTO,
      enableExpress: true,
      enableAutoApplication: true,
      scanPaths: [process.cwd() + '/src'],
      profile: process.env.NODE_ENV || 'development',
      logLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      developmentMode: process.env.NODE_ENV === 'development',
      enableMetrics: false,
      enableHealthCheck: true,
      expressConfig: {
        port: parseInt(process.env.PORT || '3000', 10),
        host: '0.0.0.0',
        enableCors: true,
        bodyParser: {
          json: true,
          urlencoded: true,
          limit: '10mb'
        }
      },
      diConfig: {
        eagerInitialization: false,
        allowCircularDependency: false,
        activeProfiles: []
      }
    };
  }
  
  /**
   * 사용자 설정과 기본 설정을 병합
   */
  static merge(userConfig: LaunchConfiguration): LaunchConfiguration {
    const defaultConfig = this.createDefault();
    
    return {
      ...defaultConfig,
      ...userConfig,
      expressConfig: {
        ...defaultConfig.expressConfig,
        ...userConfig.expressConfig
      },
      diConfig: {
        ...defaultConfig.diConfig,
        ...userConfig.diConfig
      },
      scanPaths: userConfig.scanPaths || defaultConfig.scanPaths
    };
  }
  
  /**
   * 환경변수에서 설정값 로드
   */
  static fromEnvironment(): Partial<LaunchConfiguration> {
    return {
      mode: process.env.ORKIS_LAUNCH_MODE ? 
        LaunchMode[process.env.ORKIS_LAUNCH_MODE.toUpperCase() as keyof typeof LaunchMode] : 
        LaunchMode.AUTO,
      profile: process.env.NODE_ENV || 'development',
      logLevel: (process.env.LOG_LEVEL as any) || 'debug',
      developmentMode: process.env.NODE_ENV === 'development',
      expressConfig: {
        port: parseInt(process.env.PORT || '3000', 10),
        host: process.env.HOST || '0.0.0.0'
      }
    };
  }
  
  /**
   * 설정 유효성 검증
   */
  static validate(config: LaunchConfiguration): void {
    if (!config.mode) {
      throw new Error('Launch mode is required');
    }
    
    if (!config.scanPaths || config.scanPaths.length === 0) {
      throw new Error('At least one scan path is required');
    }
    
    if (config.mode === LaunchMode.CUSTOM && !config.customApplicationClass && !config.customInitializer) {
      throw new Error('Custom mode requires either customApplicationClass or customInitializer');
    }
    
    if (config.expressConfig?.port && (config.expressConfig.port < 1 || config.expressConfig.port > 65535)) {
      throw new Error('Express port must be between 1 and 65535');
    }
  }
  
  /**
   * 설정 정보를 로그용으로 마스킹
   */
  static toLogSafeString(config: LaunchConfiguration): string {
    const safeConfig = {
      ...config,
      customApplicationClass: config.customApplicationClass?.name || 'undefined',
      onStarted: config.onStarted ? 'function' : 'undefined',
      onBeforeShutdown: config.onBeforeShutdown ? 'function' : 'undefined',
      customInitializer: config.customInitializer ? 'function' : 'undefined'
    };
    
    return JSON.stringify(safeConfig, null, 2);
  }
}