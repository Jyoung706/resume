import { Response } from "express";
import { Readable } from "stream";
import { AppResponse, FileResponse, RedirectResponse } from "../types/types";

export function handleResponse(res: Response, result: AppResponse) {
  try {
    if (result === undefined || result === null) {
      res.status(204).send(); // No Content
    } else if (Buffer.isBuffer(result)) {
      res.type("application/octet-stream").send(result);
    } else if (typeof result === "string") {
      res.type("text/plain").send(result);
    } else if (typeof result === "object") {
      if ("type" in result) {
        switch (result.type) {
          case "file": {
            const file = result as FileResponse;
            res.setHeader(
              "Content-Disposition",
              `attachment; filename="${file.filename}"`
            );
            res.type(file.mimeType || "application/octet-stream");

            if (Buffer.isBuffer(file.data)) {
              res.send(file.data);
            } else if (file.data instanceof Readable) {
              (file.data as Readable).pipe(res);
              (file.data as Readable).on("error", (err) => {
                console.error("Stream Error", err);
                if (!res.headersSent) {
                  res.status(500).send("File stream error.");
                }
              });
            } else {
              res.status(500).json({ error: "Invalid file data type" });
            }
            break;
          }

          case "redirect": {
            const redirect = result as RedirectResponse;
            res.redirect(redirect.status || 302, redirect.url);
            break;
          }

          default:
            res.status(500).json({ error: "Unknown response type" });
        }
      } else {
        res.json({ result }); // 일반 객체는 JSON 포맷으로 반환
      }
    } else {
      res.send(result); // fallback
    }
  } catch (err) {
    console.error("Response Error", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal Server Error (response)" });
    }
  }
}

export function repspnseUrl(url: string, state?: number): RedirectResponse {
  return {
    type: "redirect" as const,
    url,
    status: state || 302
  } as RedirectResponse;
}

export function repspnseFile(
  filename: string,
  data: Buffer | Readable,
  mimeType?: string
): FileResponse {
  return {
    type: "file" as const,
    filename,
    data,
    mimeType: mimeType || "application/octet-stream"
  } as FileResponse;
}
