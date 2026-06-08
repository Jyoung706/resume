/**
 * ChatConnector — Logic <-> Design 접착 계층
 * 소유 훅: useChatLayout, useHealthStatusIcons, useRagPollingInit
 *
 * 구조:
 *   ChatConnector (공유 상태: 사이드바, 헤더, 우측 사이드바, 배경 등)
 *     └─ ChatLayout (공유 영역 렌더)
 *          └─ ChatInstanceManager (Activity 전환)
 *               └─ ChatContentConnector (세션별: 메시지, 입력, Welcome, Menu/Dialog)
 *
 * health 폴링 (2026-05-22, panel-decisions D2 = 변형 A):
 *   useHealthStatusIcons 가 useHealthPolling 을 내장 — 1Hz tick + sessionStorage 카운트로
 *   매 N(=5)번째 tick 에서만 /health/status 호출. 나머지는 sessionStorage 캐시 재방출.
 */
import { useEffect } from "react";
import { ChatInstanceManager } from "@/pages/chat/main/parts/ChatInstanceManager";
import { ChatLayout } from "@/pages/chat/main";
import { chatConfig } from "@/logic/shared/config/chatConfig";
import { useHealthStatusIcons } from "@/logic/common/health/useHealthStatusIcons";
import { useRagPollingInit } from "@/logic/common/rag/useRagPollingInit";
import { useRagPollingStore } from "@/logic/common/rag/ragPollingStore";
import { useChatLayout } from "@/logic/chat/main/useChatLayout";
import { useDbSelectionStore } from "@/logic/common/db/dbSelectionStore";
import { useLlmModelStore } from "@/logic/common/llm/llmModelStore";
import { useNoticeStore } from "@/logic/common/notice";
import { ChatContentConnector } from "./ChatContentConnector";
import { SqlViewModalConnector } from "./SqlViewModalConnector";
import { DataViewModalConnector } from "./DataViewModalConnector";
import { SectionErrorBoundary } from "@/components/ui/ErrorFallback";
import { ThemeToggleConnector } from "@/connectors/common/ThemeToggleConnector";

// ============================================
// ChatConnector — 메인 커넥터 (공유 상태 관리)
// ============================================

const UNREAD_POLL_INTERVAL = 60_000;

export function ChatConnector() {
  const layout = useChatLayout();

  // 선택된 DB / 모델 — useHealthStatusIcons 의 입력 파라미터
  const selectedDbConnection = useDbSelectionStore((s) => s.selectedDbConnection);
  const selectedModel = useLlmModelStore((s) => s.selectedModel);
  const defaultModel = useLlmModelStore((s) => s.defaultModel);
  const currentModel = selectedModel ?? defaultModel;

  // RAG 전처리 활성 여부 — checks.db / checks.rag 결정에 사용 (panel-domain-checks, 2026-05-22)
  const isRagPollingActive = useRagPollingStore((s) => s.isRagPollingActive);

  // 도메인별 명시 check 플래그 (front 가 의도를 표명, backend 가 그대로 실행):
  //   - DB 미선택 또는 RAG 전처리 중: DB check 안 함
  //   - 모델 미선택: LLM check 안 함
  //   - RAG 전처리 중: server_health SELECT skip (RAG/llm.aiServerStatus 도 null)
  //     단 RAG 아이콘은 ragPollingStore 가 독립 표시 (orange).
  const checks = {
    db: !!selectedDbConnection && !isRagPollingActive,
    llm: !!currentModel,
    rag: !isRagPollingActive
  };

  // rev7 wire 기반 헬스 폴링 + 액션 아이콘 매핑 (panel-decisions D2 = 변형 A)
  const { allStatuses } = useHealthStatusIcons({
    dbId: selectedDbConnection?.connectionId ?? null,
    modelId: currentModel?.id ?? null,
    checks
  });

  const unreadCount = useNoticeStore((s) => s.unreadCount);
  const loadUnreadCount = useNoticeStore((s) => s.loadUnreadCount);

  // ── 앱 레벨 초기화 (1회만) ──
  useRagPollingInit();

  // ── 공지사항 미읽은 수 폴링 (60초) ──
  useEffect(() => {
    loadUnreadCount();
    const timer = setInterval(loadUnreadCount, UNREAD_POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [loadUnreadCount]);

  return (
    <>
    <ChatLayout
      chatItems={layout.session.chatItems}
      selectedChatId={layout.selectedChatId}
      isSidebarCollapsed={layout.sidebarCollapsed}
      isSessionsLoading={layout.session.isLoading}
      onToggleSidebar={layout.toggleSidebar}
      onSelectChat={(id) => {
        layout.session.selectChat(id);
        layout.handleSessionChange(id);
      }}
      onNewChat={async () => {
        try {
          const item = await layout.session.createNewChat();
          if (item) layout.handleSessionChange(item.id);
        } finally {
          layout.session.setCreatingChatComplete();
        }
      }}
      isCreatingChat={layout.session.isCreatingChat}
      onDeleteChat={layout.session.deleteChat}
      onRenameChat={layout.session.updateChatTitle}
      onToggleFavorite={layout.session.toggleFavorite}
      onLogoClick={layout.handleLogoClick}
      pagination={{
        maxDisplayCount: layout.session.maxDisplayCount,
        hasMore: layout.hasMore,
        onLoadMore: layout.session.loadMore,
      }}
      credit={{
        used: layout.creditUsed,
        total: layout.creditTotal,
        exhaustedMessage:
          layout.creditUsed >= layout.creditTotal
            ? "크레딧이 소진되었습니다."
            : undefined,
      }}
      user={layout.userInfo}
      chatTitle={layout.selectedChat?.title ?? "새 채팅"}
      onOpenRightPanel={layout.rs.openPanel}
      statusItems={allStatuses}
      onStatusItemClick={layout.handleStatusItemClick}
      onLogout={layout.logout}
      rightSidebar={{
        isOpen: layout.rs.isOpen,
        mode: layout.rs.mode,
        activeTab: layout.rs.activeTab,
        isFullScreen: layout.rs.isFullScreen,
        onTabChange: layout.rs.setActiveTab,
        onClose: layout.rs.closePanel,
        onToggleFullScreen: layout.rs.toggleFullScreen,
      }}
      noticeUnreadCount={unreadCount}
      themeToggleSlot={<ThemeToggleConnector />}
      backgroundImage={layout.backgroundImageUrl}
    >
      {/* Activity로 전환되는 영역: 메시지 + 입력 + Menu/Dialog */}
      <ChatInstanceManager
        selectedSessionId={layout.selectedChatId}
        maxInstances={chatConfig.instance.maxInstances}
        renderInstance={(sessionId) => (
          <SectionErrorBoundary
            name="chat-content"
            message="채팅 영역을 불러올 수 없습니다."
            minHeight="60vh"
            resetKeys={[sessionId]}
          >
            <ChatContentConnector
              sessionId={sessionId}
              onSessionChange={layout.handleSessionChange}
              userInfo={layout.userInfo}
            />
          </SectionErrorBoundary>
        )}
      />
    </ChatLayout>
    <SectionErrorBoundary name="sql-view-modal" message="SQL 뷰를 표시할 수 없습니다.">
      <SqlViewModalConnector />
    </SectionErrorBoundary>
    <SectionErrorBoundary name="data-view-modal" message="데이터 뷰를 표시할 수 없습니다.">
      <DataViewModalConnector />
    </SectionErrorBoundary>
    </>
  );
}
