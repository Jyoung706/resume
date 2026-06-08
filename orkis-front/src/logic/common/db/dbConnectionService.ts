/**
 * DB Connection Service — API 통신 계층
 * orkis-front dbConnectionService 이식 (필요 엔드포인트만)
 */
import { apiPost } from "@/logic/shared/services/request";
import { getLogger } from "@/logic/shared/utils/logger";
import type {
  DbConnectionListResponse,
  DbType,
  DbConnectionDetail,
  CreateDbConnectionRequest,
  CreateDbConnectionResponse,
  UpdateDbConnectionRequest,
  TestNewConnectionRequest,
  CreateSqliteRequest,
  CheckSqliteExistsResponse,
  CreateSampleSqliteResponse,
  GetAllRagPreprocessingHistoryResponse,
  GetRagPreprocessingHistoryRequest,
  GetRagPreprocessingHistoryResponse,
  TestDbConnectionResponse,
} from "@/logic/common/db/types/dbConnection";

const logger = getLogger("DbConnectionService");

/** DB 연결 목록 조회 */
async function getDbConnections(): Promise<DbConnectionListResponse> {
  try {
    return await apiPost<DbConnectionListResponse>("/db-connection/list", {});
  } catch (error) {
    logger.error("getDbConnections 실패:", error);
    return { connections: [], total: 0 };
  }
}

/** 모든 DB의 RAG 전처리 히스토리 일괄 조회 */
async function getAllRagPreprocessingHistory(): Promise<GetAllRagPreprocessingHistoryResponse> {
  try {
    return await apiPost<GetAllRagPreprocessingHistoryResponse>(
      "/db-connection/rag/history/all",
      {}
    );
  } catch (error) {
    logger.error("getAllRagPreprocessingHistory 실패:", error);
    return { historyByConnection: {}, totalConnections: 0 };
  }
}

/** 개별 DB RAG 전처리 히스토리 조회 */
async function getRagPreprocessingHistory(
  request: GetRagPreprocessingHistoryRequest
): Promise<GetRagPreprocessingHistoryResponse> {
  try {
    return await apiPost<GetRagPreprocessingHistoryResponse>(
      "/db-connection/rag/history",
      request
    );
  } catch (error) {
    logger.error("getRagPreprocessingHistory 실패:", error);
    return { history: [], total: 0, page: 1, limit: 20, totalPages: 0 };
  }
}

/** DB 연결 테스트 (저장된 연결) */
async function testDbConnection(
  connectionId: number
): Promise<TestDbConnectionResponse> {
  return await apiPost<TestDbConnectionResponse>("/db-connection/dbCheck", {
    connectionId,
  });
}

/** 저장 전 새 연결 테스트 */
async function testNewConnection(
  params: TestNewConnectionRequest
): Promise<TestDbConnectionResponse> {
  return await apiPost<TestDbConnectionResponse>("/db-connection/dbCheck", params);
}

/** DB 타입 목록 조회 (백엔드는 DbType[] 배열 직접 반환) */
async function getDbTypes(): Promise<DbType[]> {
  try {
    return await apiPost<DbType[]>("/db-connection/types", {});
  } catch (error) {
    logger.error("getDbTypes 실패:", error);
    return [];
  }
}

/** DB 연결 상세 조회 */
async function getDbConnectionDetail(
  connectionId: number
): Promise<DbConnectionDetail | null> {
  try {
    return await apiPost<DbConnectionDetail>(
      `/db-connection/detail/${connectionId}`,
      {}
    );
  } catch (error) {
    logger.error("getDbConnectionDetail 실패:", error);
    return null;
  }
}

/** DB 연결 생성 */
async function createDbConnection(
  data: CreateDbConnectionRequest
): Promise<CreateDbConnectionResponse> {
  return await apiPost<CreateDbConnectionResponse>("/db-connection/create", data);
}

/** DB 연결 수정 */
async function updateDbConnection(
  connectionId: number,
  data: UpdateDbConnectionRequest
): Promise<void> {
  await apiPost(`/db-connection/update/${connectionId}`, data);
}

/** DB 연결 삭제 */
async function deleteDbConnection(connectionId: number): Promise<void> {
  await apiPost(`/db-connection/delete/${connectionId}`, {});
}

/** 샘플 SQLite 생성 + 연결 등록 (dbId 포함 — RAG 등록용) */
async function createSampleSqlite(data?: {
  connectionName?: string;
  description?: string;
}): Promise<CreateSampleSqliteResponse> {
  return await apiPost<CreateSampleSqliteResponse>(
    "/db-connection/create-sample-sqlite",
    data || {},
  );
}

/** 빈 SQLite 생성 + 연결 등록 */
async function createSqlite(
  data: CreateSqliteRequest
): Promise<CreateDbConnectionResponse> {
  return await apiPost<CreateDbConnectionResponse>(
    "/db-connection/create-sqlite",
    data
  );
}

/** SQLite 파일 업로드 + 연결 등록 */
async function uploadSqlite(
  file: File,
  data: { connectionName: string; databaseName: string; description?: string }
): Promise<CreateDbConnectionResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("connectionName", data.connectionName);
  formData.append("databaseName", data.databaseName);
  if (data.description) formData.append("description", data.description);

  // FormData는 apiPost 대신 직접 fetch 사용 (Content-Type 자동 설정)
  const { API_BASE } = await import("@/logic/shared/services/request");
  const res = await fetch(`${API_BASE}/db-connection/upload-sqlite`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "SQLite 업로드 실패");
  }
  return await res.json();
}

/** SQLite 파일 존재 확인 */
async function checkSqliteExists(
  fileName: string
): Promise<CheckSqliteExistsResponse> {
  try {
    return await apiPost<CheckSqliteExistsResponse>(
      "/db-connection/check-sqlite-exists",
      { fileName }
    );
  } catch (error) {
    logger.error("checkSqliteExists 실패:", error);
    return { exists: false };
  }
}

/** 샘플 DB RAG 등록 (기존 RAG 삭제 → 새 이력 생성) */
async function registerSampleDbRag(data: {
  connectionId: number;
  dbId: string;
}): Promise<{ success: boolean; message: string }> {
  return await apiPost("/db-connection/register-sample-db-rag", data);
}

export const dbConnectionService = {
  getDbConnections,
  getAllRagPreprocessingHistory,
  getRagPreprocessingHistory,
  testDbConnection,
  testNewConnection,
  getDbTypes,
  getDbConnectionDetail,
  createDbConnection,
  updateDbConnection,
  deleteDbConnection,
  createSampleSqlite,
  createSqlite,
  uploadSqlite,
  checkSqliteExists,
  registerSampleDbRag,
};
