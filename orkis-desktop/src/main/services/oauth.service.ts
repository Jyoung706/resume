import { BrowserWindow } from "electron";
import { OAuthParams, OAuthResult } from "../../shared/types/ipc.types";

export class OAuthService {
  private authWindow: BrowserWindow | null = null;
  private timeoutId: NodeJS.Timeout | null = null;
  private readonly TIMEOUT_MS = 120000;

  async startOAuth(params: OAuthParams): Promise<OAuthResult> {
    this.cleanup();

    return new Promise((resolve, reject) => {
      this.authWindow = new BrowserWindow({
        width: 500,
        height: 700,
        show: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      this.authWindow.loadURL(params.authUrl);

      this.timeoutId = setTimeout(() => {
        this.cleanup();
        reject(new Error("OAuth timeout"));
      }, this.TIMEOUT_MS);

      const handleRedirect = (url: string): boolean => {
        if (!url.startsWith(params.redirectUrl)) {
          return false;
        }

        const urlObj = new URL(url);
        const code = urlObj.searchParams.get("code");
        const state = urlObj.searchParams.get("state");
        const error = urlObj.searchParams.get("error");

        this.cleanup();

        if (code) {
          resolve({ code, state: state || undefined });
        } else {
          reject(new Error(error || "OAuth failed"));
        }

        return true;
      };

      this.authWindow.webContents.on("will-redirect", (event, url) => {
        if (handleRedirect(url)) {
          event.preventDefault();
        }
      });

      this.authWindow.webContents.on("will-navigate", (event, url) => {
        if (url === params.authUrl) return;

        if (handleRedirect(url)) {
          event.preventDefault();
        }
      });

      this.authWindow.on("closed", () => {
        this.authWindow = null;
        resolve({ cancelled: true });
      });
    });
  }

  cancel(): void {
    this.cleanup();
  }

  private cleanup(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.authWindow && !this.authWindow.isDestroyed()) {
      this.authWindow.close();
    }

    this.authWindow = null;
  }
}
