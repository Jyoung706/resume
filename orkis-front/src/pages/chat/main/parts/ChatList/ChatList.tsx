// ============================================
// ChatList — 채팅 목록 컴포넌트
// Design Layer: props 기반 (UI 상태만 관리)
// ============================================

import { useState, useRef } from "react";
import {
  ActionMenu,
  Box,
  Button,
  CircularProgress,
  ConfirmModal,
  FlexBox,
  Icon,
  IconButton,
  ListItemButton,
  Stack,
  Typography
} from "@/components";
import { ChatListItemEditor } from "./ChatListItemEditor";
import "../chat.parts.scss";

// ============================================
// 타입
// ============================================

export interface ChatListItemData {
  id: string;
  title: string;
  favorite: boolean;
  updatedAt?: string;
}

export interface ChatListProps {
  items: ChatListItemData[];
  selectedId?: string | null;
  isLoading?: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onToggleFavorite: (id: string) => void;
  onNewChat: () => void;
  /** 새 채팅 생성 중 여부 (버튼 비활성화) */
  isCreatingChat?: boolean;
  /** 최대 표시 수 */
  maxDisplayCount?: number;
  /** 더보기 표시 여부 */
  hasMore?: boolean;
  /** 더보기 콜백 */
  onLoadMore?: () => void;
}

// ============================================
// ChatList
// ============================================

export function ChatList({
  items,
  selectedId,
  isLoading,
  onSelect,
  onDelete,
  onRename,
  onToggleFavorite,
  onNewChat,
  isCreatingChat,
  maxDisplayCount,
  hasMore,
  onLoadMore,
}: ChatListProps) {
  // 인라인 편집 상태
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  // 삭제 확인 다이얼로그 상태
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  // 다이얼로그 닫힌 후 실행할 삭제 ID (모달 언마운트 완료 후 삭제)
  const pendingDeleteRef = useRef<string | null>(null);

  const handleEditStart = (chatId: string) => {
    (document.activeElement as HTMLElement)?.blur();
    setEditingChatId(chatId);
  };

  const handleDeleteRequest = (chatId: string) => {
    (document.activeElement as HTMLElement)?.blur();
    setConfirmDeleteId(chatId);
  };

  const handleEditSave = (chatId: string, title: string) => {
    onRename(chatId, title);
    setEditingChatId(null);
  };

  const handleDeleteConfirm = () => {
    if (confirmDeleteId) {
      // 삭제 ID를 ref에 저장하고 다이얼로그만 닫음
      // 실제 삭제는 다이얼로그 퇴장 애니메이션 완료 후 실행 (onExited)
      pendingDeleteRef.current = confirmDeleteId;
      setConfirmDeleteId(null);
    }
  };

  const handleDeleteDialogExited = () => {
    if (pendingDeleteRef.current) {
      onDelete(pendingDeleteRef.current);
      pendingDeleteRef.current = null;
    }
  };

  if (isLoading) {
    return (
      <FlexBox className="ChatList__loading">
        <CircularProgress size="medium" />
      </FlexBox>
    );
  }

  // 페이지네이션: 표시할 아이템 수 제한
  const displayItems = maxDisplayCount
    ? items.slice(0, maxDisplayCount)
    : items;

  return (
    <Stack className="ChatList__list">
      {/* 새 채팅 버튼 */}
      <Box className="ChatList__new-chat-wrap">
        <Button
          variant="outlined"
          fullWidth
          size="small"
          startIcon={<Icon size="small">chat_add_on</Icon>}
          onClick={onNewChat}
          disabled={isCreatingChat}
        >
          새 채팅
        </Button>
      </Box>

      {/* 빈 목록 */}
      {items.length === 0 && (
        <Box className="ChatList__empty">
          <Typography className="ChatList__empty-text">
            채팅이 없습니다
          </Typography>
        </Box>
      )}

      {/* 채팅 아이템 */}
      {displayItems.map((item) => {
        const isSelected = item.id === selectedId;
        const isEditing = item.id === editingChatId;
        return (
            <ListItemButton
              key={item.id}
              className="ChatList__item"
              selected={isSelected}
              onClick={() => onSelect(item.id)}
              onDoubleClick={() => handleEditStart(item.id)}
            >
              {/* 즐겨찾기 아이콘 */}
              <IconButton
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onToggleFavorite(item.id);
                }}
              >
                {item.favorite ? (
                  <Icon mui className="ChatList__star-icon">StarIcon</Icon>
                ) : (
                  <Icon mui className="ChatList__star-border-icon">StarBorderIcon</Icon>
                )}
              </IconButton>

              {/* 제목 또는 편집기 */}
              {isEditing ? (
                <Box
                  className="ChatList__editor-wrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ChatListItemEditor
                    value={item.title}
                    maxLength={100}
                    onSave={(title) => handleEditSave(item.id, title)}
                    onCancel={() => setEditingChatId(null)}
                  />
                </Box>
              ) : (
                <FlexBox className="ChatList__title-row">
                  <Typography
                    className="ChatList__title"
                    noWrap
                  >
                    {item.title}
                  </Typography>
                  {/* 날짜 표시 */}
                  {item.updatedAt && !isSelected && (
                    <Typography
                      className="ChatList__date"
                      noWrap
                    >
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </Typography>
                  )}
                </FlexBox>
              )}

              {/* 더보기 메뉴 (선택 시에만) */}
              {isSelected && !isEditing && (
                <ActionMenu
                  items={[
                    { label: "이름 변경", icon: <Icon mui className="ChatList__edit-icon">EditIcon</Icon>, onClick: () => handleEditStart(item.id) },
                    { label: "삭제", icon: <Icon mui className="ChatList__delete-icon">DeleteIcon</Icon>, onClick: () => handleDeleteRequest(item.id), danger: true },
                  ]}
                  stopPropagation
                  menuProps={{
                    disableRestoreFocus: true,
                    transformOrigin: { horizontal: "right", vertical: "top" },
                    anchorOrigin: { horizontal: "right", vertical: "bottom" },
                    slotProps: { paper: { className: "ChatList__menu-paper" } },
                  }}
                />
              )}
            </ListItemButton>
        );
      })}

      {/* 더보기 버튼 */}
      {(hasMore ||
        (maxDisplayCount && items.length > maxDisplayCount)) &&
        onLoadMore && (
          <Box className="ChatList__load-more-wrap">
            <Button
              variant="text"
              fullWidth
              size="small"
              onClick={onLoadMore}
            >
              더보기
            </Button>
          </Box>
        )}

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmModal
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        title="채팅방 삭제"
        message="삭제된 채팅방은 복구할 수 없습니다."
        confirmColor="error"
        confirmText="삭제"
        onConfirm={handleDeleteConfirm}
        slotProps={{ transition: { onExited: handleDeleteDialogExited } }}
      />
    </Stack>
  );
}
