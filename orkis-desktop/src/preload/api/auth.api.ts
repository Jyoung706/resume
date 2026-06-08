import { ipcRenderer } from "electron";
import { OAuthParams, OAuthResult } from "../../shared/types/ipc.types";

export const authApi = {
  startOAuth: (params: OAuthParams): Promise<OAuthResult> => {
    return ipcRenderer.invoke("oauth:start", params);
  },
  cancelOAuth: (): Promise<void> => {
    return ipcRenderer.invoke("oauth:cancel");
  },
  clearSession: (): Promise<void> => {
    return ipcRenderer.invoke("session:clear");
  },
};
