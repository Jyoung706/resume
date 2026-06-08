/**
 * useErrorHandler — 비동기/이벤트 핸들러 에러를 Error Boundary로 강제 전파
 *
 * React Error Boundary는 렌더링 단계 에러만 포착한다.
 * 비동기 코드 내에서 발생한 "치명적" 에러를 Error Boundary가 처리하게 하려면
 * 다음 렌더 사이클에 throw해야 한다.
 *
 * 사용 판단 기준:
 *   - 컴포넌트 자체가 더 이상 정상 렌더링 불가능 → 사용
 *   - 단순 작업 실패 (전송 실패 등) → 사용 X (토스트로 충분)
 *
 * @example
 * function ChatMessageList({ sessionId }) {
 *   const throwError = useErrorHandler();
 *   useEffect(() => {
 *     parseAndCacheMessages(messages).catch((e) => throwError(e));
 *   }, [messages]);
 *   return <MessageList />;
 * }
 */
import { useCallback, useState } from "react";

export function useErrorHandler() {
  const [, setError] = useState<unknown>();
  return useCallback((error: unknown) => {
    setError(() => {
      // setState updater에서 throw하면 다음 렌더 사이클에 Error Boundary가 포착
      throw error instanceof Error ? error : new Error(String(error));
    });
  }, []);
}
