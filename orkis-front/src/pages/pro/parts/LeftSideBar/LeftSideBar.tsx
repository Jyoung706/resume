// ============================================
// LeftSideBar — 좌측 사이드바 (아이콘 레일 + 패널 콘텐츠)
// Design 컴포넌트: props-only
// ============================================

import { type ReactNode } from "react";
import clsx from "clsx";
import { FlexBox, Box, IconButton, Icon } from "@/components";
import type { SideBarPanel } from "@/logic/common/pro/types/proMode.types";
import "./LeftSideBar.scss";

const PANELS: Array<{ id: SideBarPanel; icon: string; label: string }> = [
  { id: "chat", icon: "smart_toy", label: "AI 채팅" },
  { id: "schema", icon: "table_chart", label: "스키마 브라우저" },
  { id: "history", icon: "history", label: "히스토리" },
  { id: "snippets", icon: "content_paste", label: "쿼리 스니펫" },
];

export interface LeftSideBarProps {
  activePanel: SideBarPanel;
  isCollapsed: boolean;
  onPanelChange: (panel: SideBarPanel) => void;
  chatContent?: ReactNode;
  schemaContent?: ReactNode;
  historyContent?: ReactNode;
  snippetsContent?: ReactNode;
}

export function LeftSideBar({
  activePanel,
  isCollapsed,
  onPanelChange,
  chatContent,
  schemaContent,
  historyContent,
  snippetsContent,
}: LeftSideBarProps) {
  return (
    <FlexBox className="LeftSideBar" direction="row">
      {/* 아이콘 레일 */}
      <FlexBox className="LeftSideBar__rail" direction="column" align="center">
        {PANELS.map((panel) => (
          <IconButton
            key={panel.id}
            className={`LeftSideBar__rail-btn ${activePanel === panel.id && !isCollapsed ? "LeftSideBar__rail-btn--active" : ""}`}
            onClick={() => onPanelChange(panel.id)}
            title={panel.label}
            size="small"
          >
            <Icon>{panel.icon}</Icon>
          </IconButton>
        ))}
      </FlexBox>

      {/* 패널 콘텐츠 — display:none으로 마운트 유지 (스트리밍 중단 방지) */}
      <Box
        className={clsx(
          "LeftSideBar__content",
          isCollapsed && "LeftSideBar__content--hidden",
        )}
      >
        {activePanel === "chat" && chatContent}
        {activePanel === "schema" && schemaContent}
        {activePanel === "history" && historyContent}
        {activePanel === "snippets" && snippetsContent}
      </Box>
    </FlexBox>
  );
}
