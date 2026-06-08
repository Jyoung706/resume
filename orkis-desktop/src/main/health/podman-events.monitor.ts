import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";

/**
 * Podman events stream 을 수신해 컨테이너 lifecycle + health 변화를 push 알림한다.
 *
 * - `service:ready`     = health_status -> healthy 전환 (또는 healthcheck 없는 컨테이너의 start)
 * - `service:unhealthy` = health_status -> unhealthy
 * - `service:down`      = die / stop / kill
 * - `service:start`     = start (healthcheck 등록 전의 booting 시그널)
 *
 * 자식 프로세스가 비정상 종료되면 자동 재연결 (2s backoff). stop() 호출 시 영구 종료.
 */
export interface PodmanEvent {
  Type?: string;
  Status?: string;
  health_status?: string;
  Name?: string;
  Time?: number;
  [key: string]: unknown;
}

export class PodmanEventsMonitor extends EventEmitter {
  private proc: ChildProcess | null = null;
  private containers: string[] = [];
  private stopped = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  // health_status 이벤트가 매 interval 마다 push 되므로 상태 변화 시점에만 emit 하기 위함
  private lastHealth = new Map<string, string>();

  start(containers: string[]): void {
    this.containers = containers;
    this.stopped = false;
    this.spawnChild();
  }

  private spawnChild(): void {
    if (this.stopped) return;

    const filters = this.containers.flatMap((c) => ["--filter", `container=${c}`]);
    const proc = spawn("podman", ["events", "--format", "json", ...filters], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let buf = "";
    proc.stdout?.on("data", (chunk: Buffer) => {
      buf += chunk.toString("utf-8");
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const evt = JSON.parse(line) as PodmanEvent;
          this.dispatch(evt);
        } catch {
          // malformed line skip
        }
      }
    });

    proc.stderr?.on("data", (chunk: Buffer) => {
      console.warn(`[PodmanEvents] stderr: ${chunk.toString("utf-8").trim()}`);
    });

    proc.on("exit", (code) => {
      this.proc = null;
      if (this.stopped) return;
      console.warn(`[PodmanEvents] child exited (code=${code}), reconnect in 2s`);
      this.reconnectTimer = setTimeout(() => this.spawnChild(), 2000);
    });

    this.proc = proc;
  }

  private dispatch(evt: PodmanEvent): void {
    if (evt.Type !== "container" || !evt.Name) return;
    const name = evt.Name;
    const status = evt.Status;

    if (status === "health_status") {
      const health = evt.health_status;
      if (!health || this.lastHealth.get(name) === health) return;
      this.lastHealth.set(name, health);
      if (health === "healthy") this.emit("service:ready", name);
      else if (health === "unhealthy") this.emit("service:unhealthy", name);
    } else if (status === "start") {
      this.emit("service:start", name);
    } else if (status === "died") {
      this.lastHealth.delete(name);
      this.emit("service:down", name);
    }
  }

  stop(): void {
    this.stopped = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.proc?.kill();
    this.proc = null;
    this.lastHealth.clear();
  }
}
