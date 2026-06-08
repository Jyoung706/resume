import { ipcRenderer } from "electron";

/**
 * Renderer에서 발생한 JS 에러와 unhandled rejection을 Main으로 포워딩.
 * Main의 OrkisApplication이 ipcMain.on("app:renderer-error")로 수신.
 */
export function installRendererErrorForwarder(): void {
  window.addEventListener("error", (event) => {
    ipcRenderer.send("app:renderer-error", {
      message: event.message,
      source: `${event.filename}:${event.lineno}:${event.colno}`,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message =
      reason instanceof Error ? reason.message : String(reason ?? "unknown");
    ipcRenderer.send("app:renderer-error", {
      message,
      source: "unhandledrejection",
    });
  });
}
