// ============================================
// NoticePanelConnector — 공지사항 커넥터
// Logic(useNoticePanel) <-> Design(NoticePanel) 접착
// ============================================

import { NoticePanel } from "@/pages/chat/panels/notice/NoticePanel";
import { useNoticePanel } from "@/logic/chat/panels/notice";

export function NoticePanelConnector() {
  const panel = useNoticePanel();

  return (
    <NoticePanel
      notices={panel.notices}
      expandedId={panel.expandedId}
      loading={panel.loading}
      onToggleExpand={panel.onToggleExpand}
    />
  );
}
