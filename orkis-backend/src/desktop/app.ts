import { SessionPlugin } from "@orkis/core/plugins";
import { Application } from "@orkis/core/common";
import { ExpressApplication } from "@orkis/core/application";
import express from "express";
import path from "path";
import { initializeSchema } from "./database/SqliteConfig";

@Application({
  requestLogging: true
})
export class BackendApplication extends ExpressApplication {
  async onBeforeInitialize(): Promise<void> {
    // await SessionPlugin.apply(this.app, "sessionRedis");

    await SessionPlugin.apply(this.app);

    // Storage 폴더 정적 파일 서빙 (프로필 이미지 등)
    const dataRoot = process.env.DATA_PATH || process.cwd();
    const absoluteStoragePath = path.resolve(dataRoot, "storage");

    this.app.use(
      "/storage",
      express.static(absoluteStoragePath, {
        maxAge: "1d",
        etag: true,
        lastModified: true
      })
    );
  }

  async onAfterInitialize(): Promise<void> {
    await initializeSchema();
  }

  async onBeforeStart() {}

  async onAfterStart(): Promise<void> {
    this.registerShutdownHooks();
  }

  private registerShutdownHooks() {
    const shutdown = async () => {
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }
}
