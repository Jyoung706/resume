// ============================================
// RightSidebar — 우측 사이드바 컴포넌트
// Design Layer: props 기반 (로직 없음)
// ============================================

import { useRef, useEffect } from "react";
import clsx from "clsx";
import {
  Box,
  FlexBox,
  Icon,
  IconButton,
  Tab,
  Tabs,
  Typography
} from "@/components";
import { RightSidebarPanel } from "./RightSidebarPanel";
import "../chat.parts.scss";

// ============================================
// 타입
// ============================================

import type { RightSidebarTab } from "@/logic/common/ui/types";
export type { RightSidebarTab };

export interface RightSidebarProps {
  activeTab: RightSidebarTab;
  isFullScreen?: boolean;
  onTabChange: (tab: RightSidebarTab) => void;
  onClose: () => void;
  onToggleFullScreen?: () => void;
}

// ============================================
// 탭 설정
// ============================================

const TAB_LABELS: Record<RightSidebarTab, string> = {
  grade: "등급 관리",
  help: "도움말",
  notice: "공지사항",
  settings: "환경설정",
  support: "고객센터",
  history: "채팅 이력",
  keywords: "키워드 선택",
  schema: "스키마 선택",
};

const TAB_ORDER: RightSidebarTab[] = [
  "grade",
  "help",
  "notice",
  "settings",
  "support",
  "history",
  "keywords",
  "schema",
];

// ============================================
// RightSidebar
// ============================================

export function RightSidebar({
  activeTab,
  isFullScreen,
  onTabChange,
  onClose,
  onToggleFullScreen,
}: RightSidebarProps) {
  // 마우스 클릭+드래그 스크롤
  const tabsRef = useRef<HTMLDivElement>(null);

  const attachDragScroll = (node: HTMLDivElement | null) => {
    tabsRef.current = node;
  };

  useEffect(() => {
    const container = tabsRef.current;
    if (!container) return;
    const scroller = container.querySelector<HTMLDivElement>(".MuiTabs-scroller");
    if (!scroller) return;

    let isDragging = false;
    let startX = 0;
    let scrollStart = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      startX = e.clientX;
      scrollStart = scroller.scrollLeft;
      scroller.style.cursor = "grabbing";
      scroller.style.userSelect = "none";
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      scroller.scrollLeft = scrollStart - (e.clientX - startX);
    };
    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      scroller.style.cursor = "";
      scroller.style.userSelect = "";
    };

    scroller.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      scroller.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return (
    <FlexBox
      className={clsx(
        "RightSidebar__container",
        isFullScreen && "RightSidebar__container--fullscreen"
      )}
    >
      {/* 헤더 */}
      <FlexBox className="RightSidebar__header">
        <Typography className="RightSidebar__title" noWrap>
          {TAB_LABELS[activeTab]}
        </Typography>
        <FlexBox className="RightSidebar__header-actions">
          {onToggleFullScreen && (
            <IconButton size="small" onClick={onToggleFullScreen}>
              {isFullScreen ? (
                // <FullscreenExitIcon className="RightSidebar__action-icon" />
                <Icon size="small" className="RightSidebar__action-icon">fullscreen_exit</Icon>
              ) : (
                // <FullscreenIcon className="RightSidebar__action-icon" />
                <Icon size="small" className="RightSidebar__action-icon">fullscreen</Icon>
              )}
            </IconButton>
          )}
          <IconButton size="small" onClick={onClose}>
            {/* <CloseIcon className="RightSidebar__action-icon" /> */}
            <Icon size="small" className="RightSidebar__action-icon">close</Icon>
          </IconButton>
        </FlexBox>
      </FlexBox>

      {/* 탭 메뉴 — MUI Tabs (scrollable) */}
      <Tabs
        ref={attachDragScroll}
        className="RightSidebar__tabs"
        value={activeTab}
        onChange={(_e, value: RightSidebarTab) => onTabChange(value)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
      >
        {TAB_ORDER.map((tab) => (
          <Tab
            key={tab}
            value={tab}
            label={TAB_LABELS[tab]}
            className="RightSidebar__tab"
          />
        ))}
      </Tabs>

      {/* 패널 콘텐츠 */}
      <Box className="RightSidebar__content Panel__container">
        <RightSidebarPanel tab={activeTab} />
      </Box>
    </FlexBox>
  );
}
