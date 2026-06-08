// ============================================
// 채팅 페이지 — props 기반 Design 컴포넌트 (3분리 구조)
// Design Layer: props만 받아서 렌더링 (로직 없음)
//
// ChatLayout  — 공유 프레임 (사이드바 + 헤더 + 우측 사이드바 + children)
// ChatContent — Activity 내부 (메시지 + 입력 + Welcome)
// ChatPage    — 하위 호환용 (ChatLayout + ChatContent 합성)
// ============================================

import { useRef, useLayoutEffect, useState, type ReactNode } from "react";
import {
  Box,
  Button,
  Container,
  FlexBox,
  FloatingNewChatButton,
  PageLoading,
  Paper,
  Stack,
  VirtualMessageList,
  type VirtualMessageListHandle,
} from "@/components";
import type { StatusBarItem } from "@/components";
import {
  ChatHeader,
  ChatInput,
  ChatMessage,
  ChatSidebar,
  ChatWelcome,
  KeywordSelector,
  SchemaSelector,
  RightSidebar,
  type ChatListItemData,
  type ChatInputToolbarProps,
  type KeywordSelectorProps,
  type SchemaSelectorProps,
  type ProcessStepData,
  type RecommendedQuestionItem,
  type RecommendedKeywordItem,
  type RightSidebarTab,
  type SqlResultTableProps
} from "./parts";
import "./ChatPage.scss";
import clsx from "clsx";

// ============================================
// 메시지 데이터 타입 (Design Layer 전용)
// ============================================

export interface ChatMessageData {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp?: string;
  messageType?: "general" | "sql" | "waiting_status" | "error" | "warning";
  isStreaming?: boolean;
  isStopped?: boolean;
  /**
   * isStopped 종료 사유 — 문구 분기 용.
   * "user": 사용자 명시 정지 (기본 "사용자에 의해 중지" 문구)
   * "incomplete": race 패배로 9000 archived 됐으나 본문 없음 (별도 "응답 미완료" 문구)
   */
  stoppedReason?: "user" | "incomplete";
  chatType?: "sql" | "general";
  processes?: ProcessStepData[];
  result?: SqlResultTableProps | null;
  /** 전체 행 건수 */
  totalRowCount?: number;
  /** 메시지 출처 (realtime: SSE 실시간, loaded: API 로드) */
  source?: "realtime" | "loaded" | "cached";
  /** SQL 보기 클릭 */
  onSqlView?: () => void;
  /** DATA 더보기 클릭 */
  onDataMore?: () => void;
  /** CSV 다운로드 클릭 */
  onCsvDownload?: () => void;
}

// ============================================
// 우측 사이드바 Props
// ============================================

export interface RightSidebarState {
  isOpen: boolean;
  mode: "resize" | "overlay";
  activeTab: RightSidebarTab;
  isFullScreen?: boolean;
  onTabChange: (tab: RightSidebarTab) => void;
  onClose: () => void;
  onToggleFullScreen?: () => void;
}

// ============================================
// ChatLayout Props — 공유 프레임
// ============================================

export interface ChatLayoutProps {
  // ── 좌측 사이드바: 채팅 목록 ──
  chatItems: ChatListItemData[];
  selectedChatId?: string | null;
  isSidebarCollapsed: boolean;
  isSessionsLoading?: boolean;
  onToggleSidebar: () => void;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  isCreatingChat?: boolean;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, title: string) => void;
  onToggleFavorite: (id: string) => void;

  // ── 좌측 사이드바: 부가 기능 ──
  onLogoClick?: () => void;
  pagination?: {
    maxDisplayCount?: number;
    hasMore?: boolean;
    onLoadMore?: () => void;
  };
  credit?: {
    used: number;
    total: number;
    exhaustedMessage?: string;
  };

  // ── 사용자 정보 ──
  user?: { name: string; email?: string; avatarUrl?: string };

  // ── 헤더 ──
  chatTitle?: string;
  onOpenRightPanel?: (tab: RightSidebarTab) => void;
  statusItems?: StatusBarItem[];
  onStatusItemClick?: (type: string) => void;
  onLogout?: () => void;
  /** 읽지 않은 공지사항 수 (헤더 배지) */
  noticeUnreadCount?: number;
  /** 테마 토글 슬롯 — ChatHeader → HeaderMenuActions 로 forward */
  themeToggleSlot?: ReactNode;

  // ── 우측 사이드바 ──
  rightSidebar?: RightSidebarState;

  // ── 배경 ──
  backgroundImage?: string | null;

  // ── children (Activity 영역) ──
  children?: ReactNode;
}

// ============================================
// ChatContent Props — Activity 내부 (메시지 + 입력 + Welcome)
// ============================================

export interface ChatContentProps {
  // ── 메시지 ──
  messages: ChatMessageData[];
  isLoadingMessages?: boolean;
  /** 메시지 최초 로드 완료 여부 (Welcome flash 방지) */
  isMessagesInitialized?: boolean;
  /**
   * 메시지 존재 여부 (non-deferred 원본 기준).
   * messages가 useDeferredValue로 지연될 때 Welcome flash를 막기 위해 별도 전달.
   * 생략 시 messages.length > 0로 폴백.
   */
  hasMessages?: boolean;

  // ── 입력 ──
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onStopStreaming?: () => void;
  isSending?: boolean;
  selectedChatId?: string | null;
  inputToolbar?: ChatInputToolbarProps;

  // ── 키워드 선택 바 (입력창 상단) ──
  keywordSelector?: Omit<KeywordSelectorProps, "onDropdownClick">;
  onKeywordDropdownClick?: (event: React.MouseEvent<HTMLElement>) => void;

  // ── 스키마 선택 바 (입력창 상단) ──
  schemaSelector?: Omit<SchemaSelectorProps, "onDropdownClick">;
  onSchemaDropdownClick?: (event: React.MouseEvent<HTMLElement>) => void;

  // ── 사용자 정보 (아바타) ──
  user?: { name: string; email?: string; avatarUrl?: string };

  // ── Welcome 페이지 ──
  welcomeQuestions?: RecommendedQuestionItem[];
  welcomeQuestionsLoading?: boolean;
  onWelcomeQuestionClick?: (question: string) => void;
  welcomeKeywords?: RecommendedKeywordItem[];
  welcomeKeywordsLoading?: boolean;
  onWelcomeKeywordClick?: (keyword: RecommendedKeywordItem) => void;

  // ── [v2.2 Phase 4.7] 지난 대화 더 보기 ──
  hasOlderMessages?: boolean;
  isLoadingOlderMessages?: boolean;
  loadOlderMessagesError?: string | null;
  onLoadOlderMessages?: () => void;
}

// ============================================
// ChatLayout — 공유 프레임 (사이드바 + 헤더 + 우측 사이드바)
// ============================================

export function ChatLayout({
  chatItems,
  selectedChatId,
  isSidebarCollapsed,
  isSessionsLoading,
  onToggleSidebar,
  onSelectChat,
  onNewChat,
  isCreatingChat,
  onDeleteChat,
  onRenameChat,
  onToggleFavorite,
  onLogoClick,
  pagination,
  credit,
  user,
  chatTitle,
  onOpenRightPanel,
  statusItems,
  onStatusItemClick,
  onLogout,
  noticeUnreadCount,
  themeToggleSlot,
  rightSidebar,
  backgroundImage,
  children,
}: ChatLayoutProps) {
  const isRightOpen = rightSidebar?.isOpen ?? false;
  const isResize =
    isRightOpen &&
    rightSidebar?.mode === "resize" &&
    !rightSidebar?.isFullScreen;
  const isOverlay =
    isRightOpen &&
    (rightSidebar?.mode === "overlay" || rightSidebar?.isFullScreen);

  return (
    <FlexBox className="ChatPage__root">
      {/* 좌측 사이드바 */}
      <ChatSidebar
        chatList={chatItems}
        selectedChatId={selectedChatId}
        isCollapsed={isSidebarCollapsed}
        isLoading={isSessionsLoading}
        user={user}
        onToggleCollapse={onToggleSidebar}
        onSelectChat={onSelectChat}
        onNewChat={onNewChat}
        isCreatingChat={isCreatingChat}
        onDeleteChat={onDeleteChat}
        onRenameChat={onRenameChat}
        onToggleFavorite={onToggleFavorite}
        onLogoClick={onLogoClick}
        pagination={pagination}
        credit={credit}
      />

      {/* 메인 + 우측 사이드바 (resize) 컨테이너 */}
      <FlexBox
        className={clsx(
          "ChatPage__content",
          !isSidebarCollapsed && "ChatPage__content--sidebar-open"
        )}
      >
        {/* 메인 영역 */}
        <Stack
          className={clsx("ChatPage__main", backgroundImage && "ChatPage__main--has-bg")}
          style={backgroundImage ? {
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          } : undefined}
        >
          {/* 헤더 — 사이드바 접힘 시 플로팅 헤더 공간 확보 */}
          <Box
            className={clsx(
              "ChatPage__header-wrapper",
              isSidebarCollapsed && "ChatPage__header--collapsed"
            )}
          >
            <ChatHeader
              title={chatTitle ?? "새 채팅"}
              onOpenPanel={onOpenRightPanel}
              statusItems={statusItems}
              onStatusItemClick={onStatusItemClick}
              onLogout={onLogout}
              noticeUnreadCount={noticeUnreadCount}
              themeToggleSlot={themeToggleSlot}
            />
          </Box>

          {/* Activity 영역 (children) */}
          {children}
        </Stack>

        {/* 우측 사이드바 — resize 모드 */}
        {isResize && rightSidebar && (
          <RightSidebar
            activeTab={rightSidebar.activeTab}
            isFullScreen={false}
            onTabChange={rightSidebar.onTabChange}
            onClose={rightSidebar.onClose}
            onToggleFullScreen={rightSidebar.onToggleFullScreen}
          />
        )}
      </FlexBox>

      {/* 우측 사이드바 — overlay / fullscreen 모드 */}
      {isOverlay && rightSidebar && (
        <Paper
          className={clsx(
            "ChatPage__overlay",
            rightSidebar.isFullScreen && "ChatPage__overlay--fullscreen"
          )}
          elevation={0}
          style={
            rightSidebar.isFullScreen
              ? { '--sidebar-width': isSidebarCollapsed ? '3.5rem' : '15rem' } as React.CSSProperties
              : undefined
          }
        >
          <RightSidebar
            activeTab={rightSidebar.activeTab}
            isFullScreen={rightSidebar.isFullScreen}
            onTabChange={rightSidebar.onTabChange}
            onClose={rightSidebar.onClose}
            onToggleFullScreen={rightSidebar.onToggleFullScreen}
          />
        </Paper>
      )}

      {/* 플로팅 새 채팅 버튼 — 1280px 이하에서만 body.mo-reWrap 셀렉터로 표시 */}
      <FloatingNewChatButton
        onClick={onNewChat}
        isCreating={isCreatingChat}
      />
    </FlexBox>
  );
}

// ============================================
// ChatContent — Activity 내부 (메시지 + 입력 + Welcome)
// ============================================

export function ChatContent({
  messages,
  isLoadingMessages,
  isMessagesInitialized,
  hasMessages: hasMessagesProp,
  inputValue,
  onInputChange,
  onSendMessage,
  onStopStreaming,
  isSending,
  selectedChatId,
  inputToolbar,
  keywordSelector,
  onKeywordDropdownClick,
  schemaSelector,
  onSchemaDropdownClick,
  user,
  welcomeQuestions,
  welcomeQuestionsLoading,
  onWelcomeQuestionClick,
  welcomeKeywords,
  welcomeKeywordsLoading,
  onWelcomeKeywordClick,
  hasOlderMessages,
  isLoadingOlderMessages,
  loadOlderMessagesError,
  onLoadOlderMessages,
}: ChatContentProps) {
  // hasMessages: 커넥터에서 non-deferred 값으로 계산해 넘겨주면 그 값을 우선 사용한다.
  // useDeferredValue로 인해 messages가 지연될 때 Welcome flash가 발생하는 것을 방지.
  const hasMessages = hasMessagesProp ?? messages.length > 0;

  const showWelcome =
    isMessagesInitialized === true && !hasMessages && !isLoadingMessages;
  const showLoading = messages.length === 0 && !showWelcome;
  const showMessages = !showLoading && !showWelcome;

  // 메시지 전송 시 강제 하단 스크롤 — Virtuoso ref 명령형 호출
  const virtualRef = useRef<VirtualMessageListHandle>(null);
  const prevSendingRef = useRef(false);
  useLayoutEffect(() => {
    if (isSending && !prevSendingRef.current) {
      virtualRef.current?.scrollToBottom("auto");
    }
    prevSendingRef.current = !!isSending;
  }, [isSending]);

  // 가상화 영역의 스크롤 컨테이너로 외부 .ChatPage__messages 를 사용.
  // 기존 SCSS(overflow:auto) 의 스크롤바 위치/배경/패딩을 그대로 유지.
  const [scrollParent, setScrollParent] = useState<HTMLDivElement | null>(null);

  // 스트리밍 중 SSE 토큰마다 자동 하단 follow — customScrollParent 모드에서
  // followOutput="auto" 가 isAtBottom 계산이 부정확해 작동하지 않는 한계를 명령형 호출로 보완.
  // 사용자가 위로 멀리 스크롤한 상태에서는 침해되지 않도록 600px 이내일 때만 호출.
  useLayoutEffect(() => {
    if (!isSending) return;
    if (!scrollParent) return;
    const distFromBottom =
      scrollParent.scrollHeight - scrollParent.scrollTop - scrollParent.clientHeight;
    if (distFromBottom < 600) {
      virtualRef.current?.scrollToBottom("auto");
    }
  }, [messages, isSending, scrollParent]);

  return (
    <>
      {/* 메시지 영역 */}
      <Box ref={setScrollParent} className="ChatPage__messages">
        {showLoading && <PageLoading />}

        {showWelcome && (
          <ChatWelcome
            questions={welcomeQuestions ?? []}
            questionsLoading={welcomeQuestionsLoading}
            onQuestionClick={onWelcomeQuestionClick}
            keywords={welcomeKeywords ?? []}
            keywordsLoading={welcomeKeywordsLoading}
            onKeywordClick={onWelcomeKeywordClick}
          />
        )}

        {/* "지난 대화 더 보기" — VirtualMessageList 외부 형제 노드.
            (Virtuoso 의 components.Header 는 매 렌더 새 함수가 되어 unmount/remount
            반복 → 클릭 핸들러가 경합으로 무시되는 문제. 외부 배치로 안정화.) */}
        {showMessages && hasOlderMessages && (
          <FlexBox
            className="ChatPage__load-older"
            justifyContent="center"
            padding={1}
          >
            <Button
              variant="outlined"
              size="small"
              color={loadOlderMessagesError ? "error" : "inherit"}
              onClick={onLoadOlderMessages}
              disabled={isLoadingOlderMessages}
            >
              {loadOlderMessagesError
                ? `${loadOlderMessagesError} — 다시 시도`
                : isLoadingOlderMessages
                  ? "불러오는 중..."
                  : "지난 대화 더 보기"}
            </Button>
          </FlexBox>
        )}

        {showMessages && scrollParent && (
          <VirtualMessageList
            ref={virtualRef}
            className="ChatPage__message-list"
            items={messages}
            itemKey={(m) => m.id}
            followOutput="auto"
            initialTopMostItemIndex="bottom"
            customScrollParent={scrollParent}
            renderItem={(msg) => (
              <ChatMessage
                id={msg.id}
                type={msg.type}
                content={msg.content}
                timestamp={msg.timestamp}
                messageType={msg.messageType}
                isStreaming={msg.isStreaming}
                isStopped={msg.isStopped}
                stoppedReason={msg.stoppedReason}
                chatType={msg.chatType}
                processes={msg.processes}
                result={msg.result}
                totalRowCount={msg.totalRowCount}
                source={msg.source}
                userAvatarUrl={user?.avatarUrl}
                onSqlView={msg.onSqlView}
                onDataMore={msg.onDataMore}
                onCsvDownload={msg.onCsvDownload}
              />
            )}
          />
        )}
      </Box>

      {/* 입력 영역 */}
      <Paper className="ChatPage__input-area" elevation={0}>
        <Container className="ChatPage__input-inner" maxWidth={false} disableGutters>
          {/* 키워드 선택 바 (입력창 상단) */}
          {keywordSelector && onKeywordDropdownClick && (
            <KeywordSelector
              {...keywordSelector}
              onDropdownClick={onKeywordDropdownClick}
            />
          )}
          {/* 스키마 선택 바 (입력창 상단) */}
          {schemaSelector && onSchemaDropdownClick && (
            <SchemaSelector
              {...schemaSelector}
              onDropdownClick={onSchemaDropdownClick}
            />
          )}
          <ChatInput
            value={inputValue}
            onChange={onInputChange}
            onSend={onSendMessage}
            onStop={onStopStreaming}
            isSending={isSending}
            disabled={!selectedChatId}
            placeholder={
              selectedChatId
                ? "메시지를 입력하세요..."
                : "채팅을 선택하거나 새 채팅을 시작하세요"
            }
            {...inputToolbar}
          />
        </Container>
      </Paper>
    </>
  );
}

// ============================================
// ChatPage — 하위 호환 (ChatLayout + ChatContent 합성)
// ============================================

export interface ChatPageProps {
  // ── 좌측 사이드바: 채팅 목록 ──
  chatItems: ChatListItemData[];
  selectedChatId?: string | null;
  isSidebarCollapsed: boolean;
  isSessionsLoading?: boolean;
  onToggleSidebar: () => void;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  isCreatingChat?: boolean;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, title: string) => void;
  onToggleFavorite: (id: string) => void;

  // ── 좌측 사이드바: 부가 기능 ──
  onLogoClick?: () => void;
  pagination?: {
    maxDisplayCount?: number;
    hasMore?: boolean;
    onLoadMore?: () => void;
  };
  credit?: {
    used: number;
    total: number;
    exhaustedMessage?: string;
  };

  // ── 메인 영역: 메시지 ──
  messages: ChatMessageData[];
  isLoadingMessages?: boolean;

  // ── 메인 영역: 입력 ──
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onStopStreaming?: () => void;
  isSending?: boolean;

  // ── 입력 툴바 ──
  inputToolbar?: ChatInputToolbarProps;

  // ── 사용자 정보 ──
  user?: { name: string; email?: string; avatarUrl?: string };

  // ── 배경 ──
  backgroundImage?: string | null;

  // ── 우측 사이드바 ──
  rightSidebar?: RightSidebarState;
  onOpenRightPanel?: (tab: RightSidebarTab) => void;

  // ── Welcome 페이지 ──
  welcomeQuestions?: RecommendedQuestionItem[];
  welcomeQuestionsLoading?: boolean;
  onWelcomeQuestionClick?: (question: string) => void;
  welcomeKeywords?: RecommendedKeywordItem[];
  welcomeKeywordsLoading?: boolean;
  onWelcomeKeywordClick?: (keyword: RecommendedKeywordItem) => void;

  // ── 서버 상태 ──
  statusItems?: StatusBarItem[];
  onStatusItemClick?: (type: string) => void;
  onLogout?: () => void;

  /** 읽지 않은 공지사항 수 (헤더 배지) */
  noticeUnreadCount?: number;

  // ── [v2.2 Phase 4.7] 지난 대화 더 보기 ──
  hasOlderMessages?: boolean;
  isLoadingOlderMessages?: boolean;
  loadOlderMessagesError?: string | null;
  onLoadOlderMessages?: () => void;
}

export function ChatPage({
  chatItems,
  selectedChatId,
  isSidebarCollapsed,
  isSessionsLoading,
  onToggleSidebar,
  onSelectChat,
  onNewChat,
  isCreatingChat,
  onDeleteChat,
  onRenameChat,
  onToggleFavorite,
  onLogoClick,
  pagination,
  credit,
  messages,
  isLoadingMessages,
  inputValue,
  onInputChange,
  onSendMessage,
  onStopStreaming,
  isSending,
  inputToolbar,
  user,
  backgroundImage,
  rightSidebar,
  onOpenRightPanel,
  welcomeQuestions,
  welcomeQuestionsLoading,
  onWelcomeQuestionClick,
  welcomeKeywords,
  welcomeKeywordsLoading,
  onWelcomeKeywordClick,
  statusItems,
  onStatusItemClick,
  onLogout,
  noticeUnreadCount,
  hasOlderMessages,
  isLoadingOlderMessages,
  loadOlderMessagesError,
  onLoadOlderMessages,
}: ChatPageProps) {
  const selectedChat = chatItems.find((c) => c.id === selectedChatId);

  return (
    <ChatLayout
      chatItems={chatItems}
      selectedChatId={selectedChatId}
      isSidebarCollapsed={isSidebarCollapsed}
      isSessionsLoading={isSessionsLoading}
      onToggleSidebar={onToggleSidebar}
      onSelectChat={onSelectChat}
      onNewChat={onNewChat}
      isCreatingChat={isCreatingChat}
      onDeleteChat={onDeleteChat}
      onRenameChat={onRenameChat}
      onToggleFavorite={onToggleFavorite}
      onLogoClick={onLogoClick}
      pagination={pagination}
      credit={credit}
      user={user}
      chatTitle={selectedChat?.title ?? "새 채팅"}
      onOpenRightPanel={onOpenRightPanel}
      statusItems={statusItems}
      onStatusItemClick={onStatusItemClick}
      onLogout={onLogout}
      noticeUnreadCount={noticeUnreadCount}
      rightSidebar={rightSidebar}
      backgroundImage={backgroundImage}
    >
      <ChatContent
        messages={messages}
        isLoadingMessages={isLoadingMessages}
        inputValue={inputValue}
        onInputChange={onInputChange}
        onSendMessage={onSendMessage}
        onStopStreaming={onStopStreaming}
        isSending={isSending}
        selectedChatId={selectedChatId}
        inputToolbar={inputToolbar}
        user={user}
        welcomeQuestions={welcomeQuestions}
        welcomeQuestionsLoading={welcomeQuestionsLoading}
        onWelcomeQuestionClick={onWelcomeQuestionClick}
        welcomeKeywords={welcomeKeywords}
        welcomeKeywordsLoading={welcomeKeywordsLoading}
        onWelcomeKeywordClick={onWelcomeKeywordClick}
        hasOlderMessages={hasOlderMessages}
        isLoadingOlderMessages={isLoadingOlderMessages}
        loadOlderMessagesError={loadOlderMessagesError}
        onLoadOlderMessages={onLoadOlderMessages}
      />
    </ChatLayout>
  );
}
