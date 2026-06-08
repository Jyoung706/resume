/**
 * SSE (Server-Sent Events) 기반 채팅 시스템 타입 정의
 * - Fetch Streaming 방식 (ReadableStream 기반)
 * - SQL/General 답변 타입 통합 스트리밍
 */

// ============================================================================
// SSE 멀티플렉싱 이벤트 타입
// ============================================================================

/**
 * SSE 멀티플렉싱 이벤트 타입
 */
export type SSEEventType =
  | "chat_type"
  | "step"
  | "steps"          // 전체 프로세스 절차 (SQL 타입 초기화용)
  | "content"
  | "token"
  | "thinking"
  | "result"
  | "error"
  | "complete"
  | "question_count"  // 질문 횟수 업데이트
  | "title_update";   // 세션 제목 업데이트
  // NOTE: "message_id" 이벤트 제거됨 - Frontend에서 UUID v7 기반 chatId 생성

/**
 * SSE 멀티플렉싱 이벤트 인터페이스
 */
export interface SSEMultiplexEvent {
  chatId: string;
  type: SSEEventType;
  payload: Record<string, any>;
}

// ============================================================================
// 기본 타입
// ============================================================================

/**
 * 채팅 타입 enum
 */
export type ChatType = "sql" | "general";

// ============================================================================
// API 요청/응답 타입
// ============================================================================

/**
 * 메시지 전송 요청
 * NOTE: tempMessageId가 chatId로 변경됨 - Frontend에서 UUID v7 기반 ID 생성
 */
export interface SendMessageRequest {
  sessionId: string;
  chatId: string;  // Frontend에서 생성한 UUID v7 기반 16자리 ID
  content: string;
  keywords?: string[];
  dbId?: string;
  connectionId?: string;
  schemaContext?: string;
  modelId?: string;
  apiKey?: string;
}

/**
 * 메시지 처리 결과 (SSEChatService.processMessage 반환 타입)
 */
export interface ProcessMessageResult {
  chatId: string;
  title?: string;
}

/**
 * 메시지 전송 응답
 * NOTE: tempMessageId 제거됨 - Frontend에서 생성한 chatId를 그대로 사용
 */
export interface SendMessageResponse {
  chatId: string;
  status: "processing" | "queued" | "error";
  title?: string;
  error?: string;
}

/**
 * 메시지 취소 요청
 */
export interface CancelMessageRequest {
  sessionId: string;
}

/**
 * 메시지 취소 응답
 */
export interface CancelMessageResponse {
  chatId: string;
  status: "cancelled" | "not_found" | "already_completed";
  message?: string;
}

// ============================================================================
// 프로세스 상태 타입
// ============================================================================

/**
 * 프로세스 단계 상태
 */
export interface ProcessStep {
  s: string; // step name
  id: string; // step id
  stat: number; // 0: running, 1: completed, -1: error
  processId?: string;
  i?: string; // input
  r?: string; // result (JSON string)
}

/**
 * 프로세스 상태 값
 */
export const ProcessStatus = {
  RUNNING: 0,
  COMPLETED: 1,
  ERROR: -1
} as const;

// ============================================================================
// 결과 타입
// ============================================================================

/**
 * 일반 답변 결과
 */
export interface GeneralResult {
  type: "general";
  content: string;
}

/**
 * SQL 답변 결과
 */
export interface SqlResult {
  type: "sql";
  sqlQuery: string;
  columns: string[];
  data: any[][];
  rowCount: number;
  executionTime?: number;
}

/**
 * 결과 유니온 타입
 */
export type ChatResult = GeneralResult | SqlResult;

// ============================================================================
// 컨텐츠 페이로드 타입
// ============================================================================

/**
 * 컨텐츠 이벤트 페이로드
 */
export interface ContentPayload {
  chunk: string;
  contentType: ChatType;
  isComplete: boolean;
}

/**
 * 단계 이벤트 페이로드
 */
export interface StepPayload {
  s: string;       // step id (숫자 문자열: "1", "2", "3", "4")
  id: string;      // step id (동일)
  n: string;       // step name/label (한글 라벨: "Hint", "스키마", "SQL", "검증")
  stat: number;    // 0: running, 1: completed, -1: error
  processId?: string;  // 원본 프로세스 이름 (generate_hint, schema_linking 등)
}

/**
 * 에러 이벤트 페이로드
 */
export interface ErrorPayload {
  code: string;
  message: string;
}

// ============================================================================
// 인증된 요청 타입
// ============================================================================

/**
 * 인증된 요청 확장 인터페이스
 */
export interface AuthenticatedRequest {
  userId: string;
  sessionId?: string;
  body?: any;
  params?: any;
  query?: any;
}

// ============================================================================
// SSE 설정
// ============================================================================

/**
 * SSE 설정
 */
export const SSEConfig = {
  // Heartbeat 간격 (ms)
  HEARTBEAT_INTERVAL: 30000,

  // 메시지 스트림 타임아웃 (ms)
  MESSAGE_TIMEOUT: 300000, // 5분

  // chat_type 대기 타임아웃 (ms)
  CHAT_TYPE_TIMEOUT: 30000, // 30초

  // Redis XREAD BLOCK 타임아웃 (ms)
  REDIS_BLOCK_TIMEOUT: 500,

  // 세션당 최대 동시 메시지 수
  MAX_CONCURRENT_MESSAGES: 5,

  // 완료된 메시지 정리 딜레이 (ms)
  CLEANUP_DELAY: 5000,

  // 재연결 최대 시도 횟수
  MAX_RECONNECT_ATTEMPTS: 5,

  // 재연결 기본 딜레이 (ms)
  RECONNECT_BASE_DELAY: 1000
} as const;

// ============================================================================
// Redis 키 패턴
// ============================================================================

/**
 * Redis 키 생성 헬퍼 (SSE 전용)
 *
 * 참고: proc 키는 WebSocket 전용이므로 SSE에서는 사용하지 않음
 * SSE는 :stream 키에서 모든 데이터(s, id, stat, m, r, msg_id)를 처리
 */
export const RedisKeys = {
  /**
   * 채팅 스트림 키
   * AI 서버가 사용하는 패턴: ${chatId}:stream
   * - s 필드: chat_type 및 프로세스 단계 정보
   * - id, stat 필드: 각 단계의 상태
   * - m 필드: 메시지 청크
   * - r 필드: 결과 데이터 또는 완료 시그널(9000번대)
   * - msg_id 필드: stageRedis 스트리밍 데이터 키
   */
  chatStream: (chatId: string) => `${chatId}:stream`,

  /**
   * 최종 결과 키
   * AI 서버가 사용하는 패턴: ${chatId}:final
   */
  chatFinal: (chatId: string) => `${chatId}:final`,

  /**
   * 통계 키
   */
  stat: (chatId: string) => `${chatId}:stat`
} as const;
