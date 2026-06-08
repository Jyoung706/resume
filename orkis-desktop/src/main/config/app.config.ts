import { app } from "electron";
import path from "path";
import os from "os";

/**
 * 런타임 데이터 저장 경로
 * - prod: ~/Library/Application Support/Orkis (macOS) | %APPDATA%/Orkis (Windows)
 * - dev:  ~/.orkis
 */
export function getDataPath(): string {
  return app.isPackaged
    ? app.getPath("userData")
    : path.join(os.homedir(), ".orkis");
}
