// ============================================
// HeaderMenuActions — 헤더 메뉴 아이콘 + 드롭다운
// Design Layer: props 기반 (로직 없음)
//
// ChatHeader에서 추출한 메뉴 영역:
//   🔔 공지 (Badge) + ❓ 도움말 + ⋮ 더보기 드롭다운
// Pro Mode TopBar, 일반 ChatHeader 양쪽에서 재사용
// ============================================

import { useRef, useState } from "react";
import {
  Badge,
  Box,
  Divider,
  FlexBox,
  Icon,
  IconButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
} from "@/components";
import type { RightSidebarTab } from "@/logic/common/ui/types";
import "./HeaderMenuActions.scss";

// ============================================
// 더보기 메뉴 항목
// ============================================

const MORE_MENU_ITEMS: {
  tab: RightSidebarTab;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    tab: "grade",
    label: "등급 관리",
    icon: <Icon mui className="HeaderMenuActions__menu-icon">GradeOutlinedIcon</Icon>,
  },
  {
    tab: "help",
    label: "도움말",
    icon: <Icon mui className="HeaderMenuActions__menu-icon">HelpOutlineIcon</Icon>,
  },
  {
    tab: "notice",
    label: "공지사항",
    icon: <Icon mui className="HeaderMenuActions__menu-icon">NotificationsNoneIcon</Icon>,
  },
  {
    tab: "settings",
    label: "환경설정",
    icon: <Icon mui className="HeaderMenuActions__menu-icon">SettingsIcon</Icon>,
  },
  {
    tab: "support",
    label: "고객센터",
    icon: <Icon mui className="HeaderMenuActions__menu-icon">SupportAgentIcon</Icon>,
  },
  {
    tab: "history",
    label: "채팅 이력",
    icon: <Icon mui className="HeaderMenuActions__menu-icon">HistoryIcon</Icon>,
  },
  {
    tab: "keywords",
    label: "키워드 선택",
    icon: <Icon mui className="HeaderMenuActions__menu-icon">LabelIcon</Icon>,
  },
  {
    tab: "schema",
    label: "스키마 선택",
    icon: <Icon mui className="HeaderMenuActions__menu-icon">StorageIcon</Icon>,
  },
];

// ============================================
// Props
// ============================================

export interface HeaderMenuActionsProps {
  /** 메뉴 항목 클릭 시 (탭 열기) */
  onOpenPanel?: (tab: RightSidebarTab) => void;
  /** 로그아웃 핸들러 */
  onLogout?: () => void;
  /** 읽지 않은 공지사항 수 */
  noticeUnreadCount?: number;
  /** 테마 토글 슬롯 (라이트/다크 IconButton) — 공지/도움말 사이에 렌더 */
  themeToggleSlot?: React.ReactNode;
}

// ============================================
// HeaderMenuActions
// ============================================

export function HeaderMenuActions({
  onOpenPanel,
  onLogout,
  noticeUnreadCount = 0,
  themeToggleSlot,
}: HeaderMenuActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleMenuItemClick = (tab: RightSidebarTab) => {
    setMenuOpen(false);
    onOpenPanel?.(tab);
  };

  return (
    <FlexBox ref={menuRef} className="HeaderMenuActions__actions">
      {/* 공지사항 (Badge) */}
      <IconButton onClick={() => onOpenPanel?.("notice")}>
        <Badge
          badgeContent={noticeUnreadCount}
          color="error"
          max={99}
          invisible={noticeUnreadCount <= 0}
        >
          <Icon mui className="HeaderMenuActions__icon">NotificationsNoneIcon</Icon>
        </Badge>
      </IconButton>

      {/* 테마 토글 (라이트 ↔ 다크) */}
      {themeToggleSlot}

      {/* 도움말 */}
      <IconButton onClick={() => onOpenPanel?.("help")}>
        <Icon mui className="HeaderMenuActions__icon">HelpOutlineIcon</Icon>
      </IconButton>

      {/* 더보기 */}
      <IconButton onClick={() => setMenuOpen((p) => !p)}>
        <Icon mui className="HeaderMenuActions__icon">MoreVertIcon</Icon>
      </IconButton>

      {/* 더보기 드롭다운 메뉴 */}
      {menuOpen && (
        <>
          <Box
            className="HeaderMenuActions__overlay"
            onClick={() => setMenuOpen(false)}
          />
          <Paper
            shadow="dropdown"
            rounded="lg"
            className="HeaderMenuActions__dropdown"
          >
            {MORE_MENU_ITEMS.map((item) => (
              <MenuItem
                key={item.tab}
                onClick={() => handleMenuItemClick(item.tab)}
                className="HeaderMenuActions__menu-item"
              >
                <ListItemIcon className="HeaderMenuActions__menu-item-icon">
                  {item.icon}
                </ListItemIcon>
                <ListItemText>{item.label}</ListItemText>
              </MenuItem>
            ))}

            {/* 로그아웃 */}
            {onLogout && (
              <>
                <Divider className="HeaderMenuActions__menu-divider" />
                <MenuItem
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                  className="HeaderMenuActions__menu-item HeaderMenuActions__menu-item--logout"
                >
                  <ListItemIcon className="HeaderMenuActions__menu-item-icon">
                    <Icon mui className="HeaderMenuActions__menu-icon">LogoutIcon</Icon>
                  </ListItemIcon>
                  <ListItemText>로그아웃</ListItemText>
                </MenuItem>
              </>
            )}
          </Paper>
        </>
      )}
    </FlexBox>
  );
}
