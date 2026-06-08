// src/main/utils/ResponseHelper.ts
import { Response } from "express";
import util from "util";
import { logger } from "../../utils";

export class ResponseHelper {
  /**
   * safely send json to response
   */
  static safeJson(res: Response, result: any, options?: { log?: boolean }) {
    try {
      if (options?.log) {
        logger.info(
          "[SafeJson] Response Result:",
          util.inspect(result, { depth: null, colors: true })
        );
      }

      const cleaned = ResponseHelper.removeCircularAndSensitive(result);
      res.json(cleaned);
    } catch (err) {
      logger.error("[SafeJson] Failed to serialize:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * remove circular references & known problematic keys
   */
  static removeCircularAndSensitive(obj: any): any {
    const seen = new WeakSet();

    function safeClone(value: any): any {
      if (typeof value !== "object" || value === null) {
        return value;
      }

      if (seen.has(value)) {
        return "[Circular]";
      }

      seen.add(value);

      const copy: any = Array.isArray(value) ? [] : {};
      for (const key in value) {
        if (["req", "res", "socket", "parser", "connection"].includes(key)) {
          copy[key] = "[Removed]";
        } else {
          try {
            copy[key] = safeClone(value[key]);
          } catch {
            copy[key] = "[Error]";
          }
        }
      }
      return copy;
    }

    return safeClone(obj);
  }
}
