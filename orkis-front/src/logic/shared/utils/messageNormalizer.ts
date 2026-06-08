/**
 * messageNormalizer — 메시지 데이터 정규화 유틸리티
 *
 * 백엔드 → 프론트 데이터 변환을 한 곳에서 관리.
 * 사용처:
 *   - chatService.ts (로드된 메시지)
 *   - streamManager.ts (실시간 스트리밍)
 *
 * 백엔드 데이터 형식 차이:
 *   실시간 SSE:  stat(숫자 0|1|2|3), id("0"|"1"), sqlQuery/query/sql
 *   로드된 API:  status("success"|"processing"), id("generate_hint"), sqlQuery
 */
import type { ProcessStep, SqlResult, GeneralResult, ChatMessage } from "@/logic/common/chat/types/chat";

// ── 프로세스 상태 정규화 ────────────────────────

/**
 * 백엔드 stat 숫자 → UI ProcessStep status 문자열
 * 실시간 SSE step 이벤트에서 사용
 *
 * 백엔드/AI 서버 enum과 일치:
 *   - apps/orkis-backend sse.types.ts ProcessStatus { RUNNING: 0, COMPLETED: 1, ERROR: -1 }
 *   - apps/orkis-ai PROC_STAT_CODE { running=0, success=1, fail=-1 }
 */
export function statToStatus(stat: number): ProcessStep["status"] {
  switch (stat) {
    case 0:
      return "running";
    case 1:
      return "completed";
    case -1:
      return "error";
    default:
      return "pending";
  }
}

/**
 * 백엔드 status 문자열 → UI ProcessStep status 문자열
 * 로드된 메시지의 프로세스에서 사용
 *   "success" → "completed", "processing" → "running"
 */
export function normalizeProcessStatus(
  status: string
): ProcessStep["status"] {
  switch (status) {
    case "success":
    case "completed":
      return "completed";
    case "processing":
    case "running":
      return "running";
    case "error":
      return "error";
    default:
      return "pending";
  }
}

// ── 프로세스 배열 정규화 ────────────────────────

/**
 * 백엔드 프로세스 배열 → UI ProcessStep[] 변환
 * 백엔드가 다양한 필드명(id/s, label/n/name, status/stat)을 사용하므로
 * 통일된 { id, label, status } 형태로 정규화
 */
export function normalizeProcesses(
  raw: Array<Record<string, unknown>> | undefined
): ProcessStep[] | undefined {
  if (!raw || !Array.isArray(raw) || raw.length === 0) return undefined;
  return raw.map((p) => ({
    id: (p.id as string) || (p.s as string) || "",
    label: (p.label as string) || (p.n as string) || (p.name as string) || "",
    status: typeof p.stat === "number"
      ? statToStatus(p.stat as number)
      : normalizeProcessStatus((p.status as string) || "pending"),
  }));
}

/**
 * 완료된 메시지의 프로세스 → 모든 non-error step을 completed로 강제 변환
 * 실시간 complete 이벤트 처리 + 로드된 성공 메시지 모두 사용
 */
export function forceCompleteProcesses(
  processes: ProcessStep[]
): ProcessStep[] {
  return processes.map((p) =>
    p.status !== "error" ? { ...p, status: "completed" as const } : p
  );
}

/**
 * 에러 발생 시 running step을 error로 변환
 * SQL 타입 에러 이벤트에서 사용
 */
export function markRunningAsError(
  processes: ProcessStep[]
): ProcessStep[] {
  return processes.map((p) =>
    p.status === "running" ? { ...p, status: "error" as const } : p
  );
}

// ── 프로세스 step 업데이트 ────────────────────────

/**
 * 실시간 step 이벤트로 프로세스 배열 업데이트
 * running 상태 설정 시 이전 step을 자동 completed 처리
 */
export function updateProcessStep(
  processes: ProcessStep[],
  payload: Record<string, unknown>
): ProcessStep[] {
  const stepId = (payload.s ?? payload.id) as string | undefined;
  if (stepId === undefined) return processes;

  const rawStat = payload.stat as number | undefined;
  const status: ProcessStep["status"] =
    rawStat !== undefined
      ? statToStatus(rawStat)
      : normalizeProcessStatus((payload.status as string) ?? "pending");

  // running 설정 시 이전 step 자동 완료
  if (status === "running") {
    const targetIdx = processes.findIndex((p) => p.id === stepId);
    return processes.map((p, i) => {
      if (p.id === stepId) return { ...p, status };
      if (i < targetIdx && p.status !== "error")
        return { ...p, status: "completed" };
      return p;
    });
  }
  return processes.map((p) => (p.id === stepId ? { ...p, status } : p));
}

// ── Result 정규화 ────────────────────────

/**
 * 백엔드 SQL 쿼리 필드명 추출
 * 백엔드가 sqlQuery, query, sql 등 다양한 필드명 사용
 */
export function extractSqlQuery(data: Record<string, unknown>): string {
  return (
    (data.query as string) ||
    (data.sqlQuery as string) ||
    (data.sql as string) ||
    ((data.metadata as Record<string, unknown>)?.query as string) ||
    ""
  );
}

/**
 * 백엔드 result → UI SqlResult | GeneralResult 변환
 * sqlQuery → query 필드 정규화 포함
 */
export function normalizeResult(
  raw: Record<string, unknown> | undefined
): ChatMessage["result"] {
  if (!raw) return undefined;

  // SQL 결과 (columns + data 존재 또는 error 존재)
  if (raw.columns && raw.data) {
    return {
      query: extractSqlQuery(raw),
      columns: raw.columns as SqlResult["columns"],
      data: raw.data as SqlResult["data"],
      executionTime: raw.executionTime as number | undefined,
      error: raw.error as string | undefined,
    };
  }
  // General 결과
  if (raw.content) {
    return { content: raw.content as string } as GeneralResult;
  }
  return undefined;
}

// ── 메시지에서 processes/result 추출 ────────────────────────

/**
 * API 응답 메시지에서 processes 추출
 * 검색 순서: steps → sqlSteps → processes → metadata.processes
 */
export function extractProcessesFromMessage(
  msg: Record<string, unknown>
): ProcessStep[] | undefined {
  const metadata = (msg.metadata || {}) as Record<string, unknown>;
  const aiMetadata = (msg.aiMetadata || {}) as Record<string, unknown>;
  const raw = (
    msg.steps ||
    msg.sqlSteps ||
    msg.processes ||
    metadata.processes ||
    aiMetadata.processes ||
    undefined
  ) as Array<Record<string, unknown>> | undefined;
  return normalizeProcesses(raw);
}

/**
 * API 응답 메시지에서 result 추출
 * 검색 순서: result → metadata.result
 */
export function extractResultFromMessage(
  msg: Record<string, unknown>
): ChatMessage["result"] {
  const metadata = (msg.metadata || {}) as Record<string, unknown>;
  const raw = (msg.result || metadata.result || undefined) as
    | Record<string, unknown>
    | undefined;
  return normalizeResult(raw);
}

// ── SQL 쿼리 fallback 추출 ────────────────────────

/**
 * 메시지에서 SQL 쿼리 문자열을 다양한 위치에서 탐색
 * 검색 순서: result 내부 → 메시지 최상위 → metadata 내부
 */
export function extractSqlQueryFromMessage(
  msg: Record<string, unknown>
): string {
  const metadata = (msg.metadata || {}) as Record<string, unknown>;
  return (
    (msg.sqlQuery as string) ||
    (msg.sql as string) ||
    (metadata.query as string) ||
    (metadata.sqlQuery as string) ||
    ""
  );
}

const SQL_VERB_PATTERN = /^(SELECT|INSERT|UPDATE|DELETE|WITH|CREATE|ALTER|DROP)\b/i;

/**
 * content 안에서 SQL 쿼리 추출 (백엔드 FetchStreamService.extractSqlQuery 와 동일 패턴)
 * 우선순위: <FINAL_ANSWER> 태그 → ```sql 블록 → 일반 ``` 블록(SQL 검증) → 전체가 SQL 시작
 */
function extractSqlFromContent(content: string): string | null {
  if (!content) return null;

  const finalAnswer = content.match(/<FINAL_ANSWER>([\s\S]*?)<\/FINAL_ANSWER>/i);
  if (finalAnswer && finalAnswer[1]?.trim()) return finalAnswer[1].trim();

  const sqlBlock = content.match(/```sql\s*([\s\S]*?)```/i);
  if (sqlBlock && sqlBlock[1]?.trim()) return sqlBlock[1].trim();

  const codeBlock = content.match(/```\s*([\s\S]*?)```/);
  if (codeBlock && codeBlock[1]?.trim()) {
    const candidate = codeBlock[1].trim();
    if (SQL_VERB_PATTERN.test(candidate)) return candidate;
  }

  const trimmed = content.trim();
  if (trimmed && SQL_VERB_PATTERN.test(trimmed)) return trimmed;

  return null;
}

/**
 * SQL 타입 메시지에서 result가 없을 때 최소 SqlResult 생성
 * 백엔드가 extractSqlResultFromStat 실패 시 result 없이 보내는 경우 대비
 *
 * 동작:
 *   1) result가 이미 있으면 그대로 반환
 *   2) 메시지 필드(sqlQuery/sql/metadata.query/metadata.sqlQuery) 탐색
 *   3) content에서 <FINAL_ANSWER>/```sql/```/SQL prefix 패턴 추출
 *   추출 성공 시 → { query, columns: [], data: [] } 최소 result + content="" (중복 노출 방지)
 *
 * 주의: archive 저장 시 proc:{} 하드코딩으로 questionType이 "general"로 복원되는 케이스
 *       (StreamArchiveMapper.ts) 대응을 위해 questionType guard를 두지 않고 content 패턴으로 판정
 */
export function ensureSqlResult(
  msg: Record<string, unknown>,
  result: ChatMessage["result"],
  questionType: string
): { result: ChatMessage["result"]; content: string } {
  const content = (msg.content as string) || (msg.text as string) || "";

  // result가 이미 존재하면 그대로 반환
  if (result) return { result, content };

  // 메시지 필드에서 SQL 쿼리 탐색 (백엔드가 명시적으로 보낸 경우)
  const sqlFromFields = extractSqlQueryFromMessage(msg);
  if (sqlFromFields) {
    return {
      result: {
        query: sqlFromFields,
        columns: [] as SqlResult["columns"],
        data: [] as SqlResult["data"],
      },
      content,
    };
  }

  // content 패턴 추출 (questionType이 general로 잘못 복원된 케이스 포함)
  const sqlFromContent = extractSqlFromContent(content);
  if (sqlFromContent) {
    return {
      result: {
        query: sqlFromContent,
        columns: [] as SqlResult["columns"],
        data: [] as SqlResult["data"],
      },
      content: "",
    };
  }

  // SQL 타입이 명시적인데도 추출 실패 — 빈 result 보장 (questionType 시그널 보존용)
  if (questionType === "sql") {
    return { result, content };
  }

  return { result, content };
}
