import * as fs from "fs-extra";
import DateUtil from "./DateUtil";
import path from "path";

export const writeCrashLog = (context: string, error: any): string => {
  const logDir = process.env.LOGDIR || "./logs";
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const timestamp = DateUtil.getCurrentDateTime();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : "N/A";

  const logContent = `[${timestamp}] [FATAL] ${context}
  Error: ${errorMessage}
  Stack: ${errorStack}`;

  const fileTimestamp = timestamp.replace(/[:\s]/g, "-");
  const logPath = path.join(logDir, `crash-${fileTimestamp}.log`);
  fs.writeFileSync(logPath, logContent, { encoding: "utf-8" });

  return logPath;
};
