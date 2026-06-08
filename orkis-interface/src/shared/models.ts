/**
 * 사용자 정보 (모든 통신에서 공통 사용)
 */
export interface User {
  id: string;
  email: string;
  name: string;
}

/**
 * 채팅 메시지 (Frontend ↔ Backend 통신용)
 */
export interface ChatMessage {
  id: string;
  sessionId: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
  metadata?: {
    // 프로세스 관련 정보 (AI 서버에서 처리된 메시지)
    questionType?: 'general' | 'sql';
    processes?: Array<{
      id: string;
      label: string;
      status: 'pending' | 'processing' | 'success' | 'error';
      percentage?: string;
    }>;
    finalStatus?: 'success' | 'error' | 'partial';
    chatId?: string;

    // 기타 필드 (하위 호환성 유지)
    [key: string]: any;
  };
}

/**
 * 채팅 세션 (Frontend ↔ Backend 통신용)
 */
export interface ChatSession {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessageAt?: string; // 마지막 메시지 시간
  titleModified?: boolean; // 제목이 수정되었는지 여부 (AI 자동 생성 vs 사용자 수정)
  isFavorite?: boolean; // 즐겨찾기 여부

  // 채팅 세션별 설정 정보 (2025-11-24 추가)
  dbConnectionId?: number; // 선택된 DB 연결 ID
  selectedModel?: string; // 선택된 LLM 모델
  ragEnabled?: boolean; // RAG 사용 여부
}