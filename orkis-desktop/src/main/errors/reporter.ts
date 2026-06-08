import { BrowserWindow, dialog } from "electron";
import { normalizeError } from "./AppError";

interface ReportContext {
  op: string;
  scope?: string;
}

class ErrorReporter {
  private getMainWindow: () => BrowserWindow | null = () => null;

  setMainWindow(getter: () => BrowserWindow | null): void {
    this.getMainWindow = getter;
  }

  report(err: unknown, context: ReportContext): void {
    const normalized = normalizeError(err);

    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: normalized.severity,
        code: normalized.code,
        op: context.op,
        scope: context.scope,
        message: normalized.message,
        stack: normalized.stack,
      }),
    );

    const win = this.getMainWindow();
    if (win && !win.isDestroyed() && normalized.severity !== "info") {
      win.webContents.send("app:error", {
        code: normalized.code,
        userMessage: normalized.userMessage,
        severity: normalized.severity,
        recoverable: normalized.recoverable,
      });
    }

    if (normalized.severity === "fatal") {
      dialog.showErrorBox("Orkis 오류", normalized.userMessage);
    }
  }
}

export const errorReporter = new ErrorReporter();
