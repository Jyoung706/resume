import { OAuthService } from "../services/oauth.service";
import { clearBackendCookies } from "../protocol/protocol";
import { OAuthParams } from "../../shared/types/ipc.types";
import { ipcHandle } from "./handle";

export function registerAuthIpc(): void {
  const oauthService = new OAuthService();

  ipcHandle("oauth:start", (params: OAuthParams) =>
    oauthService.startOAuth(params),
  );
  ipcHandle("oauth:cancel", () => {
    oauthService.cancel();
  });
  ipcHandle("session:clear", async () => {
    await clearBackendCookies();
  });
}
