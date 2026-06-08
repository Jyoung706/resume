export type ErrorSeverity = "info" | "warn" | "error" | "fatal";

export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly userMessage: string;
  abstract readonly recoverable: boolean;
  abstract readonly severity: ErrorSeverity;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = this.constructor.name;
  }
}

export interface NormalizedError {
  code: string;
  userMessage: string;
  severity: ErrorSeverity;
  recoverable: boolean;
  message: string;
  stack?: string;
}

export function normalizeError(err: unknown): NormalizedError {
  if (err instanceof AppError) {
    return {
      code: err.code,
      userMessage: err.userMessage,
      severity: err.severity,
      recoverable: err.recoverable,
      message: err.message,
      stack: err.stack,
    };
  }
  if (err instanceof Error) {
    return {
      code: "UNKNOWN",
      userMessage: "예기치 않은 오류가 발생했습니다.",
      severity: "error",
      recoverable: false,
      message: err.message,
      stack: err.stack,
    };
  }
  return {
    code: "UNKNOWN",
    userMessage: "예기치 않은 오류가 발생했습니다.",
    severity: "error",
    recoverable: false,
    message: String(err),
  };
}
