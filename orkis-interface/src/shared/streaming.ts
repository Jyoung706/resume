/**
 * 스트리밍 이벤트 타입 정의
 * 메시지와 프로세스 스트리밍을 분리하여 독립적으로 처리
 */

// 이벤트 타입 열거형
export enum StreamEventType {
  // 메시지 관련 이벤트
  MESSAGE_CONTENT = 'message_content',
  MESSAGE_CHUNK = 'message_chunk',
  MESSAGE_COMPLETE = 'message_complete',
  MESSAGE_ERROR = 'message_error',
  
  // 프로세스 관련 이벤트
  PROCESS_START = 'process_start',
  PROCESS_UPDATE = 'process_update',
  PROCESS_COMPLETE = 'process_complete',
  PROCESS_ERROR = 'process_error',
  
  // SQL 관련 이벤트
  SQL_GENERATED = 'sql_generated',
  SQL_EXECUTED = 'sql_executed',
  SQL_ERROR = 'sql_error',
  
  // 세션 관련 이벤트
  SESSION_TITLE = 'session_title',
  SESSION_METADATA = 'session_metadata',
  
  // 연결 관련 이벤트
  CONNECTION_START = 'connection_start',
  CONNECTION_END = 'connection_end',
  CONNECTION_ERROR = 'connection_error'
}

// 프로세스 상태
export type ProcessStatus = 'pending' | 'running' | 'completed' | 'failed';

// 프로세스 단계 정의
export interface ProcessStep {
  id: string;
  sequence: string;
  name: string;
  description: string;
  status: ProcessStatus;
  progress: number; // 0-100
  startTime?: string;
  endTime?: string;
  error?: string;
  rawData?: any;
}

// 스트림 이벤트 기본 구조
export interface StreamEvent<T = any> {
  type: StreamEventType;
  data: T;
  timestamp: string;
  messageId?: string;
  sessionId?: string;
}

// 메시지 관련 이벤트 데이터
export interface MessageContentData {
  content: string;
  isComplete?: boolean;
}

export interface MessageChunkData {
  chunk: string;
  index: number;
  totalChunks?: number;
}

export interface MessageCompleteData {
  messageId: string;
  totalLength: number;
  responseType?: string;
}

// 프로세스 관련 이벤트 데이터
export interface ProcessStartData {
  processes: ProcessStep[];
  totalSteps: number;
}

export interface ProcessUpdateData {
  processId: string;
  status: ProcessStatus;
  progress: number;
  description?: string;
  error?: string;
}

export interface ProcessCompleteData {
  processId: string;
  duration: number;
  result?: any;
}

// SQL 관련 이벤트 데이터
export interface SqlGeneratedData {
  sql: string;
  metadata?: {
    database?: string;
    tables?: string[];
    columns?: string[];
  };
}

export interface SqlExecutedData {
  sql: string;
  rowCount?: number;
  executionTime?: number;
  result?: any;
}

// 세션 관련 이벤트 데이터
export interface SessionTitleData {
  sessionId: string;
  title: string;
  generatedBy?: 'ai' | 'user';
}

export interface SessionMetadataData {
  sessionId: string;
  metadata: Record<string, any>;
}

// 연결 관련 이벤트 데이터
export interface ConnectionStartData {
  connectionId: string;
  protocol: 'sse' | 'websocket';
  clientInfo?: any;
}

export interface ConnectionEndData {
  connectionId: string;
  reason?: string;
  duration?: number;
}

// 스트림 핸들러 콜백 타입
export interface StreamCallbacks {
  // 메시지 관련 콜백
  onMessageContent?: (content: string) => void;
  onMessageChunk?: (chunk: string, index: number) => void;
  onMessageComplete?: (data: MessageCompleteData) => void;
  onMessageError?: (error: Error) => void;
  
  // 프로세스 관련 콜백
  onProcessStart?: (processes: ProcessStep[]) => void;
  onProcessUpdate?: (processId: string, update: ProcessUpdateData) => void;
  onProcessComplete?: (processId: string, data: ProcessCompleteData) => void;
  onProcessError?: (processId: string, error: Error) => void;
  
  // SQL 관련 콜백
  onSqlGenerated?: (sql: string, metadata?: any) => void;
  onSqlExecuted?: (data: SqlExecutedData) => void;
  onSqlError?: (error: Error) => void;
  
  // 세션 관련 콜백
  onSessionTitle?: (sessionId: string, title: string) => void;
  onSessionMetadata?: (sessionId: string, metadata: any) => void;
  
  // 연결 관련 콜백
  onConnectionStart?: (connectionId: string) => void;
  onConnectionEnd?: (connectionId: string, reason?: string) => void;
  onConnectionError?: (error: Error) => void;
}

// 스트림 요청 옵션
export interface StreamRequestOptions {
  enableMessageStream?: boolean;
  enableProcessStream?: boolean;
  enableSqlStream?: boolean;
  processUpdateInterval?: number; // ms
  abortSignal?: AbortSignal;
}