import { execFile } from "child_process";
import { app } from "electron";
import path from "path";
import fs from "fs";
import { getDataPath } from "../config/app.config";

export class PodmanExecutor {
  get isProd(): boolean {
    return app.isPackaged;
  }

  get isDebug(): boolean {
    return process.env.MAIN_DEBUG_CONTAINERS === "true";
  }

  get isWindows(): boolean {
    return process.platform === "win32";
  }

  get resourcePath(): string {
    return this.isProd
      ? process.resourcesPath
      : path.join(__dirname, "../../resources");
  }

  get dataPath(): string {
    return getDataPath();
  }

  get appsDir(): string {
    return path.join(__dirname, "../../..");
  }

  private get podmanDir(): string {
    if (!this.isWindows) return path.join(this.resourcePath, "podman", "mac");
    const winDir = process.arch === "arm64" ? "win-arm64" : "win";
    return path.join(this.resourcePath, "podman", winDir);
  }

  private get podmanPath(): string {
    return this.isWindows
      ? path.join(this.podmanDir, "podman.exe")
      : path.join(this.podmanDir, "bin", "podman");
  }

  private get podmanLibPath(): string {
    return path.join(this.podmanDir, "lib");
  }

  private ensureContainersConf(): string {
    const confDir = path.join(this.dataPath, "podman");
    const confPath = path.join(confDir, "containers.conf");
    const helperDir = this.isWindows ? this.podmanDir : path.join(this.podmanDir, "bin");

    if (!fs.existsSync(confDir)) fs.mkdirSync(confDir, { recursive: true });

    const content = `[engine]\nhelper_binaries_dir = ["${helperDir.replace(/\\/g, "/")}"]\n`;
    fs.writeFileSync(confPath, content);
    return confPath;
  }

  exec(args: string[], timeout = 120000): Promise<string> {
    const containersConf = this.ensureContainersConf();
    const env: Record<string, string | undefined> = { ...process.env };
    env.CONTAINERS_CONF = containersConf;

    if (this.isWindows) {
      env.PATH = `${this.podmanDir};${process.env.PATH || ""}`;
    } else {
      const podmanBinDir = path.join(this.podmanDir, "bin");
      env.DYLD_LIBRARY_PATH = this.podmanLibPath;
      env.PATH = `${podmanBinDir}:${process.env.PATH || ""}`;
    }

    return new Promise((resolve, reject) => {
      console.log(`[Container] podman ${args.join(" ")}`);
      execFile(this.podmanPath, args, { timeout, env }, (err, stdout, stderr) => {
        if (err) {
          reject(new Error(stderr || err.message));
          return;
        }
        resolve(stdout.trim());
      });
    });
  }
}
