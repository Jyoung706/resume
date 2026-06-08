import { useEffect } from "react";

interface PerfSnapshot {
  ts: number;
  totalNodes: number;
  chatMessagesNodes: number | null;
  messageCount: number;
  jsHeapMB: number | null;
}

/**
 * 채팅 페이지의 누적 성능 지표를 주기적으로 console.debug 로 기록한다.
 * 개발 모드(import.meta.env.DEV)에서만 동작하며 운영 빌드에서는 dead-code 로 제거된다.
 *
 * Phase 1 Collapse unmountOnExit 효과 정량화 및 Phase 2 가상화 베이스라인 확보 목적.
 * 진단 리포트 측정 코드(docs/2026-05-14/orkis-chat-freeze-report.md §6 부록) 재사용.
 */
export function useChatPerfTelemetry(messageCount: number, intervalMs = 30_000) {
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const snapshot = (): PerfSnapshot => {
      const list = document.querySelector(".ChatPage__messages");
      const heap = (
        performance as Performance & { memory?: { usedJSHeapSize: number } }
      ).memory;
      return {
        ts: Date.now(),
        totalNodes: document.querySelectorAll("*").length,
        chatMessagesNodes: list ? list.querySelectorAll("*").length : null,
        messageCount,
        jsHeapMB: heap ? +(heap.usedJSHeapSize / 1048576).toFixed(1) : null,
      };
    };

    console.debug("[chat-perf]", snapshot());
    const timer = setInterval(() => {
      console.debug("[chat-perf]", snapshot());
    }, intervalMs);

    return () => clearInterval(timer);
  }, [messageCount, intervalMs]);
}
