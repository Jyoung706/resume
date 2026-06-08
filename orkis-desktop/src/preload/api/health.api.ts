import { ipcRenderer, IpcRendererEvent } from "electron";

export type ServiceName = "backend" | "ai";
export type ServiceStatus = "starting" | "healthy" | "unhealthy" | "down";

export interface ServiceStatusEvent {
  name: ServiceName;
  status: ServiceStatus;
}

export const healthApi = {
  /**
   * 메인 프로세스의 `service:status` IPC 를 구독한다.
   * 반환값은 unsubscribe 함수.
   */
  subscribe: (
    callback: (event: ServiceStatusEvent) => void,
  ): (() => void) => {
    const handler = (_: IpcRendererEvent, event: ServiceStatusEvent) => {
      callback(event);
    };
    ipcRenderer.on("service:status", handler);
    return () => {
      ipcRenderer.off("service:status", handler);
    };
  },
};
