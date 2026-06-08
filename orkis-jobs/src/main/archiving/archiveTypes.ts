/**
 * Archive HTTP trigger 경로 공용 타입 및 에러 클래스
 * (cron polling 경로의 DataArchiveJob 과 별개로, SSE stream 기반 archive 작성에 사용)
 */

// XRANGE 결과 raw 타입 (ioredis): [streamId, [field1, val1, field2, val2, ...]][]
export type StreamEntryRaw = [string, string[]];

// HGETALL 결과
export type StatHash = Record<string, string>;

// archive 파일 messages[] 한 record (기존 DataArchiveJob sessionData.messages 와 동일 schema)
export interface ArchiveRecord {
  msg_id: string | null;
  proc_index: number;
  proc_content: string | null;
  message_data: unknown | null;
  stream_message: { fullMessage: string } | null;
  timestamp: string | null; // cron archive 와 동일하게 null 허용 (reader 가 data.timestamp fallback)
}

// archive 파일 객체 1건 (DataArchiveJob 의 sessionData 와 동일 schema)
// proc: reader.parseProc 가 기대하는 형식. 매퍼가 stream entries(s/id/stat/r) 로부터 재구성한다.
//   "2": JSON.stringify([{0:"generate_hint"}, ...])   - steps 목록 (sql) 또는 [{0:"general"}] (general)
//   "3"+: JSON.stringify({id:number, stat:number})    - 단계별 progress update (큰 키가 최신)
//   "<9000~9004>": JSON.stringify({timestamp:number}) - 완료 코드 record (초 단위 epoch)
export interface SessionData {
  chatId: string;
  chatroomId: string | null;
  timestamp: string;
  stat: StatHash;
  proc: Record<string, string>;
  messages: ArchiveRecord[];
}

// ArchiveService.enqueue 결과
export interface EnqueueResult {
  accepted: true;
  queueDepth: number;
}

// ===== Backend -> Jobs HTTP archive trigger (cancel-archive race fix Phase 1) =====
//
// 정책:
// - chatId 필수. completionCode / reason 옵셔널 (구 backend 호출 호환).
// - completionCode 가 있으면 archive 의 proc_index 결정에 1순위로 사용한다.
// - 없으면 redis stream 의 r 필드를 2순위로 사용한다.
// - 둘 다 없으면 3순위 fallback (현재 9000 + 경고 로그, 향후 9005 도입 후 변경 예정).
// - DispatchReason union 은 backend 측 archiveTypes.ts 와 동일하게 유지 (lock-step).

export interface DispatchPayload {
  chatId: string;
  completionCode?: number;
  reason?: DispatchReason;
}

export type DispatchReason =
  | "cancel"
  | "timeout"
  | "error"
  | "complete"
  | "onClose";

/** ArchiveService -> StreamArchiveMapper 로 흘려보내는 hints. */
export interface ArchiveHints {
  completionCode?: number;
  reason?: DispatchReason;
}

// ===== HTTP 매핑용 에러 클래스 =====
// @orkis/core ExpressErrorHandler 가 err.statusCode 를 자동 매핑한다

export class BadRequestError extends Error {
  readonly statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

export class QueueOverflowError extends Error {
  readonly statusCode = 503;
  constructor(currentDepth: number, max: number) {
    super(`archive queue overflow: ${currentDepth}/${max}`);
    this.name = "QueueOverflowError";
  }
}
