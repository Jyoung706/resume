/**
 * RAG 폴링 매니저 — 모듈 싱글톤 타이머
 *
 * React 외부에서 동작하는 순수 타이머 관리자.
 * ragPollingStore에서 사용하며, 직접 import 해 사용하지 않는다.
 */

const RAG_POLL_INTERVAL = 5_000; // 5초

let timerId: ReturnType<typeof setInterval> | null = null;

/**
 * RAG 폴링을 시작한다.
 * 기존 타이머가 있으면 정리 후 재시작.
 * 즉시 1회 실행 후 interval 반복.
 */
export function startRagPolling(callback: () => void): void {
  stopRagPolling();
  // 즉시 1회 실행
  callback();
  timerId = setInterval(callback, RAG_POLL_INTERVAL);
}

/**
 * RAG 폴링을 중지한다.
 */
export function stopRagPolling(): void {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
}

/**
 * 현재 폴링이 활성 상태인지 확인.
 */
export function isPollingActive(): boolean {
  return timerId !== null;
}
