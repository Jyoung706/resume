/**
 * 에러 리포터 — 모니터링 서비스(Sentry 등) 연동 추상화 계층
 *
 * 현재는 logger 출력만 수행하며,
 * 추후 Sentry 등을 도입할 때 이 파일만 수정하면 된다.
 */
import { getLogger } from "@/logic/shared/utils/logger";

const logger = getLogger("ErrorReporter");

export interface ErrorContext {
  /** 에러 발생 출처 (예: "app_root", "route", "section", "unhandledrejection") */
  source?: string;
  /** React 컴포넌트 스택 (Error Boundary가 제공) */
  componentStack?: string;
  /** 추가 컨텍스트 (라우트, 사용자 ID 등) */
  extra?: Record<string, unknown>;
}

/**
 * 에러를 외부 모니터링 서비스에 보고한다.
 *
 * @example
 * reportError(new Error("..."), {
 *   source: "route",
 *   extra: { path: "/chat" },
 * });
 */
export function reportError(error: unknown, context?: ErrorContext): void {
  const err =
    error instanceof Error ? error : new Error(String(error ?? "unknown"));

  logger.error(`[${context?.source ?? "unknown"}] ${err.message}`, {
    name: err.name,
    stack: err.stack,
    componentStack: context?.componentStack,
    extra: context?.extra
  });
}
