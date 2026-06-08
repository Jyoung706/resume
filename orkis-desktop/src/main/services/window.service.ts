import { is } from "@electron-toolkit/utils";
import { BrowserWindow, shell } from "electron";
import { getPreloadPath, getRendererUrl } from "../utils/paths";
import { orkis } from "../app/instance";
import { getPlatformConfig } from "../config/platform.config";

// Vite define으로 빌드 타임에 "true"/"false" 리터럴로 치환됨
const isDebugBuild = process.env.ORKIS_DEBUG_BUILD === "true";

export class WindowService {
  private mainWindow: BrowserWindow | null = null;

  createMainWindow(): BrowserWindow {
    const platformConfig = getPlatformConfig();

    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 800,
      minHeight: 600,
      show: false,
      webPreferences: {
        preload: getPreloadPath(),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
      ...platformConfig,
    });

    this.setupWindowEvents();
    this.loadContent();

    return this.mainWindow;
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  private setupWindowEvents(): void {
    if (!this.mainWindow) return;

    this.mainWindow.on("ready-to-show", () => {
      this.mainWindow?.show();
    });

    // 메인 윈도우는 자기 페이지(같은 origin)만 표시. 외부 도메인 navigate 는
    // 차단 후 외부 브라우저로 위임 (popup setWindowOpenHandler 와 보완 관계).
    this.mainWindow.webContents.on("will-navigate", (event, url) => {
      try {
        const currentOrigin = new URL(this.mainWindow!.webContents.getURL()).origin;
        const targetOrigin = new URL(url).origin;
        if (currentOrigin !== targetOrigin) {
          event.preventDefault();
          shell.openExternal(url);
        }
      } catch {
        event.preventDefault();
      }
    });

    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: "deny" };
    });

    this.mainWindow.on("close", (event) => {
      if (!orkis.isQuitting) {
        event.preventDefault();
        this.mainWindow?.hide();
        return;
      }
      this.mainWindow = null;
    });

    // dev 또는 debug 빌드일 때만 DevTools 토글 단축키 활성
    if (is.dev || isDebugBuild) {
      this.mainWindow.webContents.on("before-input-event", (_, input) => {
        if (input.type !== "keyDown") return;
        const key = input.key.toLowerCase();
        const isMac = process.platform === "darwin";
        const toggleDevTools =
          key === "f12" ||
          (isMac && input.meta && input.alt && key === "i") ||
          (!isMac && input.control && input.shift && key === "i");
        if (toggleDevTools) {
          this.mainWindow?.webContents.toggleDevTools();
        }
      });
    }
  }

  private loadContent(): void {
    if (!this.mainWindow) return;

    if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
      this.mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadURL(getRendererUrl());
      if (isDebugBuild) {
        this.mainWindow.webContents.openDevTools({ mode: "detach" });
      }
    }
  }
}
