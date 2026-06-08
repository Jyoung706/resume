// ============================================
// ChatMessage — 채팅 메시지 표시 컴포넌트
// Design Layer: props 기반 (로직 없음)
//
// orkis-front CreamChatPage 기준 구조:
//   유저 메시지: 우측 정렬, 다크 말풍선, 타임스탬프 상단
//   어시스턴트 메시지: 좌측 정렬, ORKIS 로고 헤더 + 흰 배경 콘텐츠
//   SQL 답변: 프로세스 아코디언 + 쿼리 아코디언 + 액션 버튼
// ============================================

import {
  Box,
  CircularProgress,
  FlexBox,
  Img,
  MarkdownRenderer,
  Typography,
} from "@/components";
import clsx from "clsx";
import { useEffect, useRef } from "react";
import "./ChatMessage.scss";
import { SqlActionButtons } from "./SqlActionButtons";
import { SqlProcessSteps, type ProcessStepData } from "./SqlProcessSteps";
import { SqlQuerySection } from "./SqlQuerySection";
import { SqlResultTable, type SqlResultTableProps } from "./SqlResultTable";

// ============================================
// Props
// ============================================

export interface ChatMessageProps {
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
   * "incomplete": cancel race 패배로 9000 archived 됐으나 본문 없음 ("응답 미완료" 문구)
   */
  stoppedReason?: "user" | "incomplete";
  chatType?: "sql" | "general";
  processes?: ProcessStepData[];
  result?: SqlResultTableProps | null;
  /** 전체 행 건수 */
  totalRowCount?: number;
  /** 메시지 출처 (realtime: SSE 실시간, loaded: API 로드) */
  source?: "realtime" | "loaded" | "cached";
  /** 사용자 프로필 아바타 URL */
  userAvatarUrl?: string;
  /** SQL 보기 클릭 */
  onSqlView?: () => void;
  /** DATA 더보기 클릭 */
  onDataMore?: () => void;
  /** CSV 다운로드 클릭 */
  onCsvDownload?: () => void;
}

// ============================================
// 타임스탬프 포맷
// ============================================

function formatTime(timestamp?: string): string {
  if (!timestamp) return "";
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  } catch {
    return "";
  }
}

// ============================================
// AssistantHeader — ORKIS 로고 + 이름 + 시간
// ============================================

function AssistantHeader({ timeStr }: { timeStr: string }) {
  return (
    <FlexBox className="ChatMessage__assistant-header">
      <FlexBox className="ChatMessage__assistant-header-left">
        {/* ORKIS 로고 — 27x27px */}
        <Box className="ChatMessage__logo-wrap">
          <Img
            src="/assets/icons/chat/ico_robot.png"
            alt="ORKIS"
            fit="contain"
          />
        </Box>
        {/* ORKIS 텍스트 */}
        <Typography className="ChatMessage__orkis-text">ORKIS</Typography>
      </FlexBox>
      {/* 타임스탬프 */}
      {timeStr && (
        <Typography className="ChatMessage__header-time">{timeStr}</Typography>
      )}
      {/* 더보기 메뉴 */}
      {/* <Box className="ChatMessage__more-menu">
        <Img
          src="/assets/icons/chat/more_menu_icon.svg"
          alt="더보기"
          fit="contain"
        />
      </Box> */}
    </FlexBox>
  );
}

// ============================================
// ContentWrapper — 흰색 콘텐츠 박스
// ============================================

function ContentWrapper({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Box className={clsx("ChatMessage__assistant-body", className)}>
      {children}
    </Box>
  );
}

// ============================================
// UserMessage
// ============================================

function UserMessage({
  content,
  timeStr,
  avatarUrl
}: {
  content: string;
  timeStr: string;
  avatarUrl?: string;
}) {
  return (
    <FlexBox className="ChatMessage__user-row">
      {/* 타임스탬프 + 사용자 아바타 */}
      <FlexBox className="ChatMessage__user-meta">
        {timeStr && (
          <Typography className="ChatMessage__user-time">{timeStr}</Typography>
        )}
        {/* 사용자 아바타 */}
        <Box className="ChatMessage__user-avatar">
          {avatarUrl ? (
            <Img src={avatarUrl} alt="사용자" fit="cover" />
          ) : (
            <Img
              src="/assets/icons/chat/ico_avatar.png"
              alt="사용자"
              fit="cover"
            />
          )}
        </Box>
      </FlexBox>
      {/* 말풍선 */}
      <Box className="ChatMessage__user-bubble">
        <Typography className="ChatMessage__user-text">{content}</Typography>
      </Box>
    </FlexBox>
  );
}

// ============================================
// GeneralAnswer — 일반 텍스트 답변
// ============================================

function GeneralAnswer({
  content,
  timeStr,
  messageType,
  isStreaming,
  isStopped,
  stoppedReason
}: {
  content: string;
  timeStr: string;
  messageType?: string;
  isStreaming?: boolean;
  isStopped?: boolean;
  stoppedReason?: "user" | "incomplete";
}) {
  const isError = messageType === "error";
  const isWarning = messageType === "warning";

  return (
    <FlexBox className="ChatMessage__assistant-row">
      <AssistantHeader timeStr={timeStr} />

      <ContentWrapper
        className={clsx(
          isError && "ChatMessage__error",
          isWarning && "ChatMessage__warning",
          isStopped && "ChatMessage__stopped"
        )}
      >
        {/* 스트리밍 중 로딩 */}
        {isStreaming && !content && (
          <FlexBox className="ChatMessage__streaming-loader">
            <CircularProgress size={16} />
            <Typography>응답 생성 중...</Typography>
          </FlexBox>
        )}

        {/* 에러 메시지 */}
        {isError && (
          <Typography className="ChatMessage__error-text">
            {content || "오류가 발생했습니다."}
          </Typography>
        )}

        {/* 일반 텍스트 — 마크다운 렌더링 */}
        {!isError && content && (
          <MarkdownRenderer
            className="ChatMessage__content-markdown"
            streaming={isStreaming && !!content}
          >
            {content}
          </MarkdownRenderer>
        )}

        {/* 중지됨 표시 — 사유별 문구 분기 (SqlAnswer 와 메시지 일관성 유지)
            "incomplete": cancel race 패배로 archive 가 9000 으로 굳고 본문도 비어있는 케이스
                         (network drop 인지 사용자 cancel 인지 단정 불가하므로 중립 문구)
            "user" / 기본: 사용자 명시 정지 또는 명확한 cancel(9001) 케이스 */}
        {isStopped && stoppedReason === "incomplete" && (
          <>
            <Typography className="ChatMessage__content-text">
              응답이 완료되지 않았습니다.
            </Typography>
            <Typography className="ChatMessage__stopped-label">
              (응답 도중 연결이 종료되었습니다)
            </Typography>
          </>
        )}
        {isStopped && stoppedReason !== "incomplete" && (
          <>
            <Typography className="ChatMessage__content-text">
              사용자에 의해 응답이 중지되었습니다.
            </Typography>
            <Typography className="ChatMessage__stopped-label">
              (응답이 중지되었습니다)
            </Typography>
          </>
        )}
      </ContentWrapper>
    </FlexBox>
  );
}

// ============================================
// SqlAnswer — SQL 답변 (아코디언 + 액션 버튼)
// orkis-front 기준:
//   1. ORKIS 헤더
//   2. [아코디언] SQL 생성 과정 (SQL 생성 완료)
//   3. [아코디언] SQL 쿼리
//   4. [액션 버튼] SQL 보기 | DATA 더보기 | CSV 다운로드
// ============================================

function SqlAnswer({
  content,
  timeStr,
  isStreaming,
  isStopped,
  stoppedReason,
  messageType,
  source,
  processes,
  result,
  totalRowCount,
  onSqlView,
  onDataMore,
  onCsvDownload
}: {
  content: string;
  timeStr: string;
  isStreaming?: boolean;
  isStopped?: boolean;
  stoppedReason?: "user" | "incomplete";
  messageType?: string;
  source?: "realtime" | "loaded" | "cached";
  processes?: ProcessStepData[];
  result?: SqlResultTableProps | null;
  totalRowCount?: number;
  onSqlView?: () => void;
  onDataMore?: () => void;
  onCsvDownload?: () => void;
}) {
  const isError = messageType === "error";
  const showProcess = processes && processes.length > 0;
  // SQL 실행 실패는 result.error로 전달됨 (messageType은 "sql" 유지)
  const hasResultError = !!result?.error;
  // 에러/중지 시 쿼리/결과/중간데이터 미표시, 로드된 메시지는 결과 테이블 미표시
  const hasQuery = !isError && !isStopped && !!result?.query;
  // 결과 테이블 표시 조건: result 존재 시 항상 표시.
  // 0건 조회 결과(`columns 있음·data 빈 배열` 또는 둘 다 빈 배열)도 헤더로 "0건 조회됨" 명시 →
  // 사용자가 "에러" 와 "0건" 을 구분 가능하도록.
  const showResult =
    !isError && !isStopped && source === "realtime" && !!result;
  const hasContent = !isError && !isStopped && !!content && !result?.query;

  // 스트리밍 시 content 영역 자동 스크롤
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isStreaming && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [isStreaming, content]);

  return (
    <FlexBox className="ChatMessage ChatMessage__sql-row">
      {/* ORKIS 헤더 */}
      <AssistantHeader timeStr={timeStr} />

      {/* 아코디언 1: SQL 생성 과정
          - 실시간: 기본 열림 (절차 바로 확인, 완료 시 자동 접힘)
          - 에러: 기본 열림 (에러 스텝 확인)
          - 로드된 메시지: 기본 접힘 */}
      {showProcess && (
        <SqlProcessSteps
          steps={processes}
          defaultExpanded={isError || isStopped || source !== "loaded"}
        />
      )}

      {/* 아코디언 2: SQL 쿼리 (에러 시 미표시) */}
      {hasQuery && <SqlQuerySection query={result!.query!} />}

      {/* 아코디언 3: SQL 쿼리 실행 결과 (실시간 + 데이터/에러 있을 때) */}
      {showResult && (
        <SqlResultTable
          columns={result.columns}
          data={result.data}
          executionTime={result.executionTime}
          totalRowCount={totalRowCount}
          error={result.error}
        />
      )}

      {/* 에러 메시지 */}
      {isError && content && (
        <ContentWrapper className="ChatMessage__error">
          <Typography className="ChatMessage__error-text">{content}</Typography>
        </ContentWrapper>
      )}

      {/* SQL 답변 내 텍스트 응답 — 3줄 높이 제한 + 스크롤 */}
      {hasContent && (
        <ContentWrapper>
          <Box ref={contentRef} className="ChatMessage__sql-content">
            {content}
          </Box>
        </ContentWrapper>
      )}

      {/* 액션 버튼 — SQL 답변이면 표시 (스트리밍/에러/중지/실행실패 제외) */}
      {!isStreaming && !isError && !isStopped && !hasResultError && (
        <SqlActionButtons
          showSqlButton={hasQuery}
          onSqlView={onSqlView}
          onDataMore={onDataMore}
          onCsvDownload={onCsvDownload}
        />
      )}

      {/* 스트리밍 중 (프로세스만 있고 결과 없을 때) */}
      {isStreaming && !showResult && !content && (
        <FlexBox className="ChatMessage__sql-streaming">
          <CircularProgress size={16} />
          <Typography>SQL 생성 중...</Typography>
        </FlexBox>
      )}

      {/* 중지됨 표시 — 일반 답변과 동일한 스타일.
          stoppedReason "incomplete" 는 cancel race 패배로 archive 가 9000 으로 굳고 본문도
          비어있는 케이스 (사용자 cancel/network drop 단정 불가하므로 중립 문구). */}
      {isStopped && stoppedReason === "incomplete" && (
        <ContentWrapper className="ChatMessage__stopped">
          <Typography className="ChatMessage__content-text">
            응답이 완료되지 않았습니다.
          </Typography>
          <Typography className="ChatMessage__stopped-label">
            (응답 도중 연결이 종료되었습니다)
          </Typography>
        </ContentWrapper>
      )}
      {isStopped && stoppedReason !== "incomplete" && (
        <ContentWrapper className="ChatMessage__stopped">
          <Typography className="ChatMessage__content-text">
            사용자에 의해 응답이 중지되었습니다.
          </Typography>
          <Typography className="ChatMessage__stopped-label">
            (응답이 중지되었습니다)
          </Typography>
        </ContentWrapper>
      )}
    </FlexBox>
  );
}

// ============================================
// WaitingMessage — 대기 상태
// ============================================

function WaitingMessage() {
  return (
    <FlexBox className="ChatMessage__waiting">
      <CircularProgress size={16} thickness={4} />
      <Typography>AI 서버에서 요청을 처리 중입니다</Typography>
      <FlexBox className="ChatMessage__waiting-dots">
        {[0, 1, 2].map((i) => (
          <Box key={i} component="span" className="ChatMessage__waiting-dot" />
        ))}
      </FlexBox>
    </FlexBox>
  );
}

// ============================================
// ChatMessage — 메인 라우터
// ============================================

export function ChatMessage({
  type,
  content,
  timestamp,
  messageType,
  isStreaming,
  isStopped,
  stoppedReason,
  chatType,
  processes,
  result,
  totalRowCount,
  source,
  userAvatarUrl,
  onSqlView,
  onDataMore,
  onCsvDownload
}: ChatMessageProps) {
  const timeStr = formatTime(timestamp);
  const isSql = chatType === "sql";

  // 1. 사용자 메시지
  if (type === "user") {
    return (
      <UserMessage
        content={content}
        timeStr={timeStr}
        avatarUrl={userAvatarUrl}
      />
    );
  }

  // 2. 대기 상태
  if (messageType === "waiting_status") {
    return <WaitingMessage />;
  }

  // 3. SQL 답변
  if (isSql) {
    return (
      <SqlAnswer
        content={content}
        timeStr={timeStr}
        isStreaming={isStreaming}
        isStopped={isStopped}
        stoppedReason={stoppedReason}
        messageType={messageType}
        source={source}
        processes={processes}
        result={result}
        totalRowCount={totalRowCount}
        onSqlView={onSqlView}
        onDataMore={onDataMore}
        onCsvDownload={onCsvDownload}
      />
    );
  }

  // 4. 일반 답변 / 에러 / 경고
  return (
    <GeneralAnswer
      content={content}
      timeStr={timeStr}
      messageType={messageType}
      isStreaming={isStreaming}
      isStopped={isStopped}
      stoppedReason={stoppedReason}
    />
  );
}
