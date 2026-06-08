/**
 * DB Schema Service — 스키마 조회 및 CRUD API 통신
 */
import { apiPost } from "@/logic/shared/services/request";
import { getLogger } from "@/logic/shared/utils/logger";
import type {
  GetDbSchemaResponse,
  GetTableDetailResponse,
  CreateTableRequest,
  UpdateTableRequest,
  DeleteTableRequest,
  AddColumnRequest,
  UpdateColumnRequest,
  DeleteColumnRequest,
  InsertTableDataRequest,
  SchemaOperationResponse,
} from "@/logic/common/db/types/dbSchema";

const logger = getLogger("DbSchemaService");

// ====================================================================
// 스키마 조회
// ====================================================================

/** 테이블 목록 조회 */
async function getDbSchema(connectionId: number): Promise<GetDbSchemaResponse> {
  try {
    return await apiPost<GetDbSchemaResponse>("/db-connection/schema/list", {
      connectionId,
    });
  } catch (error) {
    logger.error("getDbSchema 실패:", error);
    return {
      success: false,
      connectionId,
      connectionName: "",
      dbTypeName: "",
      databaseName: "",
      tables: [],
      totalTables: 0,
      message: error instanceof Error ? error.message : "스키마 조회 실패",
    };
  }
}

/** 테이블 상세 조회 (컬럼 + 샘플 데이터) */
async function getTableDetail(
  connectionId: number,
  tableName: string,
  includeData: boolean = false,
  dataLimit: number = 10,
): Promise<GetTableDetailResponse> {
  return await apiPost<GetTableDetailResponse>(
    "/db-connection/schema/table/detail",
    { connectionId, tableName, includeData, dataLimit },
  );
}

// ====================================================================
// 테이블 CRUD
// ====================================================================

/** 테이블 생성 */
async function createTable(
  req: CreateTableRequest,
): Promise<SchemaOperationResponse> {
  return await apiPost<SchemaOperationResponse>(
    "/db-connection/schema/table/create",
    req,
  );
}

/** 테이블 수정 (이름/설명 변경) */
async function updateTable(
  req: UpdateTableRequest,
): Promise<SchemaOperationResponse> {
  return await apiPost<SchemaOperationResponse>(
    "/db-connection/schema/table/update",
    req,
  );
}

/** 테이블 삭제 */
async function deleteTable(
  req: DeleteTableRequest,
): Promise<SchemaOperationResponse> {
  return await apiPost<SchemaOperationResponse>(
    "/db-connection/schema/table/delete",
    req,
  );
}

// ====================================================================
// 컬럼 CRUD
// ====================================================================

/** 컬럼 추가 */
async function addColumn(
  req: AddColumnRequest,
): Promise<SchemaOperationResponse> {
  return await apiPost<SchemaOperationResponse>(
    "/db-connection/schema/column/add",
    req,
  );
}

/** 컬럼 수정 */
async function updateColumn(
  req: UpdateColumnRequest,
): Promise<SchemaOperationResponse> {
  return await apiPost<SchemaOperationResponse>(
    "/db-connection/schema/column/update",
    req,
  );
}

/** 컬럼 삭제 */
async function deleteColumn(
  req: DeleteColumnRequest,
): Promise<SchemaOperationResponse> {
  return await apiPost<SchemaOperationResponse>(
    "/db-connection/schema/column/delete",
    req,
  );
}

// ====================================================================
// 데이터 삽입
// ====================================================================

/** 테이블 데이터 삽입 */
async function insertTableData(
  req: InsertTableDataRequest,
): Promise<SchemaOperationResponse> {
  return await apiPost<SchemaOperationResponse>(
    "/db-connection/schema/table/data/insert",
    req,
  );
}

// ====================================================================
// Export
// ====================================================================

export const dbSchemaService = {
  getDbSchema,
  getTableDetail,
  createTable,
  updateTable,
  deleteTable,
  addColumn,
  updateColumn,
  deleteColumn,
  insertTableData,
};
