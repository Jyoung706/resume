/**
 * useChatLayout — 채팅 레이아웃 공유 상태 훅
 * 사이드바 collapse, 유저 정보, 크레딧, 로그아웃 등 관리
 * ChatConnector에서 추출
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/logic/common/auth/authStore";
import { useChatSessionStore } from "@/logic/common/chat/stores/chatSessionStore";
import { useQuestionCountStore } from "@/logic/common/chat/stores/questionCountStore";
import { useProfileImage } from "@/logic/common/profile/useProfileImage";
import { useBackgroundImage } from "@/logic/common/background/useBackgroundImage";
import { useRightSidebarStore } from "@/logic/common/ui/rightSidebarStore";
import { useSettingsStore, SETTINGS_SECTION, type SettingsSectionId } from "@/logic/common/ui/settingsStore";
import { useChatSession } from "@/logic/chat/main/useChatSession";

export function useChatLayout() {
  const selectedChatId = useChatSessionStore((s) => s.selectedChatId);
  const sessionsLoaded = useChatSessionStore((s) => s.sessionsLoaded);
  const navigate = useNavigate();

  // ── 사용자/프로필 ──
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const creditUsed = useQuestionCountStore((s) => s.used);
  const creditTotal = useQuestionCountStore((s) => s.total);
  const { profileImageUrl } = useProfileImage();
  const { backgroundImageUrl } = useBackgroundImage();

  // ── 우측 사이드바 ──
  const rs = useRightSidebarStore();

  // ── 세션 관리 ──
  const session = useChatSession();

  // ── 사이드바 collapse ──
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("chat_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("chat_sidebar_collapsed", String(next));
      } catch {
        /* noop */
      }
      return next;
    });
  };

  // ── 네비게이션 핸들러 ──
  const handleSessionChange = (_sessionId: string) => {
    navigate("/chat", { replace: true });
  };

  const handleLogoClick = () => {
    navigate("/chat");
  };

  const handleStatusItemClick = (type: string) => {
    const sectionMap: Record<string, string> = {
      db: SETTINGS_SECTION.DATABASE,
      model: SETTINGS_SECTION.LLM,
      rag: SETTINGS_SECTION.RAG,
    };
    const section = sectionMap[type];
    if (section) {
      useSettingsStore.setState({
        expandedSection: section as SettingsSectionId,
      });
    }
    rs.openPanel("settings");
  };

  // ── 초기 세션 로드 ──
  useEffect(() => {
    if (!selectedChatId && !sessionsLoaded) {
      useChatSessionStore.getState().loadChatList();
    }
  }, [selectedChatId, sessionsLoaded]);

  // ── 유저 정보 ──
  const selectedChat = session.chatItems.find((i) => i.id === selectedChatId);
  const hasMore = session.chatItems.length > session.maxDisplayCount;

  const userInfo = user
    ? {
        name: user.name || "사용자",
        email: user.email || undefined,
        avatarUrl: (profileImageUrl ||
          user.profileImage ||
          user.avatar ||
          undefined) as string | undefined,
      }
    : undefined;

  return {
    selectedChatId,
    session,
    sidebarCollapsed,
    toggleSidebar,
    handleSessionChange,
    handleLogoClick,
    handleStatusItemClick,
    selectedChat,
    hasMore,
    userInfo,
    creditUsed,
    creditTotal,
    logout,
    rs,
    backgroundImageUrl,
  };
}
