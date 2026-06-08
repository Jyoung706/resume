import { Request, Response, NextFunction } from "express";
import logger from "../../utils";
import { LogMiddlewareOptions } from "../types/logMiddleware.types";

const defaultOptions: LogMiddlewareOptions = {
  enabled: false,
  excludePaths: []
};

export function createLogMiddleware(options?: boolean | LogMiddlewareOptions) {
  const config: LogMiddlewareOptions =
    typeof options === "boolean"
      ? { ...defaultOptions, enabled: options }
      : { ...defaultOptions, ...options };

  const isEnabled =
    process.env.ENABLE_REQUEST_LOGGING === "true" || config.enabled === true;

  return function logMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    if (!isEnabled) {
      return next();
    }

    if (config.excludePaths?.some((path) => req.path.startsWith(path))) {
      return next();
    }

    const startTime = Date.now();

    const getClientIp = (): string => {
      const forwarded = req.headers["x-forwarded-for"];
      const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded;

      if (forwardedIp) {
        return forwardedIp.split(",")[0].trim();
      }

      return (
        (req.headers["x-real-ip"] as string) ||
        (req.headers["x-client-ip"] as string) ||
        req.ip ||
        req.socket?.remoteAddress ||
        "unknown"
      );
    };

    const accessLog = (): void => {
      const duration = Date.now() - startTime;
      const clientIp = getClientIp();
      const userAgent = req.headers["user-agent"] || "unknown";
      const contentType = req.headers["content-type"] || "-";

      const isError = res.statusCode >= 400;
      const isSlowRequest =
        !!config.slowRequestThreshold && duration > config.slowRequestThreshold;

      const baseLog = `${req.method} ${req.path} - ${res.statusCode} (${duration}ms) | IP: ${clientIp} | Agent: ${userAgent} | Type: ${contentType}`;

      if (isError) {
        logger.error(baseLog);
      } else if (isSlowRequest) {
        logger.warn(baseLog);
      } else {
        logger.info(baseLog);
      }
    };

    res.once("finish", accessLog);

    res.once("close", () => {
      if (!res.writableEnded) {
        accessLog();
      }
    });

    next();
  };
}
