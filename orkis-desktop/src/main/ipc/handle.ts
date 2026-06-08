import { ipcMain } from "electron";
import { errorReporter } from "../errors";

/**
 * ipcMain.handle 래퍼. 예외가 던져지면 errorReporter로 기록한 뒤
 * 호출 규약 유지를 위해 동일한 예외를 다시 throw.
 * renderer 측 ipcRenderer.invoke의 Promise rejection 시맨틱은 그대로.
 */
export function ipcHandle<A extends unknown[], R>(
  channel: string,
  fn: (...args: A) => Promise<R> | R,
): void {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      return await fn(...(args as A));
    } catch (err) {
      errorReporter.report(err, { op: `ipc:${channel}` });
      throw err;
    }
  });
}
