/**
 * useUserBootstrap — 로그인 사용자별 데이터 부트스트랩 훅
 *
 * AuthGuard 내부에서 1회 마운트되어, 인증 사용자 변경 시점에
 * DB / LLM / 채팅 세션 목록을 1회만 동기 fetch 한다.
 *
 * deps 에 userId 가 들어가는 것이 핵심 — 동일 탭에서 logout→login 으로
 * 다른 계정으로 전환되어도 store 의 isInitialized 가드를 우회해 재fetch 가
 * 보장된다 (authStore.logout 에서 isInitialized=false 로 reset 한 뒤
 * 새 userId 가 들어오면 effect 가 재실행).
 */
import { useEffect } from "react";
import { useAuthStore } from "@/logic/common/auth/authStore";
import { useDbSelectionStore } from "@/logic/common/db/dbSelectionStore";
import { useLlmModelStore } from "@/logic/common/llm/llmModelStore";
import { useChatSessionStore } from "@/logic/common/chat/stores/chatSessionStore";
import { getLogger } from "@/logic/shared/utils/logger";

const logger = getLogger("useUserBootstrap");

export function useUserBootstrap() {
  const userId = useAuthStore((s) => s.user?.id);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    // DB 연결 → RAG 완료 목록은 dbConnections 의존이라 순차 실행
    void useDbSelectionStore
      .getState()
      .loadDbConnections()
      .then(() => useDbSelectionStore.getState().loadRagCompletedConnections())
      .catch((e) => logger.warn("db bootstrap failed:", e));

    void useLlmModelStore
      .getState()
      .fetchModels()
      .catch((e) => logger.warn("llm bootstrap failed:", e));

    // isInitialLogin=true → chatSession persist 정리 + 첫 페이지 강제 reload
    void useChatSessionStore
      .getState()
      .loadChatList(true)
      .catch((e) => logger.warn("chat-session bootstrap failed:", e));
  }, [userId, isAuthenticated]);
}
