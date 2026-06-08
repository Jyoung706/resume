/**
 * 채팅 에러 타입
 */
export enum ChatErrorType {
  INVALID_REQUEST = 'INVALID_REQUEST',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  MESSAGE_SAVE_FAILED = 'MESSAGE_SAVE_FAILED',
  RAG_SERVER_ERROR = 'RAG_SERVER_ERROR',
  RAG_SERVER_TIMEOUT = 'RAG_SERVER_TIMEOUT',
  STREAM_ERROR = 'STREAM_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  UNAUTHORIZED = "UNAUTHORIZED"
}

/**
 * 채팅 에러 정보
 */
export interface ChatErrorInfo {
  userMessage: string;
  code: ChatErrorType;
  logMessage?: string;
}

/**
 * 채팅 에러 메시지 맵
 */
export const ChatErrorMessages: Record<ChatErrorType, ChatErrorInfo> = {
  [ChatErrorType.INVALID_REQUEST]: {
    userMessage: '잘못된 요청입니다. 입력 내용을 확인해주세요.',
    code: ChatErrorType.INVALID_REQUEST,
    logMessage: 'Invalid request parameters'
  },
  [ChatErrorType.SESSION_NOT_FOUND]: {
    userMessage: '세션을 찾을 수 없습니다. 새로운 대화를 시작해주세요.',
    code: ChatErrorType.SESSION_NOT_FOUND,
    logMessage: 'Session not found'
  },
  [ChatErrorType.MESSAGE_SAVE_FAILED]: {
    userMessage: '메시지 저장에 실패했습니다. 다시 시도해주세요.',
    code: ChatErrorType.MESSAGE_SAVE_FAILED,
    logMessage: 'Failed to save message'
  },
  [ChatErrorType.RAG_SERVER_ERROR]: {
    userMessage: 'AI 서버 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.',
    code: ChatErrorType.RAG_SERVER_ERROR,
    logMessage: 'RAG server error'
  },
  [ChatErrorType.RAG_SERVER_TIMEOUT]: {
    userMessage: '응답 시간이 초과되었습니다. 다시 시도해주세요.',
    code: ChatErrorType.RAG_SERVER_TIMEOUT,
    logMessage: 'RAG server timeout'
  },
  [ChatErrorType.STREAM_ERROR]: {
    userMessage: '스트리밍 중 오류가 발생했습니다.',
    code: ChatErrorType.STREAM_ERROR,
    logMessage: 'Stream error occurred'
  },
  [ChatErrorType.UNKNOWN_ERROR]: {
    userMessage: '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    code: ChatErrorType.UNKNOWN_ERROR,
    logMessage: 'Unknown error occurred'
  },
  [ChatErrorType.UNAUTHORIZED]: {
    userMessage: '인증되지 않은 요청입니다. 다시 로그인해주세요.',
    code: ChatErrorType.UNAUTHORIZED,
    logMessage: 'Unauthorized access'
  }
};
