import path from "path";
import fs from "fs";
import os from "os";
import net from "net";
import { CONTAINERS, DATA_SUBDIRS } from "../config/container.config";
import { PodmanExecutor } from "./podman.executor";
import { MachineManager } from "./machine.manager";
import { ImageManager } from "./image.manager";

interface ContainerNetConfig {
  mode: "mac" | "windows-nat" | "windows-mirrored";
  networkArgs: string[];
  hostAddress: string;
  portArgs: (port: number) => string[];
}

export class ContainerManager {
  private podman = new PodmanExecutor();
  private machine = new MachineManager(this.podman);
  private image = new ImageManager(this.podman);
  private netConfig: ContainerNetConfig | null = null;

  private getNetConfig(): ContainerNetConfig {
    if (this.netConfig) return this.netConfig;

    if (!this.podman.isWindows) {
      this.netConfig = {
        mode: "mac",
        networkArgs: [],
        hostAddress: "host.docker.internal",
        portArgs: (port) => ["-p", `${port}:${port}`],
      };
    } else if (this.isWslMirrored()) {
      this.netConfig = {
        mode: "windows-mirrored",
        networkArgs: ["--network", "host"],
        hostAddress: "localhost",
        portArgs: () => [],
      };
    } else {
      this.netConfig = {
        mode: "windows-nat",
        networkArgs: [],
        hostAddress: this.getWslAddress(),
        portArgs: (port) => ["-p", `${port}:${port}`],
      };
    }

    console.log(`[Container] Network mode: ${this.netConfig.mode}`);
    console.log(`[Container] Host address: ${this.netConfig.hostAddress}`);
    console.log(`[Container] Network args: ${this.netConfig.networkArgs.join(" ") || "(bridge)"}`);
    return this.netConfig;
  }

  private isWslMirrored(): boolean {
    try {
      const content = fs.readFileSync(path.join(os.homedir(), ".wslconfig"), "utf-8");
      return /networkingMode\s*=\s*mirrored/i.test(content);
    } catch {
      return false;
    }
  }

  private getWslAddress(): string {
    const interfaces = os.networkInterfaces();
    for (const [name, addrs] of Object.entries(interfaces)) {
      if (name.toLowerCase().includes("wsl") && addrs) {
        const ipv4 = addrs.find((a) => a.family === "IPv4" && !a.internal);
        if (ipv4) return ipv4.address;
      }
    }
    for (const [, addrs] of Object.entries(interfaces)) {
      if (!addrs) continue;
      const ipv4 = addrs.find((a) => a.family === "IPv4" && !a.internal);
      if (ipv4) return ipv4.address;
    }
    throw new Error("Cannot determine WSL host address. No suitable network interface found.");
  }

  private findAvailablePort(startPort: number, maxRetries = 10): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      server.listen(startPort, () => {
        server.close(() => resolve(startPort));
      });
      server.on("error", () => {
        if (maxRetries <= 1) {
          reject(new Error(`No available port found from ${startPort}`));
        } else {
          this.findAvailablePort(startPort + 1, maxRetries - 1).then(resolve, reject);
        }
      });
    });
  }

  private async cleanupContainer(name: string): Promise<void> {
    try {
      await this.podman.exec(["stop", "-t", "5", name]);
    } catch {
      // not running
    }
    try {
      await this.podman.exec(["rm", "-f", name]);
    } catch {
      // not exists
    }
  }

  private async cleanupStaleContainers(): Promise<void> {
    for (const def of Object.values(CONTAINERS)) {
      await this.cleanupContainer(def.name);
    }
  }

  /**
   * 구버전 orkis 이미지 제거 (새 이미지 로드 성공 후 호출)
   */
  private async cleanupOldImages(): Promise<void> {
    if (!this.podman.isProd) return;

    try {
      const output = await this.podman.exec(["images", "--format", "{{.Repository}}:{{.Tag}} {{.ID}}", "--filter", "dangling=false"]);
      const knownImages = new Set(Object.values(CONTAINERS).map((c) => c.image));
      for (const line of output.split("\n")) {
        const [repoTag, id] = line.trim().split(" ");
        if (!repoTag || !id) continue;
        const repo = repoTag.split(":")[0];
        const isOrkisImage = Object.values(CONTAINERS).some((c) => c.image.split(":")[0] === repo);
        if (isOrkisImage && !knownImages.has(repoTag)) {
          console.log(`[Container] Removing old image: ${repoTag}`);
          try { await this.podman.exec(["rmi", id]); } catch { /* in use or already removed */ }
        }
      }
    } catch {
      // image list 실패 시 무시
    }
  }

  private ensureDataDirs(): string {
    const dataDir = path.join(this.podman.dataPath, "data");
    for (const sub of DATA_SUBDIRS) {
      const dir = path.join(dataDir, sub);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }
    return dataDir;
  }

  async startBackend(backendPort: number, aiServerUrl?: string): Promise<number> {
    const def = CONTAINERS.backend;
    const dataDir = this.ensureDataDirs();
    const config = this.getNetConfig();
    const args = ["run", "-d", "--restart=on-failure:5", "--name", def.name, ...config.networkArgs, ...config.portArgs(backendPort)];

    if (this.podman.isDebug) {
      const backendDir = path.join(this.podman.appsDir, def.appDir);
      args.push("-v", `${path.join(backendDir, "src")}:/app/src:ro`);
      args.push("-v", `${path.join(backendDir, "lib")}:/app/lib:ro`);
      args.push(...config.portArgs(def.debugPort!));
    }

    args.push(
      "-v", `${dataDir}:/app/data`,
      // cloud 는 /app/share 에 NAS 가 마운트되어 cwd 기준 share/ 경로 코드가 동작한다.
      // desktop 도 같은 자리에 host share 를 마운트해 환경 모델을 일치시킴.
      // (backend 의 process.cwd()/share/sqlite 쓰기 = AI 의 DB_NETWORK_PATH(/app/data/share/sqlite) 읽기)
      "-v", `${path.join(dataDir, "share")}:/app/share`,
      "-e", `PORT=${backendPort}`,
      "-e", "SESSION_SECRET=orkis-desktop-session",
      "-e", "DATA_PATH=/app/data",
      // 이미지 저장/조회/정적서빙 경로를 영속 볼륨(/app/data = ~/.orkis) 하위로 일치시킴
      // (미설정 시 dev.env 의 ./storage → cwd /app → /app/storage = 볼륨 밖 휘발)
      "-e", "STORAGE_PATH=/app/data/storage",
      "-e", "RUNTIME_MODE=desktop",
    );

    if (aiServerUrl) {
      args.push("-e", `RAG_SERVER_URL=${aiServerUrl}`);
    }

    if (this.podman.isDebug) {
      args.push("--entrypoint", "node", def.image, `--inspect=0.0.0.0:${def.debugPort}`, "./lib/src/main.js", "-e", "dev");
    } else {
      args.push(def.image);
    }

    const containerId = await this.podman.exec(args);
    console.log(`[Container] Backend started: ${containerId.slice(0, 12)}, port ${backendPort}`);
    return backendPort;
  }

  async startAI(aiPort: number): Promise<number> {
    const def = CONTAINERS.ai;
    const dataDir = this.ensureDataDirs();
    const config = this.getNetConfig();
    const args = ["run", "-d", "--restart=on-failure:5", "--name", def.name, ...config.networkArgs, ...config.portArgs(aiPort)];

    args.push(
      "-v", `${dataDir}:/app/data`,
      "-e", `PORT=${aiPort}`,
      "-e", "DATA_PATH=/app/data",
      "-e", "DB_NETWORK_PATH=/app/data/share/sqlite",
      "-e", "CHAT_CONTEXT_DIR=/app/data/chat/context",
      "-e", "CHAT_SUMMARY_DIR=/app/data/share/summary",
    );

    if (this.podman.isDebug) {
      const aiDir = path.join(this.podman.appsDir, def.appDir);
      args.push("-v", `${path.join(aiDir, "app")}:/app/app:ro`);
      args.push("-v", `${path.join(aiDir, "tts_workflow")}:/app/tts_workflow:ro`);
      args.push("-v", `${path.join(aiDir, "core")}:/app/core:ro`);
      args.push(...config.portArgs(def.debugPort!));
      args.push("-e", "DEBUG_MODE=true");
      args.push(def.image, "python", "-Xfrozen_modules=off", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", String(aiPort), "--log-level", "info");
    } else {
      args.push(def.image);
    }

    const containerId = await this.podman.exec(args);
    console.log(`[Container] AI started: ${containerId.slice(0, 12)}, port ${aiPort}`);
    return aiPort;
  }

  async startAll(): Promise<{ backendPort: number }> {
    const available = await this.machine.checkPodman();
    if (!available) {
      throw new Error("Podman is not installed");
    }

    await this.machine.ensureMachine();
    await this.cleanupStaleContainers();

    await Promise.all([
      this.image.ensureImage(CONTAINERS.backend),
      this.image.ensureImage(CONTAINERS.ai),
    ]);
    await this.cleanupOldImages();

    const config = this.getNetConfig();
    const backendPort = await this.findAvailablePort(CONTAINERS.backend.port!);
    const aiPort = await this.findAvailablePort(CONTAINERS.ai.port!);
    console.log(`[Container] Backend port: ${backendPort}, AI port: ${aiPort}`);

    await Promise.all([
      this.startBackend(backendPort, `http://${config.hostAddress}:${aiPort}`),
      this.startAI(aiPort),
    ]);
    return { backendPort };
  }

  /**
   * 전체 종료 — --rm 플래그로 stop 시 컨테이너 자동 삭제
   */
  async stopAll(): Promise<void> {
    for (const def of Object.values(CONTAINERS)) {
      try {
        await this.podman.exec(["stop", "-t", "3", def.name], 10000);
      } catch { /* not running */ }
    }
  }

  async restart(name: string): Promise<void> {
    await this.podman.exec(["restart", name], 30000);
  }
}
