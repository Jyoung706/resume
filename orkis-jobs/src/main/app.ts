import { ExpressApplication } from "@orkis/core/application";
import { Application } from "@orkis/core/common";
import { ApplicationContext } from "@orkis/core";
import logger from "@orkis/core/utils";
import { JobScheduler } from "@/scheduler/JobScheduler";

@Application({ requestLogging: true })
export class JobsApplication extends ExpressApplication {
  async onBeforeInitialize() {}
  async onBeforeStart() {}
  async onAfterInitialize() {}

  async onAfterStart() {
    const scheduler = ApplicationContext.getBean("JobScheduler") as JobScheduler;
    scheduler.startAllJobs();
    logger.info(`[JobsApplication] Server started on port ${process.env.PORT}`);
    this.registerShutdownHooks(scheduler);
  }

  private registerShutdownHooks(scheduler: JobScheduler) {
    const shutdown = async () => {
      logger.info("[JobsApplication] Shutting down ....");
      scheduler.stopAllJobs();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }
}
