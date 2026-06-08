import { execFile } from "child_process";
import { dialog } from "electron";
import os from "os";
import { PodmanExecutor } from "./podman.executor";

export class MachineManager {
  constructor(private podman: PodmanExecutor) {}

  async checkPodman(): Promise<boolean> {
    try {
      const version = await this.podman.exec(["--version"]);
      console.log(`[Container] ${version}`);
      return true;
    } catch (e) {
      console.error("[Container] Podman not found:", e);
      return false;
    }
  }

  private checkWsl(): Promise<boolean> {
    return new Promise((resolve) => {
      execFile("wsl", ["--status"], { timeout: 10000 }, (err) => {
        resolve(!err);
      });
    });
  }

  private async pingMachine(): Promise<boolean> {
    try {
      await this.podman.exec(["info", "--format", "{{.Host.Arch}}"], 15000);
      return true;
    } catch {
      return false;
    }
  }

  private async initMachine(): Promise<void> {
    console.log("[Container] Initializing Podman machine...");
    const totalMemMB = Math.floor(os.totalmem() / 1024 / 1024);
    const machineMemory = Math.min(4096, Math.floor(totalMemMB * 0.75));
    console.log(`[Container] System memory: ${totalMemMB}MB, allocating ${machineMemory}MB`);
    const initArgs = ["machine", "init", "--cpus", "2", "--memory", String(machineMemory), "--rootful"];

    try {
      await this.podman.exec(initArgs, 300000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("already exists")) throw e;

      // VM 없이 connection만 잔존 — 고아 항목 제거 후 재시도
      console.log("[Container] Stale connection detected, cleaning up...");
      try { await this.podman.exec(["system", "connection", "rm", "podman-machine-default"], 10000); } catch { /* ignore */ }
      try { await this.podman.exec(["system", "connection", "rm", "podman-machine-default-root"], 10000); } catch { /* ignore */ }
      await this.podman.exec(initArgs, 300000);
    }
  }

  async ensureMachine(): Promise<void> {
    if (process.platform === "linux") return;

    // Windows: WSL2 필수 확인
    if (this.podman.isWindows) {
      const wslAvailable = await this.checkWsl();
      if (!wslAvailable) {
        dialog.showErrorBox(
          "WSL2 Required",
          "Orkis requires WSL2 to run containers.\n\n" +
          "Please run the following command in PowerShell (as Administrator) and restart your computer:\n\n" +
          "wsl --install --no-distribution"
        );
        throw new Error("WSL2 is not available");
      }
    }

    // 1. 머신 존재 여부 확인, 없으면 생성
    try {
      await this.podman.exec(["machine", "inspect"]);
    } catch {
      await this.initMachine();
    }

    // 2. 머신 상태 확인 + ping 검증
    try {
      const state = await this.podman.exec(["machine", "inspect", "--format", "{{.State}}"]);
      if (state.toLowerCase() === "running") {
        if (await this.pingMachine()) {
          console.log("[Container] Podman machine is ready");
          return;
        }
        console.log("[Container] Podman machine is stale, restarting...");
        try { await this.podman.exec(["machine", "stop"], 30000); } catch { /* ignore */ }
      }
    } catch {
      // inspect 실패 시 start 시도
    }

    // 3. 머신 시작
    console.log("[Container] Starting Podman machine...");
    await this.podman.exec(["machine", "start"], 300000);

    if (await this.pingMachine()) {
      console.log("[Container] Podman machine started");
      return;
    }

    // 4. ping 실패 → 머신 재생성 1회
    console.log("[Container] Machine ping failed, recreating...");
    try { await this.podman.exec(["machine", "stop"], 30000); } catch { /* ignore */ }
    try { await this.podman.exec(["machine", "rm", "-f"], 30000); } catch { /* ignore */ }

    await this.initMachine();
    await this.podman.exec(["machine", "start"], 300000);

    if (!await this.pingMachine()) {
      throw new Error("Podman machine failed to start after recreate");
    }

    console.log("[Container] Podman machine started (after recreate)");
  }
}
