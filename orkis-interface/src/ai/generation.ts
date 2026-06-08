/**
 * Backend → RAG Server 대화 요청
 */
export interface RagConversationRequest {
  chatroom_id: string;  // sessionId
  question: string;
  keywords?: string[];
  hint?: string;
  db_id?: string;
  with_title?: boolean;  // 첫 메시지인 경우 true
}

/**
 * RAG Server → Backend 대화 응답
 */
export interface RagConversationResponse {
  chat_id: string;
  title?: string;  // 첫 메시지인 경우 제목 포함
  content?: string;
  status?: string;
  error?: string;
  [key: string]: any;  // 추가 필드 허용
}

/**
 * Redis에 저장되는 프로세스 정보
 */
export interface RagProcessInfo {
  chat_type?: 'general' | 'sql' | string;
  status?: string;
  sequence?: string;
  process_id?: string;
  [key: string]: any;
}

/**
 * 채팅 종류 열거형
 */
export enum ChatType {
  GENERAL = 'general',
  SQL = 'sql'
}