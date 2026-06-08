import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";
import { authApi, healthApi } from "./api";
import { installRendererErrorForwarder } from "./errorForwarder";

installRendererErrorForwarder();

contextBridge.exposeInMainWorld("electron", electronAPI);

// app:ready를 preload 레벨에서 캐싱 (React 마운트 전에 도착해도 유실 방지)
let appReady = false;
ipcRenderer.on("app:ready", () => {
  appReady = true;
});

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  auth: authApi,
  health: healthApi,
  onAppReady: (callback: () => void) => {
    if (appReady) {
      callback();
      return;
    }
    ipcRenderer.on("app:ready", () => callback());
  },
});
