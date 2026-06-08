/**
 * serverExport — Pro 모드 "전체 데이터" 다운로드를 위한 서버 streaming 트리거.
 *
 * 흐름:
 *   1. validateQueryForExport — 사전 검증 fetch (SQL 비어있음·SELECT 여부·문법)
 *   2. triggerServerExport     — form submit 으로 백엔드 /query/export 호출
 *      → 백엔드가 streaming 응답 → 브라우저가 직접 디스크 저장
 *
 * 메모리·UX 보장:
 *   - form submit 패턴: 클라 JS heap 영향 0 (브라우저 native 다운로드)
 *   - 진행률 표시는 미지원 (Phase 2 후속 검토 — 상위 설계 §J 참조)
 *   - 큰 export 의 사용자 인지: 5초 지연 토스트 (호출자 책임)
 */
import { apiPost } from "@/logic/shared/services/request";

/** 백엔드 export 형식 */
export type ServerExportFormat = "csv" | "json";

export interface ServerExportPayload {
  sqlQuery: string;
  dbId?: string;
  connectionId?: number;
  format: ServerExportFormat;
}

export interface ValidateExportPayload {
  sqlQuery: string;
  dbId?: string;
  connectionId?: number;
}

interface ValidateResponse {
  valid: boolean;
}

/**
 * 사전 SQL 검증. form submit 전에 호출하여 다음 시나리오 차단:
 *   - 빈 SQL / SELECT 외 쿼리 / 문법 오류
 *   - 이 검증 없이 form submit 하면 새 탭에 JSON 에러 노출되는 UX 문제 발생
 *
 * 성공 시 resolve(void), 실패 시 reject(Error("...")) — 호출자가 토스트 처리.
 */
export async function validateQueryForExport(
  payload: ValidateExportPayload,
): Promise<void> {
  // apiPost 가 success: false 응답 시 자동으로 throw — 별도 분기 불필요.
  // success: true 응답이면 data: { valid: true } 반환.
  const result = await apiPost<ValidateResponse>(
    "/query/validate-for-export",
    payload,
    { silent: true },
  );
  if (!result?.valid) {
    throw new Error("쿼리 검증에 실패했습니다.");
  }
}

/**
 * 백엔드 /query/export 로 form submit 트리거.
 * - 브라우저가 attachment 응답을 받아 자동으로 파일 다운로드
 * - same-origin POST 라 세션 쿠키 자동 포함
 * - JS heap 영향 0 (Blob 누적 없음)
 *
 * 호출 전 validateQueryForExport 권장 — 실패 시 form submit 안 함.
 */
export function triggerServerExport(payload: ServerExportPayload): void {
  const form = document.createElement("form");
  form.method = "POST";
  // request.ts 의 apiPost 가 사용하는 prefix 와 동일 (vite proxy /api → backend)
  form.action = "/api/query/export";
  form.style.display = "none";

  const appendField = (name: string, value: unknown) => {
    if (value == null) return;
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = String(value);
    form.appendChild(input);
  };

  appendField("sqlQuery", payload.sqlQuery);
  appendField("dbId", payload.dbId);
  appendField("connectionId", payload.connectionId);
  appendField("format", payload.format);

  document.body.appendChild(form);
  form.submit();
  // form.submit() 직후 동기 removeChild 시 일부 브라우저(Firefox·구 Safari)에서
  // disconnected form 의 submit 이 취소되는 사례가 보고되어 macrotask 로 지연.
  // csvExport.ts 의 triggerDownload 가 URL.revokeObjectURL 을 1초 지연하는
  // 패턴과 동일한 안전 우회.
  setTimeout(() => {
    if (form.parentNode) {
      document.body.removeChild(form);
    }
  }, 0);
}
