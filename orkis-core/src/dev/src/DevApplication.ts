import { ExpressApplication } from "../../main/application";
import { Application } from "../../main/core";
import logger from "../../main/utils";

@Application({
  // requestLogging: true
  requestLogging: {
    enabled: true,
    excludePaths: ["/my/*"]
  },
  httpModule: {
    baseURL: "http://localhost:8000"
  },
  scanCoreExtensions: false,
  cors: true
})
export class DevApplication extends ExpressApplication {
  protected async onAfterInitialize(): Promise<void> {}

  protected async onAfterStart(): Promise<void> {
    logger.info("========================================");
    logger.info("=== Orkis Core Development Mode ===");
    logger.info("=== No external Application found ===");
    logger.info("=== Using DevApplication ===");
    logger.info("========================================");
  }
}
