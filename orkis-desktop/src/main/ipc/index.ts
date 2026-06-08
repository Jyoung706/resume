import { registerAuthIpc } from "./auth.ipc";

export function registerIpcHandlers(): void {
  registerAuthIpc();
}
