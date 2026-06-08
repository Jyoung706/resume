import "reflect-metadata";
import "../utils/http/types";
import { ApplicationContext } from "../core/container";
import { systemLog } from "../utils/Logger";
import { ApplicationEnvironment, getCliArgs, loadConfig } from "../config";

export class OrkisFactory {
  private static readonly VERSION = "1.0.0";

  static async start(port?: number | string): Promise<void> {
    try {
      this.printBanner();

      // 1. 환경변수 로드 (가장 먼저)
      const cliOptions = getCliArgs();
      loadConfig(cliOptions);

      if (port !== undefined) {
        ApplicationEnvironment.__PORT = port;
      }

      await ApplicationContext.initialize();

      ApplicationContext.run();
    } catch (error) {
      systemLog.error("[OrkisFactory] Failed to start application:", error);
      process.exit(1);
    }
  }

  private static printBanner(): void {
    console.log("");
    console.log(
      "╔══════════════════════════════════════════════════════════════╗"
    );
    console.log(
      `║                    ORKIS CORE v${this.VERSION}                         ║`
    );
    console.log(
      "╚══════════════════════════════════════════════════════════════╝"
    );
    console.log("");
  }
}
