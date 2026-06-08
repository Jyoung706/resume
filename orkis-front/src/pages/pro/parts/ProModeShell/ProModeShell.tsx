// ============================================
// ProModeShell — Pro Mode 전체 레이아웃 셸
// TopBar + Body(좌측/중앙/우측) + StatusBar
// Design 컴포넌트: props-only, 상태관리 모름
// ============================================

import { type ReactNode } from "react";
import { FlexBox, Box, IconButton, Divider, Img, Icon, ResizeHandle, Typography } from "@/components";
import { useThemeModeContext } from "@/design-system";
import type { RightSidebarTab } from "@/logic/common/ui/types";
import "./ProModeShell.scss";

export interface ProRightSidebarState {
  isOpen: boolean;
  activeTab: RightSidebarTab;
  isFullScreen: boolean;
  onTabChange: (tab: RightSidebarTab) => void;
  onClose: () => void;
  onToggleFullScreen: () => void;
}

export interface ProModeShellProps {
  onGoToNormalMode?: () => void;
  onResetLayout?: () => void;
  onShowShortcuts?: () => void;
  onAddTab?: () => void;
  noticeUnreadCount?: number;
  statusBarContent?: ReactNode;
  leftSidebarContent?: ReactNode;
  isLeftCollapsed?: boolean;
  leftWidth?: number;
  onLeftResize?: (delta: number) => void;
  onLeftResizeEnd?: () => void;
  rightSidebar?: ProRightSidebarState;
  rightSidebarContent?: ReactNode;
  headerMenuActions?: ReactNode;
  children: ReactNode; // dockview
}

export function ProModeShell({
  onGoToNormalMode,
  onResetLayout,
  onShowShortcuts,
  onAddTab,
  statusBarContent,
  leftSidebarContent,
  isLeftCollapsed = false,
  leftWidth = 240,
  onLeftResize,
  onLeftResizeEnd,
  rightSidebar,
  rightSidebarContent,
  headerMenuActions,
  children,
}: ProModeShellProps) {
  
  const { resolvedMode } = useThemeModeContext();

  return (
    <FlexBox className="ProModeShell" direction="column">
      {/* TopBar */}
      <FlexBox className="ProModeShell__topbar" align="center" justify="space-between">
        <FlexBox className="ProModeShell__topbar-left" align="center" gap={0.5}>
          <FlexBox className="ProModeShell__logo-group" align="center" gap={0.25}>
            <Img
              className="ProModeShell__logo-img"
              src={resolvedMode === 'dark' ? '/assets/logo/orkis-symbol-dark.png' : '/assets/logo/orkis-symbol.png'}
              alt="ORKIS"
            />
            <Img
              className="ProModeShell__logo-text"
              src={resolvedMode === 'dark' ? '/assets/logo/orkis-text-dark.svg' : '/assets/logo/orkis-text.svg'}
              alt="ORKIS"
            />
          </FlexBox>
          <Typography component="span" className="ProModeShell__pro-badge">Pro</Typography>
        </FlexBox>
        <FlexBox className="ProModeShell__topbar-right" align="center" gap={0.5}>
          {onAddTab && (
            <IconButton onClick={onAddTab} title="새 쿼리 탭" size="small">
              <Icon>add</Icon>
            </IconButton>
          )}
          <Divider orientation="vertical" flexItem />
          {headerMenuActions}
          <Divider orientation="vertical" flexItem />
          {onResetLayout && (
            <IconButton onClick={onResetLayout} title="레이아웃 초기화" size="small">
              <Icon>dashboard</Icon>
            </IconButton>
          )}
          {onShowShortcuts && (
            <IconButton onClick={onShowShortcuts} title="단축키 도움말 (Ctrl+Shift+/)" size="small">
              <Icon>keyboard</Icon>
            </IconButton>
          )}
          {onGoToNormalMode && (
            <IconButton onClick={onGoToNormalMode} title="일반 모드 전환" size="small">
              <Icon>exit_to_app</Icon>
            </IconButton>
          )}
        </FlexBox>
      </FlexBox>

      {/* Body: 좌측 + 중앙(dockview) + 우측 */}
      <FlexBox className="ProModeShell__body">
        {/* 좌측 사이드바 */}
        <Box
          className="ProModeShell__left"
          width={isLeftCollapsed ? 44 : leftWidth}
        >
          {leftSidebarContent}
        </Box>

        {/* 좌측 리사이즈 핸들 */}
        {!isLeftCollapsed && onLeftResize && (
          <ResizeHandle
            direction="horizontal"
            onResize={onLeftResize}
            onResizeEnd={onLeftResizeEnd}
            className="ProModeShell__resize-handle"
          />
        )}

        {/* 중앙 dockview */}
        <Box className="ProModeShell__center">{children}</Box>

        {/* 우측 RightSidebar (overlay) */}
        {rightSidebar?.isOpen && rightSidebarContent && (
          <Box
            className={`ProModeShell__right ${rightSidebar.isFullScreen ? "ProModeShell__right--fullscreen" : ""}`}
          >
            {rightSidebarContent}
          </Box>
        )}
      </FlexBox>

      {/* StatusBar */}
      <Box className="ProModeShell__statusbar">{statusBarContent}</Box>
    </FlexBox>
  );
}
