/**
 * Desktop Main 프로세스의 컨테이너 health 상태 (service:status IPC) 구독.
 * 웹 환경에서는 no-op (subscribe 가 항상 unsubscribe 함수만 반환).
 */
export function subscribeServiceHealth(
  callback: (event: ServiceStatusEvent) => void,
): () => void {
  const unsubscribe = window.electronAPI?.health?.subscribe?.(callback);
  return unsubscribe ?? (() => {});
}
