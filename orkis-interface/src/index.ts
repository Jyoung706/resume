// 양방향 통신을 명확히 하는 export
export * as Ai from "./ai";
export * as Backend from "./backend";
export * as Core from "./core";
export * as Shared from "./shared";

// RAG 서버 관련 타입 직접 export (backend에서 사용)
export type {
  RagConversationRequest,
  RagConversationResponse,
  RagProcessInfo,
  ChatType
} from "./ai/generation";

export type {
  StreamChunk,
  ProcessUpdate,
  ProcessSequence,
  StreamCancelRequest,
  RagResponseInfo,
  StreamDataType
} from "./ai/streaming";

export {
  ChatErrorType,
  ChatErrorMessages
} from "./ai/errors";

export type {
  ChatErrorInfo
} from "./ai/errors";

// Backend Server 인터페이스 직접 export (frontend에서 사용)
export type {
  LoginType,
  UserInfo,
  PasswordLoginRequest,
  OAuthStartRequest,
  OAuthUrlResponse,
  OAuthCallbackRequest,
  LoginSuccessResponse,
  LogoutRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  AuthInfo
} from "./backend/auth";

export type {
  MessageRole,
  MessageStatus,
  CreateSessionRequest,
  CreateSessionResponse,
  GetSessionsRequest,
  GetSessionsResponse,
  GetSessionMessagesRequest,
  GetSessionMessagesResponse,
  SendMessageRequest,
  SendMessageResponse,
  StreamMessageRequest,
  SaveMessagesRequest,
  SaveMessagesResponse,
  UpdateMessageMetadataRequest,
  DeleteSessionRequest,
  CancelStreamRequest,
  DownloadCsvRequest
} from "./backend/chat";

export type {
  MenuItem,
  UserMenusResponse,
  AllMenusResponse
} from "./backend/menu";

// Core Server 관련 타입 직접 export (backend에서 사용)
export type { 
  CoreRequest, 
  CoreResponse 
} from "./core/request";

export type {
  ERROR_RESPONSE,
  CustomErrorInterface,
  Request,
  Response,
  CoreLogger,
  ResponseUtil
} from "./core/types";

export {
  FILTER_TYPES,
  REQUEST_TYPE,
  MONITOR_LOGGER_TYPES,
  INTERCEPTOR_EXECUTION
} from "./core/types";

export type {
  ExpressInterceptor,
  ExpressMiddleware,
  ErrorHandlerOptions,
  CorsOptions,
  SessionOptions,
  UploadOptions,
  LoggingOptions
} from "./core/middleware";

export type {
  ResponseUrlUtil,
  StateManager,
  TokenManager,
  FileUtil,
  ValidationUtil,
  CacheUtil,
  CryptoUtil,
  DateUtil
} from "./core/utils";

// 자주 사용하는 타입은 직접 export (편의성)
export type { CoreRequest as CoreRequestLegacy } from "./core/request";
export type {
  ApiResponse,
  FileResponse,
  PaginatedResponse,
  StreamResponse,
} from "./shared/api";
export { ERROR_CODES, MESSAGE_ROLE } from "./shared/constants";
export type { ChatMessage, ChatSession, User } from "./shared/models";
