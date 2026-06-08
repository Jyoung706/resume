import { electronApp, optimizer } from "@electron-toolkit/utils";
import { app, BrowserWindow, session } from "electron";
import { WindowService } from "./services/window.service";
import { TrayService } from "./services/tray.service";
import { ContainerManager } from "./container/container.manager";
import { registerProtocol, registerProtocolSchemas, setBackendPort } from "./protocol/protocol";
import { registerIpcHandlers } from "./ipc";
import { PodmanEventsMonitor } from "./health/podman-events.monitor";
import { CONTAINERS } from "./config/container.config";
import { OrkisApplication } from "./app/OrkisApplication";
import { orkis } from "./app/instance";
import { errorReporter } from "./errors";

registerProtocolSchemas();

const windowService = new WindowService();
const trayService = new TrayService();
const containerManager = new ContainerManager();

orkis.setShutdown(async () => {
  const monitor = orkis.ctx.healthMonitor as PodmanEventsMonitor | undefined;
  monitor?.stop();
  await containerManager.stopAll();
});

app.on("activate", () => {
  const win = windowService.getMainWindow();
  if (win) {
    win.show();
  } else {
    const newWindow = windowService.createMainWindow();
    trayService.init(newWindow);
  }
});

app.on("before-quit", () => {
  orkis.markQuitting();
});

app.on("will-quit", (event) => {
  if (orkis.isShuttingDown) return;
  event.preventDefault();
  void orkis.shutdown(0);
});

app.on("window-all-closed", () => {
  // tray minimize
});

void orkis.run(async (orkis) => {
  setupAppBasics();
  await clearAuthCookies();
  registerProtocol();
  setupIpc();
  setupWindow(orkis);
  await setupContainers(orkis);
});

// ─── setup functions ─────────────────────────────────────────────

// 앱 시작 시 backend session cookie 제거 → 매 실행 시 로그인 화면 강제
async function clearAuthCookies(): Promise<void> {
  try {
    const cookies = await session.defaultSession.cookies.get({ name: "connect.sid" });
    for (const cookie of cookies) {
      const protocol = cookie.secure ? "https" : "http";
      const domain = cookie.domain?.replace(/^\./, "") || "localhost";
      const url = `${protocol}://${domain}${cookie.path || "/"}`;
      await session.defaultSession.cookies.remove(url, cookie.name);
    }
    console.log(`[Main] Cleared ${cookies.length} session cookies on startup`);
  } catch (err) {
    console.error("[Main] Failed to clear session cookies:", err);
  }
}

function setupAppBasics(): void {
  electronApp.setAppUserModelId("kr.orkis");
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });
}

function setupIpc(): void {
  registerIpcHandlers();
}

function setupWindow(orkis: OrkisApplication): void {
  const mainWindow = windowService.createMainWindow();
  trayService.init(mainWindow);
  orkis.ctx.mainWindow = mainWindow;
  errorReporter.setMainWindow(() => windowService.getMainWindow());
}

async function setupContainers(orkis: OrkisApplication): Promise<void> {
  const mainWindow = orkis.ctx.mainWindow as BrowserWindow;

  const fixedBackendPort = process.env.MAIN_BACKEND_PORT
    ? Number(process.env.MAIN_BACKEND_PORT)
    : undefined;

  mainWindow.webContents.on("did-finish-load", () => {
    if (orkis.ctx.servicesReady) {
      console.log("[Main] Page reloaded, re-sending app:ready");
      mainWindow.webContents.send("app:ready");
    }
  });

  if (process.env.MAIN_MODE === "detached") {
    console.log("[Main] Detached mode - start backend/ai manually");
    if (fixedBackendPort) setBackendPort(fixedBackendPort);
    orkis.ctx.servicesReady = true;
    mainWindow.webContents.send("app:ready");
    return;
  }

  const monitor = new PodmanEventsMonitor();
  orkis.ctx.healthMonitor = monitor;

  const sendStatus = (name: string, status: "starting" | "healthy" | "unhealthy" | "down") => {
    const win = windowService.getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send("service:status", { name: name.replace(/^orkis-/, ""), status });
    }
  };

  const unhealthyRestartState = new Map<string, { count: number; lastAt: number }>();
  const UNHEALTHY_COOLDOWN_MS = 30_000;
  const UNHEALTHY_MAX_ATTEMPTS = 3;

  monitor.on("service:start", (name: string) => {
    console.log(`[Health] ${name} started`);
    sendStatus(name, "starting");
  });
  monitor.on("service:ready", (name: string) => {
    console.log(`[Health] ${name} healthy`);
    sendStatus(name, "healthy");
    unhealthyRestartState.delete(name);
  });

  monitor.on("service:unhealthy", async (name: string) => {
    console.warn(`[Health] ${name} unhealthy`);
    sendStatus(name, "unhealthy");

    // debug 모드: breakpoint 에서 paused → unhealthy → restart 가 디버거 detach 시키므로 skip
    if (process.env.MAIN_DEBUG_CONTAINERS === "true") {
      console.log(`[Health] ${name} restart skipped (debug mode)`);
      return;
    }

    const now = Date.now();
    const state = unhealthyRestartState.get(name) ?? { count: 0, lastAt: 0 };
    if (now - state.lastAt < UNHEALTHY_COOLDOWN_MS) {
      console.warn(`[Health] ${name} restart skipped (cooldown)`);
      return;
    }
    if (state.count >= UNHEALTHY_MAX_ATTEMPTS) {
      console.error(`[Health] ${name} restart skipped (max attempts ${UNHEALTHY_MAX_ATTEMPTS} reached)`);
      return;
    }

    state.count += 1;
    state.lastAt = now;
    unhealthyRestartState.set(name, state);

    console.log(`[Health] ${name} restart attempt ${state.count}/${UNHEALTHY_MAX_ATTEMPTS}`);
    try {
      await containerManager.restart(name);
    } catch (err) {
      console.error(`[Health] ${name} restart failed:`, err);
    }
  });
  monitor.on("service:down", (name: string) => {
    console.warn(`[Health] ${name} down`);
    sendStatus(name, "down");
  });

  monitor.start([CONTAINERS.backend.name, CONTAINERS.ai.name]);

  const readyPromise = new Promise<void>((resolve, reject) => {
    const pending = new Set([CONTAINERS.backend.name, CONTAINERS.ai.name]);
    const timer = setTimeout(() => {
      reject(
        new Error(
          `Backend/AI healthcheck timeout: ${[...pending].join(", ")}`,
        ),
      );
    }, 120000);

    monitor.on("service:ready", (name: string) => {
      pending.delete(name);
      if (pending.size === 0) {
        clearTimeout(timer);
        orkis.ctx.servicesReady = true;
        console.log("[Main] All services ready");
        mainWindow.webContents.send("app:ready");
        resolve();
      }
    });
  });

  const { backendPort } = await containerManager.startAll();
  setBackendPort(backendPort);
  await readyPromise;
}
