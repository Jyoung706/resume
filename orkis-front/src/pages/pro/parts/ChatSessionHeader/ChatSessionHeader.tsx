// ============================================
// ChatSessionHeader — Pro 모드 좌측 사이드바 채팅 패널의 세션 헤더 (Design)
// [+] 새 채팅 · 세션 제목(드롭다운 트리거) · ★ 즐겨찾기 · ⋮ 더보기 · 삭제 확인
// Design Layer: props 기반. 인라인 편집/드롭다운/확인 다이얼로그의 open 상태는 로컬 UI state.
// ============================================

import { useCallback, useState } from "react";
import {
  Box,
  FlexBox,
  Icon,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from "@/components";
import { ActionMenu, ConfirmModal } from "@/components";
import { ChatListItemEditor } from "@/pages/chat/main/parts/ChatList/ChatListItemEditor";
import "./ChatSessionHeader.scss";

// ============================================
// Types
// ============================================

export interface ChatSessionHeaderItem {
  id: string;
  title: string;
  favorite?: boolean;
}

export interface ChatSessionHeaderProps {
  /** 전체 세션 목록 (드롭다운에 표시) */
  chatItems: ChatSessionHeaderItem[];
  /** 현재 선택된 세션 id (null이면 미선택 상태) */
  selectedChatId: string | null;
  /** 헤더에 표시할 제목 (선택 없으면 "새 채팅") */
  selectedChatTitle: string;
  /** 현재 세션의 즐겨찾기 상태 */
  isFavorite: boolean;

  /** 새 채팅 생성 중 (버튼 disabled 용) */
  isCreatingChat?: boolean;
  /** 새 채팅 클릭 */
  onNewChat: () => void;

  /** 드롭다운에서 세션 선택 */
  onSelectChat: (id: string) => void;
  /** 즐겨찾기 토글 (현재 세션 대상) */
  onToggleFavorite: () => void;
  /** 이름 변경 (현재 세션 대상) */
  onRename: (newTitle: string) => void;
  /** 삭제 (현재 세션 대상) — 확인 다이얼로그 통과 후 호출 */
  onDelete: () => void;
}

// ============================================
// ChatSessionHeader
// ============================================

export function ChatSessionHeader({
  chatItems,
  selectedChatId,
  selectedChatTitle,
  isFavorite,
  isCreatingChat,
  onNewChat,
  onSelectChat,
  onToggleFavorite,
  onRename,
  onDelete,
}: ChatSessionHeaderProps) {
  // ── 로컬 UI 상태 (편집/드롭다운/확인 다이얼로그 open 여부) ──
  const [selectorAnchor, setSelectorAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleSelectorOpen = useCallback(
    (e: React.MouseEvent<HTMLElement>) => setSelectorAnchor(e.currentTarget),
    [],
  );
  const handleSelectorClose = useCallback(() => setSelectorAnchor(null), []);
  const handleSelectSession = useCallback(
    (id: string) => {
      onSelectChat(id);
      setSelectorAnchor(null);
    },
    [onSelectChat],
  );

  const handleStartRename = useCallback(() => setIsEditing(true), []);
  const handleSaveRename = useCallback(
    (title: string) => {
      onRename(title);
      setIsEditing(false);
    },
    [onRename],
  );
  const handleCancelRename = useCallback(() => setIsEditing(false), []);

  const handleDeleteConfirm = useCallback(() => {
    onDelete();
    setDeleteConfirmOpen(false);
  }, [onDelete]);

  // 더보기 메뉴 항목
  const moreMenuItems = [
    { label: "이름 변경", icon: <Icon>edit</Icon>, onClick: handleStartRename },
    {
      label: "삭제",
      icon: <Icon>delete</Icon>,
      danger: true,
      onClick: () => setDeleteConfirmOpen(true),
    },
  ];

  return (
    <FlexBox className="ChatSessionHeader" align="center">
      {/* [+] 새 채팅 */}
      <IconButton
        size="small"
        onClick={onNewChat}
        disabled={isCreatingChat}
        title="새 채팅"
      >
        <Icon>chat_add_on</Icon>
      </IconButton>

      {/* 세션 제목 영역 */}
      {isEditing ? (
        <Box className="ChatSessionHeader__editor">
          <ChatListItemEditor
            value={selectedChatTitle}
            maxLength={100}
            onSave={handleSaveRename}
            onCancel={handleCancelRename}
          />
        </Box>
      ) : (
        <Box
          className="ChatSessionHeader__selector"
          onClick={handleSelectorOpen}
        >
          <Typography
            className="ChatSessionHeader__title"
            variant="body2"
          >
            {selectedChatTitle}
          </Typography>
          <Icon mui className="ChatSessionHeader__arrow">
            ArrowDropDownIcon
          </Icon>
        </Box>
      )}

      {/* ★ 즐겨찾기 */}
      {selectedChatId && !isEditing && (
        <IconButton
          size="small"
          onClick={onToggleFavorite}
          title="즐겨찾기"
        >
          <Icon mui className="ChatSessionHeader__fav-icon">
            {isFavorite ? "StarIcon" : "StarBorderIcon"}
          </Icon>
        </IconButton>
      )}

      {/* ⋮ 더보기 */}
      {selectedChatId && !isEditing && <ActionMenu items={moreMenuItems} />}

      {/* 세션 목록 드롭다운 */}
      <Menu
        anchorEl={selectorAnchor}
        open={!!selectorAnchor}
        onClose={handleSelectorClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: { className: "ChatSessionHeader__dropdown" },
        }}
      >
        {chatItems.length === 0 ? (
          <MenuItem disabled>
            <ListItemText primary="채팅이 없습니다" />
          </MenuItem>
        ) : (
          chatItems.map((item) => (
            <MenuItem
              key={item.id}
              selected={item.id === selectedChatId}
              onClick={() => handleSelectSession(item.id)}
              className="ChatSessionHeader__dropdown-item"
            >
              {item.favorite && (
                <ListItemIcon className="ChatSessionHeader__dropdown-fav">
                  <Icon mui size="small">StarIcon</Icon>
                </ListItemIcon>
              )}
              <ListItemText
                primary={item.title}
                slotProps={{
                  primary: { noWrap: true, variant: "body2" },
                }}
              />
            </MenuItem>
          ))
        )}
      </Menu>

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="채팅 삭제"
        message="이 채팅을 삭제하시겠습니까? 삭제된 채팅은 복구할 수 없습니다."
        confirmText="삭제"
        cancelText="취소"
        confirmColor="error"
        onConfirm={handleDeleteConfirm}
      />
    </FlexBox>
  );
}
