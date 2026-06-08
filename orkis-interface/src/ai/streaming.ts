/**
 * SSE(Server-Sent Events) 스트림 데이터 타입
 */
export enum StreamDataType {
  CONTENT = 'content',
  PROCESS_UPDATE = 'process_update',
  ERROR = 'error',
  DONE = 'done',
  PROCESS_SEQUENCE = 'process_sequence',
  PROCESS_STATUS = 'process_status'
}

/**
 * Backend → Frontend SSE 스트림 청크
 */
export interface StreamChunk {
  type: StreamDataType;
  data: any;
  timestamp?: string;
}

/**
 * 프로세스 업데이트 정보
 */
export interface ProcessUpdate {
  sequence: string;
  process_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  name: string;
  description?: string;
}

/**
 * 프로세스 시퀀스 정보
 */
export interface ProcessSequence {
  sequence: string;
  data: ProcessUpdate[];
}

/**
 * 스트림 취소 요청
 */
export interface StreamCancelRequest {
  chat_id?: string;
  session_id?: string;
  reason?: string;
}

/**
 * RAG 서버 응답 정보 (Backend 내부 사용)
 */
export interface RagResponseInfo {
  chatId: string;
  rawTitle?: string;
  rawResponse?: any;
}