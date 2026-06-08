// ============================================
// ChatHeader — 채팅 헤더 컴포넌트
// Design Layer: props 기반 (로직 없음)
// CreamHeader 기준: 제목 + 우측 액션 버튼 그룹
//
// 메뉴 아이콘 + 드롭다운은 HeaderMenuActions로 분리
// ChatHeader 고유: 메뉴 토글, StatusBar, 접기/펼치기 토글
// ============================================

import type { StatusBarItem } from "@/components";
import {
  FlexBox,
  HeaderMenuActions,
  Icon,
  IconButton,
  StatusBar,
} from "@/components";
import { useState } from "react";
import type { RightSidebarTab } from "../RightSidebar";
import "../chat.parts.scss";

// ============================================
// Props
// ============================================

export interface ChatHeaderProps {
  title?: string;
  showMenuButton?: boolean;
  onMenuToggle?: () => void;
  onOpenPanel?: (tab: RightSidebarTab) => void;
  /** 서버 상태 표시 아이템 (DB, 모델, RAG) */
  statusItems?: StatusBarItem[];
  /** 상태 아이콘 클릭 핸들러 */
  onStatusItemClick?: (type: string) => void;
  /** 로그아웃 핸들러 */
  onLogout?: () => void;
  /** 읽지 않은 공지사항 수 */
  noticeUnreadCount?: number;
  /** 테마 토글 슬롯 — HeaderMenuActions 로 forward */
  themeToggleSlot?: React.ReactNode;
}

// ============================================
// ChatHeader
// ============================================

export function ChatHeader({
  title: _title = "새 채팅",
  showMenuButton,
  onMenuToggle,
  onOpenPanel,
  statusItems,
  onStatusItemClick,
  onLogout,
  noticeUnreadCount = 0,
  themeToggleSlot,
}: ChatHeaderProps) {
  const [actionsExpanded, setActionsExpanded] = useState(true);

  return (
    <FlexBox className="ChatHeader__container">
      {/* 좌측: 메뉴 + 제목 */}
      <FlexBox className="ChatHeader__left">
        {showMenuButton && (
          <IconButton
            size="small"
            onClick={onMenuToggle}
            className="ChatHeader__menu-btn"
          >
            <Icon mui className="ChatHeader__icon">MenuIcon</Icon>
          </IconButton>
        )}
        {/* <Typography className="ChatHeader__title">
          {title}
        </Typography> */}
      </FlexBox>

      {/* 우측: 상태바 + 액션 버튼 (접기/펼치기) */}
      <FlexBox className="ChatHeader__right">
        {onOpenPanel && (
          <FlexBox className="ChatHeader__actions">
            {/* 접기/펼치기 토글 버튼 */}
            <IconButton
              onClick={() => setActionsExpanded((p) => !p)}
              className="ChatHeader__toggle-btn"
            >
              {actionsExpanded ? (
                <Icon mui className="ChatHeader__icon">ChevronRightIcon</Icon>
              ) : (
                <Icon mui className="ChatHeader__icon">ChevronLeftIcon</Icon>
              )}
            </IconButton>

            {/* 상태바 + 액션 버튼 영역 (트랜지션) */}
            <FlexBox
              className={`ChatHeader__actions-group ${actionsExpanded ? "ChatHeader__actions-group--expanded" : "ChatHeader__actions-group--collapsed"}`}
            >
              {/* 서버 상태 표시 바 */}
              {statusItems && statusItems.length > 0 && (
                <StatusBar items={statusItems} onItemClick={onStatusItemClick} />
              )}

              {/* 메뉴 아이콘 + 드롭다운 (HeaderMenuActions) */}
              <HeaderMenuActions
                onOpenPanel={onOpenPanel}
                onLogout={onLogout}
                noticeUnreadCount={noticeUnreadCount}
                themeToggleSlot={themeToggleSlot}
              />
            </FlexBox>
          </FlexBox>
        )}
      </FlexBox>
    </FlexBox>
  );
}
