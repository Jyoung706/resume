import { app, ipcMain } from "electron";
import { EventEmitter } from "events";
import {
  errorReporter,
  BootstrapError,
  RendererError,
  ChildProcessGoneError,
} from "../errors";

export interface AppContext {
  [key: string]: unknown;
}

type BootstrapFn = (app: OrkisApplication) => Promise<void> | void;
type ShutdownHook = () => Promise<void> | void;
type EventListener = (...args: unknown[]) => unknown;

export class OrkisApplication {
  readonly ctx: AppContext = {};
  private shutdownHandler: ShutdownHook | null = null;
  private _isShuttingDown = false;
  private _isQuitting = false;

  get isShuttingDown(): boolean {
    return this._isShuttingDown;
  }

  get isQuitting(): boolean {
    return this._isQuitting;
  }

  markQuitting(): void {
    this._isQuitting = true;
  }

  setShutdown(fn: ShutdownHook): this {
    this.shutdownHandler = fn;
    return this;
  }

  async run(bootstrap: BootstrapFn): Promise<void> {
    this.installProcessHooks();
    try {
      await app.whenReady();
      this.installElectronHooks();
      await bootstrap(this);
    } catch (err) {
      errorReporter.report(new BootstrapError(err), { op: "bootstrap" });
      await this.shutdown(1);
    }
  }

  ipcHandle<A extends unknown[], R>(
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

  safeOn<T extends EventEmitter>(
    ee: T,
    event: string,
    fn: EventListener,
    scope: string,
  ): T {
    ee.on(event, (...args: unknown[]) => {
      try {
        const result = fn(...args);
        if (result instanceof Promise) {
          result.catch((e) =>
            errorReporter.report(e, { op: `event:${scope}:${event}` }),
          );
        }
      } catch (e) {
        errorReporter.report(e, { op: `event:${scope}:${event}` });
      }
    });
    return ee;
  }

  async shutdown(code: number = 0): Promise<void> {
    if (this._isShuttingDown) return;
    this._isShuttingDown = true;
    if (this.shutdownHandler) {
      try {
        await this.shutdownHandler();
      } catch (err) {
        errorReporter.report(err, { op: "shutdown" });
      }
    }
    app.exit(code);
  }

  private installProcessHooks(): void {
    process.on("uncaughtException", (err) => {
      errorReporter.report(err, { op: "process.uncaughtException" });
      void this.shutdown(1);
    });
    process.on("unhandledRejection", (reason) => {
      errorReporter.report(reason, { op: "process.unhandledRejection" });
    });
  }

  private installElectronHooks(): void {
    app.on("render-process-gone", (_event, contents, details) => {
      errorReporter.report(
        new RendererError(`Renderer gone: ${details.reason}`, contents.getURL()),
        { op: "renderer.gone" },
      );
    });

    app.on("child-process-gone", (_event, details) => {
      errorReporter.report(
        new ChildProcessGoneError(details.type, details.reason),
        { op: "child.gone" },
      );
    });

    app.on("web-contents-created", (_event, contents) => {
      contents.on("unresponsive", () => {
        errorReporter.report(
          new RendererError("Renderer unresponsive", contents.getURL()),
          { op: "renderer.hang" },
        );
      });
    });

    ipcMain.on("app:renderer-error", (event, payload: unknown) => {
      const p = (payload ?? {}) as { message?: string; source?: string };
      errorReporter.report(
        new RendererError(
          p.message ?? "Unknown renderer error",
          p.source ?? event.sender.getURL(),
        ),
        { op: "renderer.error" },
      );
    });
  }
}
