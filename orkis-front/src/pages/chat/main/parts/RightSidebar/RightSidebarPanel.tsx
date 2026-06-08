// ============================================
// RightSidebarPanel — 우측 사이드바 패널 콘텐츠
// Design Layer: props 기반 (로직 없음)
// 탭별 패널 컴포넌트를 렌더링
// ============================================

import clsx from "clsx";
import { Box } from "@/components";
import { SectionErrorBoundary } from "@/components/ui/ErrorFallback";
import type { RightSidebarTab } from "./RightSidebar";
import {
  GradePanel,
  HelpPanel,
  NoticePanel,
  SettingsPanel,
  SupportPanel,
  HistoryPanel,
  KeywordsPanel,
  SchemaPanel,
} from "../../../panels";
import "../chat.parts.scss";

// ============================================
// 탭 → 패널 매핑
// ============================================

const PANEL_MAP: Record<RightSidebarTab, React.FC> = {
  grade: GradePanel,
  help: HelpPanel,
  notice: NoticePanel,
  settings: SettingsPanel,
  support: SupportPanel,
  history: HistoryPanel,
  keywords: KeywordsPanel,
  schema: SchemaPanel,
};

// ============================================
// RightSidebarPanel
// ============================================

export function RightSidebarPanel({ tab, className }: { tab: RightSidebarTab; className?: string }) {
  const PanelComponent = PANEL_MAP[tab];
  return (
    <Box className={clsx("RightSidebarPanel", className)}>
      <SectionErrorBoundary
        name={`right-sidebar-${tab}`}
        message="패널을 불러올 수 없습니다."
        minHeight={200}
        resetKeys={[tab]}
      >
        <PanelComponent />
      </SectionErrorBoundary>
    </Box>
  );
}
