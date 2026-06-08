import { CustomError, ERROR_RESPONSE } from "@orkis/core/application";

export enum ChatErrorType {
  RAG_SERVER_UNREACHABLE = "RAG_SERVER_UNREACHABLE",
  RAG_SERVER_TIMEOUT = "RAG_SERVER_TIMEOUT",
  RAG_SERVER_ERROR = "RAG_SERVER_ERROR",
  INVALID_RESPONSE = "INVALID_RESPONSE",
  SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  DATABASE_ERROR = "DATABASE_ERROR",
  MODEL_NOT_CONFIGURED = "MODEL_NOT_CONFIGURED",
  MODEL_NOT_SELECTED = "MODEL_NOT_SELECTED",
  MODEL_LOOKUP_FAILED = "MODEL_LOOKUP_FAILED"
}

export class ChatError extends CustomError {
  public result?: ERROR_RESPONSE;
  public errorType: ChatErrorType;

  constructor(
    message: string,
    errorType: ChatErrorType,
    statusCode = 500,
    result?: ERROR_RESPONSE
  ) {
    super(message, statusCode, "CHAT_ERROR", result);
    this.name = "ChatError";
    this.errorType = errorType;
    this.result = result;
  }
}

export const ChatErrorMessages = {
  [ChatErrorType.RAG_SERVER_UNREACHABLE]: {
    userMessage: "AI 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
    technicalMessage: "RAG 서버에 연결할 수 없습니다."
  },
  [ChatErrorType.RAG_SERVER_TIMEOUT]: {
    userMessage: "AI 응답 시간이 초과되었습니다. 질문을 다시 시도해주세요.",
    technicalMessage: "RAG 서버 요청 타임아웃"
  },
  [ChatErrorType.RAG_SERVER_ERROR]: {
    userMessage: "AI 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    technicalMessage: "RAG 서버 오류"
  },
  [ChatErrorType.INVALID_RESPONSE]: {
    userMessage: "AI 응답을 처리할 수 없습니다. 다른 질문을 시도해주세요.",
    technicalMessage: "RAG 서버 응답 형식 오류"
  },
  [ChatErrorType.SESSION_NOT_FOUND]: {
    userMessage: "채팅 세션을 찾을 수 없습니다.",
    technicalMessage: "세션 ID가 유효하지 않습니다."
  },
  [ChatErrorType.UNAUTHORIZED]: {
    userMessage: "이 채팅에 접근할 권한이 없습니다.",
    technicalMessage: "세션 접근 권한 없음"
  },
  [ChatErrorType.DATABASE_ERROR]: {
    userMessage: "데이터 처리 중 오류가 발생했습니다.",
    technicalMessage: "데이터베이스 작업 실패"
  },
  [ChatErrorType.MODEL_NOT_CONFIGURED]: {
    userMessage: "LLM 모델을 먼저 등록하세요.",
    technicalMessage: "사용자에게 등록된 LLM 모델이 없음"
  },
  [ChatErrorType.MODEL_NOT_SELECTED]: {
    userMessage: "사용할 LLM 모델을 선택하세요.",
    technicalMessage: "modelId 미지정 + default 모델 없음"
  },
  [ChatErrorType.MODEL_LOOKUP_FAILED]: {
    userMessage: "선택한 LLM 모델을 찾을 수 없습니다. 다시 선택해주세요.",
    technicalMessage: "modelId 조회 실패 또는 소유자 불일치 또는 apiKeyEncrypted 누락"
  }
};
