// ============================================
// ChatSessionHeaderConnector — chatSessionStore → ChatSessionHeader 매핑 (얇은 커넥터)
// 세션 CRUD/즐겨찾기/이름변경/삭제 hook 호출 → Design props로 전달.
// ============================================

import { useCallback } from "react";
import { ChatSessionHeader } from "@/pages/pro/parts/ChatSessionHeader";
import { useChatSessionStore } from "@/logic/common/chat/stores/chatSessionStore";

export function ChatSessionHeaderConnector() {
  const chatItems = useChatSessionStore((s) => s.chatItems);
  const selectedChatId = useChatSessionStore((s) => s.selectedChatId);
  const isCreatingChat = useChatSessionStore((s) => s.isCreatingChat);
  const createNewChat = useChatSessionStore((s) => s.createNewChat);
  const setCreatingChatComplete = useChatSessionStore(
    (s) => s.setCreatingChatComplete,
  );
  const selectChat = useChatSessionStore((s) => s.selectChat);
  const deleteChat = useChatSessionStore((s) => s.deleteChat);
  const updateChatTitle = useChatSessionStore((s) => s.updateChatTitle);
  const toggleFavorite = useChatSessionStore((s) => s.toggleFavorite);

  const selectedChat = chatItems.find((c) => c.id === selectedChatId);

  const handleNewChat = useCallback(async () => {
    try {
      await createNewChat();
    } finally {
      setCreatingChatComplete();
    }
  }, [createNewChat, setCreatingChatComplete]);

  const handleToggleFavorite = useCallback(() => {
    if (selectedChatId) toggleFavorite(selectedChatId);
  }, [selectedChatId, toggleFavorite]);

  const handleRename = useCallback(
    (title: string) => {
      if (selectedChatId) updateChatTitle(selectedChatId, title);
    },
    [selectedChatId, updateChatTitle],
  );

  const handleDelete = useCallback(async () => {
    if (selectedChatId) await deleteChat(selectedChatId);
  }, [selectedChatId, deleteChat]);

  return (
    <ChatSessionHeader
      chatItems={chatItems}
      selectedChatId={selectedChatId}
      selectedChatTitle={selectedChat?.title ?? "새 채팅"}
      isFavorite={selectedChat?.favorite ?? false}
      isCreatingChat={isCreatingChat}
      onNewChat={handleNewChat}
      onSelectChat={selectChat}
      onToggleFavorite={handleToggleFavorite}
      onRename={handleRename}
      onDelete={handleDelete}
    />
  );
}
