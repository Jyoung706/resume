/**
 * DB 스키마 관련 타입 정의
 * 테이블/컬럼 조회 및 CRUD, 데이터 삽입
 */

// ====================================================================
// 스키마 조회
// ====================================================================

/** DB 테이블 정보 */
export interface DbSchemaTable {
  tableName: string;
  tableType?: string;
  tableSchema?: string;
  tableComment?: string;
  rowCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

/** DB 컬럼 정보 */
export interface DbSchemaColumn {
  columnName: string;
  dataType: string;
  columnType?: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey?: boolean;
  defaultValue?: string;
  columnComment?: string;
  ordinalPosition?: number;
  characterMaximumLength?: number;
  numericPrecision?: number;
  numericScale?: number;
}

/** 스키마 조회 응답 (테이블 목록) */
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

/** 테이블 상세 조회 응답 (컬럼 + 샘플 데이터) */
export interface GetTableDetailResponse {
  success: boolean;
  tableName: string;
  tableInfo: DbSchemaTable;
  columns: DbSchemaColumn[];
  sampleData?: Array<Record<string, unknown>>;
  totalRows?: number;
  message?: string;
}

// ====================================================================
// 테이블 CRUD
// ====================================================================

/** 테이블 생성 시 컬럼 정의 */
export interface CreateTableColumn {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  defaultValue?: string;
  columnComment?: string;
}

/** 테이블 생성 요청 */
export interface CreateTableRequest {
  connectionId: number;
  tableName: string;
  tableComment?: string;
  columns: CreateTableColumn[];
}

/** 테이블 수정 요청 */
export interface UpdateTableRequest {
  connectionId: number;
  tableName: string;
  newTableName?: string;
  tableComment?: string;
}

/** 테이블 삭제 요청 */
export interface DeleteTableRequest {
  connectionId: number;
  tableName: string;
}

// ====================================================================
// 컬럼 CRUD
// ====================================================================

/** 컬럼 추가 요청 */
export interface AddColumnRequest {
  connectionId: number;
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable?: boolean;
  isPrimaryKey?: boolean;
  defaultValue?: string;
  columnComment?: string;
}

/** 컬럼 수정 요청 */
export interface UpdateColumnRequest {
  connectionId: number;
  tableName: string;
  columnName: string;
  newColumnName?: string;
  dataType?: string;
  isNullable?: boolean;
  defaultValue?: string | null;
  columnComment?: string;
}

/** 컬럼 삭제 요청 */
export interface DeleteColumnRequest {
  connectionId: number;
  tableName: string;
  columnName: string;
}

// ====================================================================
// 데이터 삽입
// ====================================================================

/** 테이블 데이터 삽입 요청 */
export interface InsertTableDataRequest {
  connectionId: number;
  tableName: string;
  data: Record<string, unknown>;
}

// ====================================================================
// 공통 응답
// ====================================================================

/** 스키마 조작 공통 응답 */
export interface SchemaOperationResponse {
  success: boolean;
  message: string;
}
