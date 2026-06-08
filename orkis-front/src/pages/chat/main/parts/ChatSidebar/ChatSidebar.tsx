// ============================================
// ChatSidebar — 채팅 사이드바 컴포넌트
// Design Layer: props 기반 (로직 없음)
// MUI Drawer (persistent) — 200ms 슬라이드 트랜지션
// ============================================
// 항상 마운트:
//   - 플로팅 헤더(접힘 시 좌상단 열기 아이콘) — opacity로 토글
//   - Drawer (persistent) — open={!isCollapsed}로 슬라이드 인/아웃
// 아이콘: SVG (Material Symbols left_panel_close / left_panel_open 동일)
// ============================================

import { Box, Divider, Drawer, FlexBox, Icon, Img } from "@/components";
import { useThemeModeContext } from "@/design-system";
import clsx from "clsx";
import { ChatList, type ChatListItemData } from "../ChatList";
import { CreditAlert } from "../CreditAlert";
import { UserProfile } from "../UserProfile";
import "../chat.parts.scss";

// ============================================
// Props
// ============================================

export interface ChatSidebarProps {
  chatList: ChatListItemData[];
  selectedChatId?: string | null;
  isCollapsed: boolean;
  isLoading?: boolean;
  user?: { name: string; email?: string; avatarUrl?: string };
  onToggleCollapse: () => void;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  /** 새 채팅 생성 중 여부 (버튼 비활성화) */
  isCreatingChat?: boolean;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, title: string) => void;
  onToggleFavorite: (id: string) => void;
  /** 로고 클릭 콜백 */
  onLogoClick?: () => void;
  /** 페이지네이션 (제공 시 더보기 지원) */
  pagination?: {
    maxDisplayCount?: number;
    hasMore?: boolean;
    onLoadMore?: () => void;
  };
  /** 크레딧 (제공 시 CreditAlert 렌더링) */
  credit?: {
    used: number;
    total: number;
    exhaustedMessage?: string;
  };
}

// ============================================
// ChatSidebar
// ============================================

export function ChatSidebar({
  chatList,
  selectedChatId,
  isCollapsed,
  isLoading,
  user,
  onToggleCollapse,
  onSelectChat,
  onNewChat,
  isCreatingChat,
  onDeleteChat,
  onRenameChat,
  onToggleFavorite,
  onLogoClick,
  pagination,
  credit
}: ChatSidebarProps) {
  
  const { resolvedMode } = useThemeModeContext();

  return (
    <>
      {/* ========== 플로팅 헤더 (접힘 상태에서 표시) — 항상 마운트, opacity로 토글 ========== */}
      <FlexBox
        className={clsx(
          "ChatSidebar__collapsed-header",
          !isCollapsed && "ChatSidebar__collapsed-header--hidden"
        )}
        aria-hidden={!isCollapsed}
      >
        <FlexBox
          onClick={onToggleCollapse}
          className="ChatSidebar__panel-icon"
        >
          <Icon size="medium">left_panel_open</Icon>
        </FlexBox>
      </FlexBox>

      {/* ========== Persistent Drawer — MUI 내장 Slide 트랜지션 ========== */}
      <Drawer
        className="ChatSidebar__drawer"
        variant="persistent"
        anchor="left"
        open={!isCollapsed}
        transitionDuration={200}
      >
        {/* 헤더: 로고 + ORKIS + 닫기 아이콘 */}
        <FlexBox className="ChatSidebar__expanded-header">
          <FlexBox
            onClick={onLogoClick}
            className={clsx(
              "ChatSidebar__expanded-logo-group",
              "ChatSidebar__logo",
              !onLogoClick && "ChatSidebar__logo-default"
            )}
          >
            <Img
              className="ChatSidebar__logo-img"
              src={resolvedMode === 'dark' ? '/assets/logo/orkis-symbol-dark.png' : '/assets/logo/orkis-symbol.png'}
              alt="ORKIS Symbol"
            />
            <Img
              className="ChatSidebar__title"
              src={resolvedMode === 'dark' ? '/assets/logo/orkis-text-dark.svg' : '/assets/logo/orkis-text.svg'}
              alt="ORKIS"
            />
          </FlexBox>
          <FlexBox
            onClick={onToggleCollapse}
            className="ChatSidebar__panel-icon"
          >
            <Icon size="medium">left_panel_close</Icon>
          </FlexBox>
        </FlexBox>

        <Divider className="ChatSidebar__top-divider" />

        {/* 채팅 리스트 */}
        <FlexBox className="ChatSidebar__chat-list-section">
          <Box className="ChatSidebar__chat-list-scroll">
            <ChatList
              items={chatList}
              selectedId={selectedChatId}
              isLoading={isLoading}
              onSelect={onSelectChat}
              onDelete={onDeleteChat}
              onRename={onRenameChat}
              onToggleFavorite={onToggleFavorite}
              onNewChat={onNewChat}
              isCreatingChat={isCreatingChat}
              maxDisplayCount={pagination?.maxDisplayCount}
              hasMore={pagination?.hasMore}
              onLoadMore={pagination?.onLoadMore}
            />
          </Box>
        </FlexBox>

        <Box className="ChatSidebar__status-section">
          {/* 크레딧 알림 */}
          {credit && (
            <>
              <Divider />
              <CreditAlert
                className="ChatSidebar__credit-section"
                used={credit.used}
                total={credit.total}
                exhaustedMessage={credit.exhaustedMessage}
              />
            </>
          )}

          {/* 사용자 프로필 */}
          {user && (
            <>
              <Divider />
              <UserProfile
                name={user.name}
                email={user.email}
                avatarUrl={user.avatarUrl}
              />
            </>
          )}
        </Box>
      </Drawer>
    </>
  );
}
