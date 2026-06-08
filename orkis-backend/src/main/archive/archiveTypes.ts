/**
 * Backend -> Jobs HTTP archive trigger 의 dispatch payload 타입.
 *
 * 정책 (2026-05-22 갱신, cancel-archive race fix Phase 1):
 * - chatId 필수. 호환 유지를 위해 jobs 는 chatId 만 받는 구 호출도 계속 처리한다.
 * - completionCode / reason 은 옵셔널. backend 가 stream 종료 의지를 명시 전달할 때 사용.
 *   jobs 는 이 값을 1순위로 archive 파일의 proc_index 에 박는다.
 * - completionCode 누락 시 jobs 는 redis stream 의 r 필드를 2순위로 사용.
 * - jobs/backend 간 reason union 은 양쪽 archiveTypes.ts 에 중복 정의됨 (서로 다른 서브
 *   모듈이라 직접 공유 불가). 변경 시 양쪽 동시에 수정 필요.
 */
export interface DispatchPayload {
  chatId: string;
  completionCode?: number;
  reason?: DispatchReason;
}

/**
 * dispatch 발생 경로 식별자. jobs 측 동일 union (`apps/orkis-jobs/.../archiveTypes.ts`) 과
 * lock-step 으로 유지한다.
 */
export type DispatchReason =
  | "cancel" // cancelStream — 사용자 정지 클릭
  | "timeout" // MESSAGE_TIMEOUT — 스트림 시간 초과
  | "error" // stream error 또는 비정상 종료
  | "complete" // 정상 종료 (handleCompletion 정상 경로)
  | "onClose"; // SSE 연결 종료 — completionCode 정보 없음
