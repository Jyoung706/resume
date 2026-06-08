import { Autowired, Body, Controller, Post } from "@orkis/core/common";
import { ArchiveService } from "@/archiving/ArchiveService";
import {
  ArchiveHints,
  BadRequestError,
  DispatchReason
} from "@/archiving/archiveTypes";

const VALID_REASONS: ReadonlySet<DispatchReason> = new Set<DispatchReason>([
  "cancel",
  "timeout",
  "error",
  "complete",
  "onClose"
]);

@Controller({ path: "archive" })
export class DataArchiveController {
  @Autowired("ArchiveService")
  private archiveService!: ArchiveService;

  @Post("/test")
  async test() {
    return { message: "Data archive test successful" };
  }

  /**
   * Backend HTTP trigger 진입점.
   *
   * body:
   *   - chatId (required)
   *   - completionCode (optional, 9000-9999) — backend 가 stream 종료 코드를 명시 전달
   *   - reason (optional) — dispatch 발생 경로 ("cancel"|"timeout"|"error"|"complete"|"onClose")
   *
   * malformed -> 400 (BadRequestError), 큐 초과 -> 503 (QueueOverflowError),
   *   둘 다 @orkis/core ExpressErrorHandler 가 err.statusCode 로 자동 매핑.
   *
   * 호환성: 구 backend 가 { chatId } 만 보내는 호출도 그대로 동작 (hints 없음 -> jobs 가 redis r fallback).
   */
  @Post("/internal")
  async internal(
    @Body()
    body: {
      chatId?: unknown;
      completionCode?: unknown;
      reason?: unknown;
    }
  ) {
    if (typeof body?.chatId !== "string" || body.chatId.length === 0) {
      throw new BadRequestError("chatId required");
    }

    const hints: ArchiveHints = {};
    if (body.completionCode !== undefined) {
      if (
        typeof body.completionCode !== "number" ||
        !Number.isInteger(body.completionCode) ||
        body.completionCode < 9000 ||
        body.completionCode > 9999
      ) {
        throw new BadRequestError(
          `completionCode must be integer in [9000, 9999]: ${String(
            body.completionCode
          )}`
        );
      }
      hints.completionCode = body.completionCode;
    }
    if (body.reason !== undefined) {
      if (
        typeof body.reason !== "string" ||
        !VALID_REASONS.has(body.reason as DispatchReason)
      ) {
        throw new BadRequestError(
          `reason must be one of ${[...VALID_REASONS].join("|")}: ${String(
            body.reason
          )}`
        );
      }
      hints.reason = body.reason as DispatchReason;
    }

    const queueDepth = this.archiveService.enqueue(body.chatId, hints);
    return { accepted: true, queueDepth };
  }
}
