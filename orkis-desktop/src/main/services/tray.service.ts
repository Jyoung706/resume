import { app, Menu, Tray, BrowserWindow, nativeImage } from "electron";
import { join } from "path";
import { orkis } from "../app/instance";

export class TrayService {
  private tray: Tray | null = null;
  private mainWindow: BrowserWindow | null = null;

  init(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow;

    const iconPath = this.getTrayIconPath();
    const icon = nativeImage.createFromPath(iconPath);

    this.tray = new Tray(icon.resize({ width: 16, height: 16 }));
    this.tray.setToolTip("Orkis");

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "열기",
        click: () => this.showWindow(),
      },
      { type: "separator" },
      {
        label: "종료",
        click: () => {
          orkis.markQuitting();
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);

    this.tray.on("click", () => this.showWindow());
  }

  private getTrayIconPath(): string {
    if (app.isPackaged) {
      return join(process.resourcesPath, "app.asar", "build", "orkis-tray.png");
    }
    return join(__dirname, "../../build/orkis-tray.png");
  }

  private showWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }

  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}
