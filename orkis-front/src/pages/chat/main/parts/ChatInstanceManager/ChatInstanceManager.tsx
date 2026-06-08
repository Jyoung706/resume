/**
 * ChatInstanceManager — Activity API 기반 멀티 인스턴스 관리
 * 최근 방문한 채팅방들을 Activity로 감싸 DOM/state 보존
 */
import { Activity } from "react";
import { useState, useEffect } from "react";

interface ChatInstanceManagerProps {
  /** 현재 선택된 세션 ID */
  selectedSessionId: string | null;
  /** 각 인스턴스 렌더 함수 */
  renderInstance: (sessionId: string) => React.ReactNode;
  /** Activity로 DOM을 유지할 최대 채팅방 수 */
  maxInstances?: number;
}

export function ChatInstanceManager({
  selectedSessionId,
  renderInstance,
  maxInstances = 10,
}: ChatInstanceManagerProps) {

  // 방문한 세션 목록 (MRU 순서)
  const [visitedSessions, setVisitedSessions] = useState<string[]>([]);

  // 새 세션 선택 시 목록 업데이트
  useEffect(() => {
    if (!selectedSessionId) return;

    setVisitedSessions((prev) => {
      // 이미 있으면 맨 앞으로 이동
      const filtered = prev.filter((id) => id !== selectedSessionId);
      const next = [selectedSessionId, ...filtered];

      // 최대 인스턴스 수 초과 시 퇴출
      return next.slice(0, maxInstances);
    });
  }, [selectedSessionId, maxInstances]);

  return (
    <>
      {visitedSessions.map((sessionId) => (
        <Activity
          key={sessionId}
          mode={sessionId === selectedSessionId ? "visible" : "hidden"}
        >
          {renderInstance(sessionId)}
        </Activity>
      ))}
    </>
  );
}
