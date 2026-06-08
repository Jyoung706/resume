import {
  LaunchMode,
  LaunchConfiguration,
  LaunchConfigurationUtils
} from "./LaunchConfiguration";
import { UnifiedContext } from "../core/context/UnifiedContext";
import { logger } from "../utils";

/**
 * ORKIS Core 애플리케이션 런처
 *
 * 모든 사용 패턴의 진입점 역할을 하는 메인 런처 클래스입니다.
 * 싱글톤 패턴으로 전역에서 하나의 컨텍스트만 관리합니다.
 */
export class ApplicationLauncher {
  /** 전역 컨텍스트 인스턴스 */
  private static globalContext?: UnifiedContext;

  /** 종료 중 여부 */
  private static isShuttingDown = false;

  /** 시작 중 여부 */
  private static isStarting = false;

  /** 프로세스 이벤트 리스너 등록 여부 */
  private static processListenersRegistered = false;

  /**
   * 애플리케이션 시작
   *
   * @param config 런처 설정
   * @returns UnifiedContext 인스턴스
   */
  static async start(
    config: LaunchConfiguration = {}
  ): Promise<UnifiedContext> {
    // 동시 시작 방지
    if (this.isStarting) {
      throw new Error("Application is already starting");
    }

    if (this.isShuttingDown) {
      throw new Error("Cannot start application during shutdown");
    }

    // 이미 시작된 경우 기존 컨텍스트 반환
    if (this.globalContext) {
      logger.info("Application already started, returning existing context");
      return this.globalContext;
    }

    this.isStarting = true;

    try {
      logger.info("ORKIS Core Application Launcher starting...");

      // 환경변수에서 설정 병합
      const envConfig = LaunchConfigurationUtils.fromEnvironment();
      const normalizedConfig = LaunchConfigurationUtils.merge({
        ...envConfig,
        ...config
      });

      // 로그 레벨에 따른 상세 정보 출력
      if (normalizedConfig.logLevel === "debug") {
        logger.info("Launch Configuration:");
        logger.info(LaunchConfigurationUtils.toLogSafeString(normalizedConfig));
      }

      // UnifiedContext 생성 및 시작
      this.globalContext = new UnifiedContext();
      await this.globalContext.launch(normalizedConfig);

      // 프로세스 종료 시그널 리스너 등록
      this.registerProcessListeners();

      logger.info("ORKIS Core Application Launcher started successfully");
      return this.globalContext;
    } catch (error) {
      logger.error("Failed to start ORKIS Core Application:", error);
      this.globalContext = undefined;
      throw error;
    } finally {
      this.isStarting = false;
    }
  }

  /**
   * 애플리케이션 종료
   */
  static async shutdown(): Promise<void> {
    if (!this.globalContext || this.isShuttingDown) {
      logger.info("Application is not running or already shutting down");
      return;
    }

    logger.info("ORKIS Core Application Launcher shutting down...");
    this.isShuttingDown = true;

    try {
      await this.globalContext.shutdown();
      this.globalContext = undefined;
      logger.info("ORKIS Core Application Launcher shutdown completed");
    } catch (error) {
      logger.error("Error during application shutdown:", error);
      throw error;
    } finally {
      this.isShuttingDown = false;
    }
  }

  /**
   * 현재 컨텍스트 조회
   */
  static getContext(): UnifiedContext | undefined {
    return this.globalContext;
  }

  /**
   * 애플리케이션 실행 상태 확인
   */
  static isRunning(): boolean {
    return (
      this.globalContext !== undefined &&
      this.globalContext.getState() === "running"
    );
  }

  /**
   * 시작 중 여부 확인
   */
  static isStartingUp(): boolean {
    return this.isStarting;
  }

  /**
   * 종료 중 여부 확인
   */
  static isShuttingDownState(): boolean {
    return this.isShuttingDown;
  }

  /**
   * 애플리케이션 상태 정보 조회
   */
  static getStatus(): {
    running: boolean;
    starting: boolean;
    shuttingDown: boolean;
    uptime?: number;
    state?: string;
  } {
    return {
      running: this.isRunning(),
      starting: this.isStarting,
      shuttingDown: this.isShuttingDown,
      uptime: this.globalContext?.getUptime(),
      state: this.globalContext?.getState()
    };
  }

  /**
   * 프로세스 시그널 리스너 등록
   */
  private static registerProcessListeners(): void {
    if (this.processListenersRegistered) {
      return;
    }

    logger.info("Registering process signal listeners...");

    // SIGTERM 시그널 (정상 종료)
    process.on("SIGTERM", async () => {
      logger.info("Received SIGTERM signal");
      await this.gracefulShutdown("SIGTERM");
    });

    // SIGINT 시그널 (Ctrl+C)
    process.on("SIGINT", async () => {
      logger.info("Received SIGINT signal (Ctrl+C)");
      await this.gracefulShutdown("SIGINT");
    });

    // 예상치 못한 예외
    process.on("uncaughtException", async (error) => {
      logger.error("Uncaught Exception:", error);
      await this.emergencyShutdown("uncaughtException", error);
    });

    // Promise rejection
    process.on("unhandledRejection", async (reason, promise) => {
      logger.error(
        "Unhandled Promise Rejection at:",
        promise,
        "reason:",
        reason
      );
      await this.emergencyShutdown("unhandledRejection", reason);
    });

    // 프로세스 종료 직전
    process.on("beforeExit", async (code) => {
      logger.info("Process beforeExit with code:", code);
      if (this.globalContext && !this.isShuttingDown) {
        await this.shutdown();
      }
    });

    this.processListenersRegistered = true;
    logger.info("Process signal listeners registered");
  }

  /**
   * 정상적인 종료 처리
   */
  private static async gracefulShutdown(signal: string): Promise<void> {
    logger.info(`Initiating graceful shutdown due to ${signal}...`);

    try {
      await this.shutdown();
      logger.info("Graceful shutdown completed");
      process.exit(0);
    } catch (error) {
      logger.error("Error during graceful shutdown:", error);
      process.exit(1);
    }
  }

  /**
   * 응급 종료 처리
   */
  private static async emergencyShutdown(
    reason: string,
    error?: any
  ): Promise<void> {
    logger.error(`Emergency shutdown due to ${reason}:`, error);

    try {
      // 짧은 시간 내에 강제 종료
      const shutdownTimeout = setTimeout(() => {
        logger.error("Emergency shutdown timeout, forcing exit");
        process.exit(1);
      }, 5000); // 5초 타임아웃

      if (this.globalContext && !this.isShuttingDown) {
        await this.shutdown();
      }

      clearTimeout(shutdownTimeout);
      process.exit(1);
    } catch (shutdownError) {
      logger.error("Error during emergency shutdown:", shutdownError);
      process.exit(1);
    }
  }
}

/**
 * 편의 함수들
 */

/**
 * 기본 설정으로 애플리케이션 시작
 */
export async function startApplication(
  config?: LaunchConfiguration
): Promise<UnifiedContext> {
  return ApplicationLauncher.start(config);
}

/**
 * DI 컨테이너만 사용하는 애플리케이션 시작
 */
export async function startStandaloneApplication(
  scanPaths?: string[]
): Promise<UnifiedContext> {
  return ApplicationLauncher.start({
    mode: LaunchMode.DI_ONLY,
    scanPaths: scanPaths || [process.cwd() + "/src"]
  });
}

/**
 * 애플리케이션 종료
 */
export async function shutdownApplication(): Promise<void> {
  return ApplicationLauncher.shutdown();
}

/**
 * 현재 실행 중인 컨텍스트 조회
 */
export function getCurrentContext(): UnifiedContext | undefined {
  return ApplicationLauncher.getContext();
}
