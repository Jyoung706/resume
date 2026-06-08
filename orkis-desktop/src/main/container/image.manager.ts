import path from "path";
import fs from "fs";
import { PodmanExecutor } from "./podman.executor";
import { ContainerDef } from "../config/container.config";

export class ImageManager {
  constructor(private podman: PodmanExecutor) {}

  /**
   * dev: Dockerfile에서 직접 빌드, prod: tar에서 로드
   */
  async ensureImage(def: ContainerDef): Promise<void> {
    if (!this.podman.isProd) {
      const contextPath = path.join(this.podman.appsDir, def.appDir);
      const dockerfilePath = path.join(contextPath, def.dockerfile);
      console.log(`[Container] Building ${def.image} from ${contextPath}...`);
      // --format docker: HEALTHCHECK 보존 (OCI 포맷은 HEALTHCHECK 미지원)
      await this.podman.exec(["build", "--format", "docker", "-f", dockerfilePath, "-t", def.image, contextPath], 300000);
      return;
    }

    try {
      await this.podman.exec(["image", "inspect", def.image]);
      console.log(`[Container] Image ${def.image} already loaded`);
      return;
    } catch {
      // image not found, load it
    }

    const tarPath = path.join(this.podman.resourcePath, "images", def.tar);
    if (!fs.existsSync(tarPath)) {
      throw new Error(`Image tar not found: ${tarPath}`);
    }

    console.log(`[Container] Loading image from ${tarPath}...`);
    await this.podman.exec(["load", "-i", tarPath], 300000);
  }
}
