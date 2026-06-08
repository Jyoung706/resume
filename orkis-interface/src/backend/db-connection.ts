/**
 * DB 연결 정보 관리 인터페이스
 *
 * @description
 * 사용자별 데이터베이스 연결 정보를 관리하기 위한 인터페이스 정의
 *
 * @module backend/db-connection
 */

/**
 * DB 타입 정보
 */
export interface DbType {
  dbTypeId: number;
  typeName: string; // 'PostgreSQL' | 'MySQL' | 'MSSQL' | 'Oracle' | 'SQLite' | 'MariaDB' | 'MongoDB' | 'Redis' | 'Cassandra' | 'DynamoDB' | 'Firebase' | 'Elasticsearch' | 'Neo4j' | 'InfluxDB'
  displayName: string;
  defaultPort?: number;
  driverClass?: string;
  connectionStringTemplate?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // UI 표시용 필드 (2025-11-03 추가)
  category?: string; // 'Relational' | 'NoSQL' | 'Graph' | 'Search' | 'Time-Series'
  logoUrl?: string;
  color?: string; // Hex color code
  features?: string[]; // 주요 특징 목록
  useCases?: string[]; // 사용 사례 목록
  popularity?: number; // 0-100
  displayOrder?: number; // 화면 표시 순서
}

/**
 * DB 연결 정보 (전체)
 */
export interface DbConnection {
  connectionId: number;
  userId: string;
  dbTypeId: number;

  // 기본 연결 정보
  connectionName: string;
  description?: string;

  // 공통 연결 파라미터
  host?: string;
  port?: number;
  databaseName: string;
  username?: string;
  passwordEncrypted?: Buffer; // 암호화된 비밀번호 (표시용 아님)

  // SQLite 전용
  filePath?: string;

  // Oracle 전용
  oracleSid?: string;
  oracleServiceName?: string;

  // 추가 연결 옵션
  additionalParams?: Record<string, any>;

  // 연결 풀 설정
  minPoolSize: number;
  maxPoolSize: number;
  connectionTimeout: number;

  // 연결 상태 및 관리
  isActive: boolean;
  isDefault: boolean;
  lastTested?: string;
  lastTestStatus?: 'success' | 'failed' | 'pending';
  lastTestMessage?: string;

  // 메타데이터
  createdAt: string;
  updatedAt: string;
  lastUsed?: string;
}

/**
 * DB 연결 생성 요청
 */
export interface CreateDbConnectionRequest {
  dbTypeId: number;
  connectionName: string;
  description?: string;

  // 공통 파라미터
  host?: string;
  port?: number;
  databaseName: string;
  username?: string;
  password?: string; // 평문 비밀번호 (전송 시 암호화됨)

  // SQLite 전용
  filePath?: string;

  // Oracle 전용
  oracleSid?: string;
  oracleServiceName?: string;

  // 추가 옵션
  additionalParams?: Record<string, any>;

  // 연결 풀 설정
  minPoolSize?: number;
  maxPoolSize?: number;
  connectionTimeout?: number;

  // 기본 연결 여부
  isDefault?: boolean;
}

/**
 * DB 연결 수정 요청
 */
export interface UpdateDbConnectionRequest {
  connectionName?: string;
  description?: string;

  // 연결 정보 업데이트
  host?: string;
  port?: number;
  databaseName?: string;
  username?: string;
  password?: string; // 평문 비밀번호 (전송 시 암호화됨)

  // SQLite 전용
  filePath?: string;

  // Oracle 전용
  oracleSid?: string;
  oracleServiceName?: string;

  // 추가 옵션
  additionalParams?: Record<string, any>;

  // 연결 풀 설정
  minPoolSize?: number;
  maxPoolSize?: number;
  connectionTimeout?: number;

  // 상태 관리
  isActive?: boolean;
  isDefault?: boolean;
}

/**
 * DB 연결 테스트 요청
 */
export interface TestDbConnectionRequest {
  connectionId?: number; // 기존 연결 테스트

  // 또는 임시 연결 정보로 테스트
  dbTypeId?: number;
  host?: string;
  port?: number;
  databaseName?: string;
  username?: string;
  password?: string;
  filePath?: string; // SQLite
  oracleSid?: string;
  oracleServiceName?: string;
  additionalParams?: Record<string, any>;
}

/**
 * DB 연결 테스트 응답
 */
export interface TestDbConnectionResponse {
  success: boolean;
  status: 'success' | 'failed' | 'timeout';
  message: string;
  responseTimeMs?: number;
  errorCode?: string;
  errorDetails?: string;
  serverVersion?: string; // 연결 성공 시 DB 서버 버전 정보
}

/**
 * DB 연결 목록 응답
 */
export interface DbConnectionListResponse {
  connections: Array<Omit<DbConnection, 'passwordEncrypted'> & { typeName?: string }>; // 비밀번호 제외, DB 타입명 포함
  total: number;
}

/**
 * DB 연결 상세 응답 (Frontend용)
 *
 * 보안 정책 (D-XX, 2026-05-28): 사용자가 본인이 등록한 비밀번호를 EditDialog 에서
 * 확인·수정할 수 있도록 평문 password 를 응답에 포함한다. 인증된 동일 user_id 의
 * 본인 데이터에 한정되며, passwordEncrypted (Buffer) 는 여전히 응답에서 제외한다.
 */
export interface DbConnectionDetail extends Omit<DbConnection, 'passwordEncrypted'> {
  dbType?: DbType; // DB 타입 정보 포함
  password?: string; // 평문 비밀번호 (등록 시 사용자가 입력한 값을 복호화하여 반환)
}

/**
 * DB 연결 이력 정보
 */
export interface DbConnectionHistory {
  historyId: number;
  connectionId?: number;
  userId: string;

  // 이벤트 정보
  eventType: 'test' | 'connect' | 'disconnect' | 'query' | 'error';
  eventStatus: 'success' | 'failed' | 'timeout';

  // 연결 정보 스냅샷
  connectionName?: string;
  dbType?: string;
  host?: string;
  databaseName?: string;

  // 이벤트 상세
  errorMessage?: string;
  errorCode?: string;
  responseTimeMs?: number;

  // 쿼리 정보
  queryPreview?: string;
  rowsAffected?: number;

  // 메타데이터
  createdAt: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * DB 연결 이력 조회 요청
 */
export interface DbConnectionHistoryRequest {
  connectionId?: number; // 특정 연결의 이력
  eventType?: 'test' | 'connect' | 'disconnect' | 'query' | 'error';
  eventStatus?: 'success' | 'failed' | 'timeout';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/**
 * DB 연결 이력 응답
 */
export interface DbConnectionHistoryResponse {
  history: DbConnectionHistory[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * SQLite DB 생성 요청 (2025-11-05)
 */
export interface CreateSQLiteDbRequest {
  databaseName: string; // 생성할 DB 파일명
}

/**
 * SQLite DB 생성 응답 (2025-11-05)
 */
export interface CreateSQLiteDbResponse {
  success: boolean;
  message: string;
  filePath: string; // 생성된 DB 파일 전체 경로
  userId: string;
  databaseName: string;
}

/**
 * SQLite 샘플 DB 생성 요청 (2025-11-19)
 */
export interface CreateSampleSQLiteDbRequest {
  connectionName?: string; // 연결명 (선택적, 미제공 시 자동 생성)
  description?: string; // 설명
}

/**
 * SQLite 샘플 DB 생성 응답 (2025-11-19)
 */
export interface CreateSampleSQLiteDbResponse {
  success: boolean;
  message: string;
  filePath: string; // 생성된 DB 파일 전체 경로
  databaseName: string; // 자동 생성된 DB 이름
  connectionId: number; // 생성된 연결 ID
  connectionName: string; // 생성된 연결명
  dbId?: string; // RAG 등록 시 사용할 DB 식별자 (userId/folderName 형식)
}

/**
 * SQLite DB 파일 등록 요청 (2025-11-05)
 * @deprecated 파일 업로드 방식으로 변경됨 (UploadSQLiteDbRequest 사용)
 */
export interface RegisterSQLiteDbRequest {
  filePath: string; // 등록할 기존 DB 파일 경로
  connectionName: string;
  description?: string;
}

/**
 * SQLite DB 파일 등록 응답 (2025-11-05)
 */
export interface RegisterSQLiteDbResponse {
  success: boolean;
  message: string;
  connectionId: number;
}

/**
 * SQLite DB 파일 업로드 응답 (2025-11-05)
 * 수정: 2025-11-11 - 파일 업로드만 수행하도록 변경 (DB 저장은 저장 버튼 클릭 시)
 */
export interface UploadSQLiteDbResponse {
  success: boolean;
  message: string;
  filePath: string; // 서버에 저장된 파일 경로
  fileSize: number; // 파일 크기 (bytes)
}

/**
 * 업로드 경로에 파일 존재 여부 확인 요청 (2025-11-10)
 */
export interface CheckUploadPathExistsRequest {
  databaseName: string; // 데이터베이스 이름
  filename: string; // 파일명 (확장자 포함)
}

/**
 * 업로드 경로에 파일 존재 여부 확인 응답 (2025-11-10)
 */
export interface CheckUploadPathExistsResponse {
  exists: boolean; // 파일 존재 여부
  filePath?: string; // 파일 경로 (존재할 경우)
  message: string;
}

/**
 * SQLite DB 존재 여부 확인 요청 (2025-11-05)
 */
export interface CheckSQLiteDbExistsRequest {
  databaseName: string; // 확인할 DB 파일명
}

/**
 * SQLite DB 존재 여부 확인 응답 (2025-11-05)
 */
export interface CheckSQLiteDbExistsResponse {
  exists: boolean; // DB 파일 존재 여부
  filePath?: string; // 파일 경로 (존재할 경우)
  fileSize?: number; // 파일 크기 (bytes, 존재할 경우)
  message: string;
}

/**
 * DB 스키마 테이블 정보 (2025-11-06)
 */
export interface DbSchemaTable {
  tableName: string; // 테이블명
  tableType?: string; // 'TABLE' | 'VIEW' | 'SYSTEM TABLE'
  tableSchema?: string; // 스키마명 (PostgreSQL, MySQL 등)
  tableComment?: string; // 테이블 설명
  rowCount?: number; // 행 개수 (선택적)
  createdAt?: string; // 생성 시간
  updatedAt?: string; // 수정 시간
}

/**
 * DB 스키마 컬럼 정보 (2025-11-06)
 */
export interface DbSchemaColumn {
  columnName: string; // 컬럼명
  dataType: string; // 데이터 타입
  columnType?: string; // 전체 타입 정보 (예: VARCHAR(255))
  isNullable: boolean; // NULL 허용 여부
  isPrimaryKey: boolean; // PK 여부
  isForeignKey?: boolean; // FK 여부
  defaultValue?: string; // 기본값
  columnComment?: string; // 컬럼 설명
  ordinalPosition?: number; // 컬럼 순서
  characterMaximumLength?: number; // 문자열 최대 길이
  numericPrecision?: number; // 숫자 정밀도
  numericScale?: number; // 숫자 스케일
}

/**
 * DB 스키마 조회 요청 (2025-11-06)
 */
export interface GetDbSchemaRequest {
  connectionId: number; // 조회할 DB 연결 ID
  tableName?: string; // 특정 테이블만 조회 (선택적)
}

/**
 * DB 스키마 조회 응답 (2025-11-06)
 */
export interface GetDbSchemaResponse {
  success: boolean;
  connectionId: number;
  connectionName: string;
  dbTypeName: string;
  databaseName: string;
  tables: DbSchemaTable[];
  totalTables: number;
  message?: string;
}

/**
 * DB 테이블 상세 조회 요청 (2025-11-06)
 */
export interface GetTableDetailRequest {
  connectionId: number; // DB 연결 ID
  tableName: string; // 테이블명
  includeData?: boolean; // 데이터 샘플 포함 여부 (기본: false)
  dataLimit?: number; // 데이터 샘플 행 수 (기본: 10)
}

/**
 * DB 테이블 상세 조회 응답 (2025-11-06)
 */
export interface GetTableDetailResponse {
  success: boolean;
  tableName: string;
  tableInfo: DbSchemaTable;
  columns: DbSchemaColumn[];
  sampleData?: Array<Record<string, any>>; // 샘플 데이터 (선택적)
  totalRows?: number; // 전체 행 수
  message?: string;
}

/**
 * 테이블 수정 요청 (2025-11-13)
 */
export interface UpdateTableRequest {
  connectionId: number;
  tableName: string;
  newTableName?: string; // 테이블명 변경
  tableComment?: string; // 테이블 설명 변경
}

/**
 * 테이블 수정 응답 (2025-11-13)
 */
export interface UpdateTableResponse {
  success: boolean;
  message: string;
}

/**
 * 테이블 삭제 요청 (2025-11-13)
 */
export interface DeleteTableRequest {
  connectionId: number;
  tableName: string;
}

/**
 * 테이블 삭제 응답 (2025-11-13)
 */
export interface DeleteTableResponse {
  success: boolean;
  message: string;
}

/**
 * 컬럼 수정 요청 (2025-11-13)
 */
export interface UpdateColumnRequest {
  connectionId: number;
  tableName: string;
  columnName: string;
  newColumnName?: string; // 컬럼명 변경
  dataType?: string; // 데이터 타입 변경
  isNullable?: boolean; // NULL 허용 여부 변경
  defaultValue?: string | null; // 기본값 변경
  columnComment?: string; // 컬럼 설명 변경
}

/**
 * 컬럼 수정 응답 (2025-11-13)
 */
export interface UpdateColumnResponse {
  success: boolean;
  message: string;
}

/**
 * 컬럼 삭제 요청 (2025-11-13)
 */
export interface DeleteColumnRequest {
  connectionId: number;
  tableName: string;
  columnName: string;
}

/**
 * 컬럼 삭제 응답 (2025-11-13)
 */
export interface DeleteColumnResponse {
  success: boolean;
  message: string;
}

/**
 * 테이블 생성 시 컬럼 정의 (2025-11-13)
 */
export interface CreateTableColumn {
  columnName: string;
  dataType: string; // 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB' | 'NUMERIC' 등
  isNullable: boolean;
  isPrimaryKey: boolean;
  defaultValue?: string;
  columnComment?: string;
}

/**
 * 테이블 생성 요청 (2025-11-13)
 */
export interface CreateTableRequest {
  connectionId: number;
  tableName: string;
  tableComment?: string;
  columns: CreateTableColumn[];
}

/**
 * 테이블 생성 응답 (2025-11-13)
 */
export interface CreateTableResponse {
  success: boolean;
  message: string;
  tableName: string;
}

/**
 * 컬럼 추가 요청 (2025-11-13)
 */
export interface AddColumnRequest {
  connectionId: number;
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  defaultValue?: string;
  columnComment?: string;
}

/**
 * 컬럼 추가 응답 (2025-11-13)
 */
export interface AddColumnResponse {
  success: boolean;
  message: string;
  tableName: string;
  columnName: string;
}

/**
 * RAG 전처리 요청 타입 (2025-11-16)
 */
export type RagPreprocessingRequestType = 'preprocess' | 'status_check';

/**
 * RAG 전처리 타입 (2025-11-16, 수정: 2025-11-17, 2026-01-06)
 * AI 서버 /preprocess 및 /preprocess/status API 공통 스펙
 * - preprocess 요청: ALL(0), SCHEMA(1), DATA(2) 모두 사용
 * - status 조회: SCHEMA(1), DATA(2)만 사용 (ALL 없음)
 * - DB 저장: SCHEMA(1), DATA(2) 값으로 저장
 */
export enum RagType {
  ALL = 0,      // 스키마 + 데이터 전체 (preprocess 요청에만 사용)
  SCHEMA = 1,   // 스키마
  DATA = 2      // 데이터
}

/**
 * RAG 전처리 상태 (2025-11-16, 수정: 2025-11-17)
 */
export type RagPreprocessingStatus = 'pending' | 'processing' | 'success' | 'failed';

/**
 * RAG 전처리 요청 (2025-11-16)
 */
export interface RagPreprocessingRequest {
  connectionId: number; // DB 연결 ID
  type?: RagType; // RAG 타입 (기본값: 0 = all)
  apiKey: string; // LLM API 인증키
}

/**
 * RAG 전처리 이력 (2025-11-16)
 */
export interface RagPreprocessingHistory {
  historyId: number;
  connectionId: number;
  userId: string;

  // 요청 정보
  requestType: RagPreprocessingRequestType;
  ragType: RagType;
  dbType: number;
  dbId: string;
  apiKey?: string; // Frontend에서는 마스킹 처리

  // 요청/응답 정보
  requestUrl?: string;
  requestPayload?: Record<string, any>;
  responseStatus?: number;
  responseBody?: Record<string, any>;

  // 처리 상태
  status: RagPreprocessingStatus;
  errorMessage?: string;

  // 처리 시간
  requestStartedAt: string;
  requestCompletedAt?: string;
  processingDurationMs?: number;

  // 메타데이터
  createdAt: string;
  updatedAt: string;
}

/**
 * RAG 전처리 요청 응답 (2025-11-16)
 */
export interface RagPreprocessingResponse {
  success: boolean;
  message: string;
  historyId: number; // 생성된 이력 ID
  status: RagPreprocessingStatus;
  errorMessage?: string;
}

/**
 * RAG 전처리 이력 조회 요청 (2025-11-16)
 */
export interface GetRagPreprocessingHistoryRequest {
  connectionId?: number; // 특정 연결의 이력
  status?: RagPreprocessingStatus; // 특정 상태의 이력
  requestType?: RagPreprocessingRequestType; // 특정 요청 타입의 이력
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/**
 * RAG 전처리 이력 조회 응답 (2025-11-16)
 */
export interface GetRagPreprocessingHistoryResponse {
  history: RagPreprocessingHistory[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 모든 DB의 RAG 전처리 이력 일괄 조회 응답 (2026-02-05)
 * 여러 번의 API 호출 대신 한 번에 모든 DB의 RAG 상태를 조회
 */
export interface GetAllRagPreprocessingHistoryResponse {
  /** connectionId를 키로 하는 RAG 이력 맵 */
  historyByConnection: Record<number, RagPreprocessingHistory[]>;
  /** 총 DB 연결 수 */
  totalConnections: number;
}

/**
 * RAG 전처리 상태 조회 요청 (2025-11-17, 수정: 2026-01-06)
 */
export interface RagPreprocessingStatusRequest {
  dbId: string; // DB 식별자
  type: RagType; // 조회할 타입 (1: SCHEMA, 2: DATA) - ALL(0) 사용 불가
  apiKey: string; // LLM API 인증키
}

/**
 * RAG 전처리 상태 조회 응답 (2025-11-17)
 * AI 서버 응답: status 0: 정상, 1: 비정상, 2: 진행중
 */
export interface RagPreprocessingStatusResponse {
  success: boolean;
  result: {
    status: number; // 0: 정상(완료), 1: 비정상(에러), 2: 진행중
  };
  error: string | null;
  timestamp: string;
}

/**
 * 기존 RAG 전처리 정보 존재 확인 요청 (2025-11-24)
 */
export interface CheckExistingRagRequest {
  userId: string;
}

/**
 * 기존 RAG 전처리 정보 존재 확인 응답 (2025-11-24)
 */
export interface CheckExistingRagResponse {
  hasExistingData: boolean; // 기존 RAG 정보 존재 여부
  existingConnection?: {
    connectionId: number;
    connectionName: string;
    databaseName: string;
    schemaStatus?: RagPreprocessingStatus; // 스키마 전처리 상태
    dataStatus?: RagPreprocessingStatus; // 데이터 전처리 상태
    lastUpdated?: string; // 마지막 업데이트 시간
  };
}

/**
 * 테이블 데이터 삽입 요청 (2025-12-21)
 */
export interface InsertTableDataRequest {
  connectionId: number;
  tableName: string;
  data: Record<string, any>; // { columnName: value, ... }
}

/**
 * 테이블 데이터 삽입 응답 (2025-12-21)
 */
export interface InsertTableDataResponse {
  success: boolean;
  message: string;
  insertedId?: number | string; // 삽입된 행의 ID (있는 경우)
}

/**
 * 테이블 데이터 수정 요청 (2025-12-21)
 */
export interface UpdateTableDataRequest {
  connectionId: number;
  tableName: string;
  primaryKeyColumn: string; // PK 컬럼명
  primaryKeyValue: any; // PK 값
  data: Record<string, any>; // { columnName: newValue, ... }
}

/**
 * 테이블 데이터 수정 응답 (2025-12-21)
 */
export interface UpdateTableDataResponse {
  success: boolean;
  message: string;
  affectedRows?: number;
}

/**
 * 테이블 데이터 삭제 요청 (2025-12-21)
 */
export interface DeleteTableDataRequest {
  connectionId: number;
  tableName: string;
  primaryKeyColumn: string; // PK 컬럼명
  primaryKeyValue: any; // PK 값
}

/**
 * 테이블 데이터 삭제 응답 (2025-12-21)
 */
export interface DeleteTableDataResponse {
  success: boolean;
  message: string;
  affectedRows?: number;
}
