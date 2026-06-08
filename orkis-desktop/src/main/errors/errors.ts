import { ErrorSeverity, AppError } from "./AppError";

export class BootstrapError extends AppError {
  readonly code = "BOOTSTRAP_FAILED";
  readonly userMessage = "앱 초기화 중 오류가 발생했습니다.";
  readonly recoverable = false;
  readonly severity: ErrorSeverity = "fatal";

  constructor(cause: unknown) {
    super("Bootstrap failed", { cause });
  }
}

export class RendererError extends AppError {
  readonly code = "RENDERER_ERROR";
  readonly userMessage = "화면 처리 중 오류가 발생했습니다.";
  readonly recoverable = true;
  readonly severity: ErrorSeverity = "error";

  constructor(message: string, readonly source?: string) {
    super(message);
  }
}

export class ChildProcessGoneError extends AppError {
  readonly code = "CHILD_PROCESS_GONE";
  readonly userMessage = "보조 프로세스가 종료되었습니다.";
  readonly recoverable = false;
  readonly severity: ErrorSeverity = "error";

  constructor(readonly type: string, readonly reason: string) {
    super(`Child process gone: ${type} (${reason})`);
  }
}
