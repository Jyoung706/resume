/**
 * useChatSession — 채팅 세션 관리 훅
 * chatSessionStore 래핑
 */
import { useChatSessionStore } from "@/logic/common/chat/stores/chatSessionStore";

/**
 * chatSessionStore의 상태와 액션을 React 컴포넌트에 바인딩하는 훅.
 * 채팅 목록 조회, 세션 선택/생성/삭제, 즐겨찾기 토글, 제목 수정,
 * 페이지네이션(loadMore) 등 세션 관련 모든 기능을 노출한다.
 */
export function useChatSession() {
  const chatItems = useChatSessionStore((s) => s.chatItems);
  const selectedChatId = useChatSessionStore((s) => s.selectedChatId);
  const isLoading = useChatSessionStore((s) => s.isLoading);
  const isCreatingChat = useChatSessionStore((s) => s.isCreatingChat);
  const error = useChatSessionStore((s) => s.error);
  const sessionsLoaded = useChatSessionStore((s) => s.sessionsLoaded);

  const loadChatList = useChatSessionStore((s) => s.loadChatList);
  const createNewChat = useChatSessionStore((s) => s.createNewChat);
  const selectChat = useChatSessionStore((s) => s.selectChat);
  const deleteChat = useChatSessionStore((s) => s.deleteChat);
  const toggleFavorite = useChatSessionStore((s) => s.toggleFavorite);
  const updateChatTitle = useChatSessionStore((s) => s.updateChatTitle);
  const clearError = useChatSessionStore((s) => s.clearError);
  const maxDisplayCount = useChatSessionStore((s) => s.maxDisplayCount);
  const loadMore = useChatSessionStore((s) => s.loadMore);
  const setCreatingChatComplete = useChatSessionStore((s) => s.setCreatingChatComplete);

  return {
    chatItems,
    selectedChatId,
    isLoading,
    isCreatingChat,
    error,
    sessionsLoaded,
    maxDisplayCount,
    loadChatList,
    loadMore,
    createNewChat,
    selectChat,
    deleteChat,
    toggleFavorite,
    updateChatTitle,
    setCreatingChatComplete,
    clearError,
  };
}
