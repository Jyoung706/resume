/**
 * DB 연결 관련 타입 정의
 * orkis-interface 의존 없이 필요한 타입만 정의
 */

/** DB 연결 정보 */
export interface DbConnection {
  connectionId: number;
  connectionName: string;
  dbTypeId: number;
  /** DB 타입명 (backend db_types.type_name JOIN 결과) */
  typeName?: string;
  description?: string;
  filePath?: string;
  databaseName?: string;
  host?: string;
  port?: number;
  isDefault?: boolean;
  lastTestStatus?: "success" | "failed" | string;
  lastTestMessage?: string;
}

/** DB 연결 목록 API 응답 */
export interface DbConnectionListResponse {
  connections: DbConnection[];
  total: number;
}

/** DB 연결 테스트 응답 */
export interface TestDbConnectionResponse {
  success: boolean;
  status: "success" | "failed" | "timeout";
  message: string;
  serverVersion?: string;
}

// ====================================================================
// DB 타입 관련 타입
// ====================================================================

/** DB 타입 정보 */
export interface DbType {
  dbTypeId: number;
  typeName: string;
  displayName: string;
  defaultPort?: number;
  description?: string;
  isActive: boolean;
  /** UI 표시용 */
  category?: string;
  logoUrl?: string;
  color?: string;
  displayOrder?: number;
}

// ====================================================================
// DB 연결 CRUD 관련 타입
// ====================================================================

/**
 * DB 연결 상세 정보 (detail API 응답)
 *
 * 비밀번호 정책: 본인이 등록한 비밀번호를 EditDialog 에서 확인·수정할 수 있도록
 * 백엔드가 복호화한 평문 password 를 응답에 포함한다. 인증된 동일 user_id 한정.
 */
export interface DbConnectionDetail {
  connectionId: number;
  connectionName: string;
  dbTypeId: number;
  typeName?: string;
  description?: string;
  host?: string;
  port?: number;
  databaseName?: string;
  username?: string;
  password?: string;
  filePath?: string;
  isDefault?: boolean;
  lastTestStatus?: "success" | "failed" | string;
  lastTestMessage?: string;
}

/** DB 연결 생성 요청 */
export interface CreateDbConnectionRequest {
  dbTypeId: number;
  connectionName: string;
  description?: string;
  host?: string;
  port?: number;
  databaseName: string;
  username?: string;
  password?: string;
  filePath?: string;
  isDefault?: boolean;
}

/** DB 연결 수정 요청 (변경 필드만) */
export interface UpdateDbConnectionRequest {
  connectionName?: string;
  description?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  isDefault?: boolean;
}

/** 저장 전 새 연결 테스트 요청 */
export interface TestNewConnectionRequest {
  dbTypeId: number;
  host?: string;
  port?: number;
  databaseName: string;
  username?: string;
  password?: string;
  filePath?: string;
}

/** RAG 전처리 가능 여부 */
export interface RagReadiness {
  canPreprocess: boolean;
  reason: "OK" | "NO_MODEL";
}

/** DB 연결 생성 응답 */
export interface CreateDbConnectionResponse {
  connectionId: number;
  message: string;
  ragReadiness?: RagReadiness;
}

/** SQLite 생성 요청 */
export interface CreateSqliteRequest {
  connectionName: string;
  databaseName: string;
  description?: string;
}

/** SQLite 존재 확인 응답 */
export interface CheckSqliteExistsResponse {
  exists: boolean;
}

// ====================================================================
// RAG 전처리 관련 타입 (orkis-interface 백엔드 호환)
// ====================================================================

/** RAG 전처리 타입 (숫자 — orkis-interface 기준) */
export const RagType = {
  ALL: 0,      // SCHEMA + DATA 전체 (preprocess 요청에만 사용)
  SCHEMA: 1,   // 스키마
  DATA: 2,     // 데이터
} as const;

export type RagType = (typeof RagType)[keyof typeof RagType];

/** RAG 전처리 상태 */
export type RagPreprocessingStatus = "pending" | "processing" | "success" | "failed";

/** @deprecated RagPreprocessingStatus 사용 권장. 하위 호환용 alias */
export type RagStatus = RagPreprocessingStatus;

/** RAG 전처리 히스토리 (backend 최소 필수 필드) */
export interface RagPreprocessingHistory {
  historyId: number;
  connectionId: number;
  ragType: RagType;
  status: RagPreprocessingStatus;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

/** RAG 전처리 실행 요청 */
export interface RagPreprocessingRequest {
  connectionId: number;
  type?: RagType;    // ★ 필드명 "type" (not "ragType") — 백엔드 인터페이스 기준
  apiKey?: string;   // @deprecated 서버에서 default 모델로 해결. 후속 PR에서 제거 예정
}

/** RAG 전처리 실행 응답 */
export interface RagPreprocessingResponse {
  success: boolean;
  message: string;
  historyId: number;
  status: RagPreprocessingStatus;
  errorMessage?: string;
}

/** RAG 기존 전처리 존재 확인 응답 */
export interface CheckExistingPreprocessingResponse {
  exists: boolean;
}

/** 종합 RAG 상태 (computed) */
export type OverallRagStatus =
  | "not_configured"
  | "pending"
  | "processing"
  | "success"
  | "partial"
  | "failed";

/** 모든 DB의 RAG 히스토리 일괄 조회 응답 */
export interface GetAllRagPreprocessingHistoryResponse {
  historyByConnection: Record<number, RagPreprocessingHistory[]>;
  totalConnections: number;
}

/** 개별 DB RAG 히스토리 조회 요청 */
export interface GetRagPreprocessingHistoryRequest {
  connectionId: number;
}

/** 개별 DB RAG 히스토리 조회 응답 */
export interface GetRagPreprocessingHistoryResponse {
  history: RagPreprocessingHistory[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** 샘플 SQLite 생성 응답 (dbId 포함 — RAG 등록용) */
export interface CreateSampleSqliteResponse {
  connectionId: number;
  message: string;
  dbId?: string; // userId/folderName 형식 — registerSampleDbRag에 사용
}

/** RAG 실행 정보 (위자드 → Connector 전달용) */
export interface RagExecutionInfo {
  executed: boolean;
  connectionId?: number;
  connectionName?: string;
  isSampleDb?: boolean;
  sampleDbId?: string; // registerSampleDbRag용
}
