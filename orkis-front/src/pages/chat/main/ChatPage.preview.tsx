// ============================================
// ChatPage Preview — 디자인 미리보기
// 더미 데이터 + 로컬 상태로 UI 확인용
// ============================================

import { useState, useCallback } from "react";
import { ChatPage, type ChatMessageData } from "./ChatPage";
import type { ChatListItemData, RightSidebarTab } from "./parts";

// ============================================
// 더미 데이터
// ============================================

const DUMMY_CHATS: ChatListItemData[] = [
  { id: "1", title: "SQL 쿼리 최적화 방법", favorite: true, updatedAt: "2024-03-11T10:00:00" },
  { id: "2", title: "React 성능 개선", favorite: false, updatedAt: "2024-03-10T15:30:00" },
  { id: "3", title: "TypeScript 타입 가드", favorite: false, updatedAt: "2024-03-09T09:20:00" },
  { id: "4", title: "Docker 컨테이너 설정", favorite: true, updatedAt: "2024-03-08T14:00:00" },
  { id: "5", title: "Kubernetes 배포 전략", favorite: false, updatedAt: "2024-03-07T11:00:00" },
  { id: "6", title: "CI/CD 파이프라인 구축", favorite: false, updatedAt: "2024-03-06T16:00:00" },
  { id: "7", title: "GraphQL vs REST 비교", favorite: true, updatedAt: "2024-03-05T13:00:00" },
  { id: "8", title: "Redis 캐싱 전략", favorite: false, updatedAt: "2024-03-04T09:00:00" },
  { id: "9", title: "MongoDB 인덱스 설계", favorite: false, updatedAt: "2024-03-03T14:30:00" },
  { id: "10", title: "AWS Lambda 최적화", favorite: false, updatedAt: "2024-03-02T10:00:00" },
  { id: "11", title: "Next.js SSR 설정", favorite: false, updatedAt: "2024-03-01T08:00:00" },
  { id: "12", title: "Tailwind CSS 커스텀 설정", favorite: false, updatedAt: "2024-02-28T17:00:00" },
];

const DUMMY_MESSAGES: Record<string, ChatMessageData[]> = {
  "1": [
    { id: "m1", type: "user", content: "SQL 쿼리를 최적화하는 방법을 알려주세요.", timestamp: "2024-03-11T10:00:00" },
    { id: "m2", type: "assistant", content: "SQL 쿼리 최적화를 위한 주요 방법들을 안내해 드리겠습니다.\n\n1. **인덱스 활용**: WHERE, JOIN, ORDER BY에 사용되는 컬럼에 적절한 인덱스를 생성하세요.\n2. **SELECT 최소화**: SELECT * 대신 필요한 컬럼만 명시하세요.\n3. **서브쿼리 대신 JOIN**: 서브쿼리보다 JOIN이 일반적으로 더 효율적입니다.\n4. **EXPLAIN ANALYZE**: 실행 계획을 확인하여 병목 지점을 파악하세요.", timestamp: "2024-03-11T10:00:05", messageType: "general" },
    { id: "m3", type: "user", content: "인덱스를 너무 많이 만들면 문제가 되나요?", timestamp: "2024-03-11T10:01:00" },
    { id: "m4", type: "assistant", content: "네, 인덱스가 많으면 INSERT/UPDATE/DELETE 성능이 저하됩니다. 읽기와 쓰기 비율을 고려하여 적절히 설정하세요.", timestamp: "2024-03-11T10:01:05", messageType: "general" },
  ],
  "2": [
    { id: "m5", type: "user", content: "React 렌더링을 최적화하려면 어떻게 해야 하나요?", timestamp: "2024-03-10T15:30:00" },
    { id: "m6", type: "assistant", content: "React 렌더링 최적화 팁:\n\n- `React.memo`로 불필요한 리렌더링 방지\n- `useMemo`, `useCallback`으로 참조 안정성 확보\n- 가상화(Virtualization)로 긴 리스트 최적화", timestamp: "2024-03-10T15:30:05", messageType: "general" },
  ],
  "3": [
    { id: "m7", type: "user", content: "users 테이블에서 최근 가입한 사용자 10명을 보여줘", timestamp: "2024-03-09T09:20:00" },
    {
      id: "m8",
      type: "assistant",
      content: "최근 가입한 사용자 10명을 조회했습니다.",
      timestamp: "2024-03-09T09:20:05",
      messageType: "sql",
      chatType: "sql",
      processes: [
        { id: "s1", label: "질문 분석", status: "completed" },
        { id: "s2", label: "스키마 조회", status: "completed" },
        { id: "s3", label: "SQL 생성", status: "completed" },
        { id: "s4", label: "쿼리 실행", status: "completed" },
      ],
      result: {
        columns: ["id", "name", "email", "created_at"],
        data: [
          { id: 101, name: "홍길동", email: "hong@example.com", created_at: "2024-03-11" },
          { id: 100, name: "김영희", email: "kim@example.com", created_at: "2024-03-10" },
          { id: 99, name: "이철수", email: "lee@example.com", created_at: "2024-03-09" },
        ],
        query: "SELECT id, name, email, created_at FROM users ORDER BY created_at DESC LIMIT 10;",
        executionTime: 42,
      },
    },
  ],
};

// ============================================
// ChatPagePreview
// ============================================

export function ChatPagePreview() {
  const [chatItems, setChatItems] = useState(DUMMY_CHATS);
  const [selectedChatId, setSelectedChatId] = useState<string | null>("1");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [maxDisplayCount, setMaxDisplayCount] = useState(10);

  // 우측 사이드바 로컬 상태
  const [rsOpen, setRsOpen] = useState(false);
  const [rsMode] = useState<"resize" | "overlay">("overlay");
  const [rsTab, setRsTab] = useState<RightSidebarTab>("help");
  const [rsFullScreen, setRsFullScreen] = useState(false);

  const messages = selectedChatId ? (DUMMY_MESSAGES[selectedChatId] || []) : [];

  const handleNewChat = useCallback(() => {
    const newId = String(Date.now());
    const newChat: ChatListItemData = {
      id: newId,
      title: `새 채팅 ${chatItems.length + 1}`,
      favorite: false,
    };
    setChatItems((prev) => [newChat, ...prev]);
    setSelectedChatId(newId);
  }, [chatItems.length]);

  const handleDeleteChat = useCallback((id: string) => {
    setChatItems((prev) => prev.filter((c) => c.id !== id));
    if (selectedChatId === id) {
      setSelectedChatId(null);
    }
  }, [selectedChatId]);

  const handleToggleFavorite = useCallback((id: string) => {
    setChatItems((prev) =>
      prev.map((c) => (c.id === id ? { ...c, favorite: !c.favorite } : c))
    );
  }, []);

  const handleSend = useCallback(() => {
    if (inputValue.trim()) {
      alert(`메시지 전송: "${inputValue}"`);
      setInputValue("");
    }
  }, [inputValue]);

  return (
    <ChatPage
      chatItems={chatItems}
      selectedChatId={selectedChatId}
      isSidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={() => setSidebarCollapsed((p) => !p)}
      onSelectChat={setSelectedChatId}
      onNewChat={handleNewChat}
      onDeleteChat={handleDeleteChat}
      onRenameChat={(id, title) => {
        setChatItems((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title } : c))
        );
      }}
      onToggleFavorite={handleToggleFavorite}
      messages={messages}
      inputValue={inputValue}
      onInputChange={setInputValue}
      onSendMessage={handleSend}
      isSending={false}
      // 사이드바 추가 기능
      onLogoClick={() => alert("로고 클릭")}
      pagination={{
        maxDisplayCount,
        hasMore: chatItems.length > maxDisplayCount,
        onLoadMore: () => setMaxDisplayCount((p) => p + 10),
      }}
      credit={{ used: 12, total: 50 }}
      user={{ name: "사용자", email: "user@example.com" }}
      // 우측 사이드바
      rightSidebar={{
        isOpen: rsOpen,
        mode: rsMode,
        activeTab: rsTab,
        isFullScreen: rsFullScreen,
        onTabChange: setRsTab,
        onClose: () => { setRsOpen(false); setRsFullScreen(false); },
        onToggleFullScreen: () => setRsFullScreen((p) => !p),
      }}
      onOpenRightPanel={(tab) => { setRsTab(tab); setRsOpen(true); }}
    />
  );
}
