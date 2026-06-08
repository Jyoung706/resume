/**
 * RAG 전처리 API 서비스
 *
 * RAG 전처리 관련 모든 API 호출을 담당한다.
 * ragPollingStore에서 사용.
 */
import { apiPost } from "@/logic/shared/services/request";
import { getLogger } from "@/logic/shared/utils/logger";
import type {
  GetRagPreprocessingHistoryRequest,
  GetRagPreprocessingHistoryResponse,
  GetAllRagPreprocessingHistoryResponse,
  CheckExistingPreprocessingResponse,
  RagPreprocessingRequest,
  RagPreprocessingResponse,
} from "@/logic/common/db/types/dbConnection";

const logger = getLogger("RagService");

/** 개별 DB RAG 전처리 히스토리 조회 */
async function getRagHistory(
  request: GetRagPreprocessingHistoryRequest,
): Promise<GetRagPreprocessingHistoryResponse> {
  try {
    return await apiPost<GetRagPreprocessingHistoryResponse>(
      "/db-connection/rag/history",
      request,
    );
  } catch (error) {
    logger.error("getRagHistory 실패:", error);
    return { history: [], total: 0, page: 1, limit: 20, totalPages: 0 };
  }
}

/** 모든 DB의 RAG 전처리 히스토리 일괄 조회 */
async function getAllRagHistory(): Promise<GetAllRagPreprocessingHistoryResponse> {
  try {
    return await apiPost<GetAllRagPreprocessingHistoryResponse>(
      "/db-connection/rag/history/all",
      {},
    );
  } catch (error) {
    logger.error("getAllRagHistory 실패:", error);
    return { historyByConnection: {}, totalConnections: 0 };
  }
}

/** RAG 기존 전처리 존재 확인 */
async function checkExistingPreprocessing(
  connectionId: number,
): Promise<CheckExistingPreprocessingResponse> {
  try {
    return await apiPost<CheckExistingPreprocessingResponse>(
      "/db-connection/rag/check-existing",
      { connectionId },
    );
  } catch (error) {
    logger.error("checkExistingPreprocessing 실패:", error);
    return { exists: false };
  }
}

/** RAG 전처리 실행 요청 */
async function requestPreprocessing(
  request: RagPreprocessingRequest,
): Promise<RagPreprocessingResponse> {
  try {
    return await apiPost<RagPreprocessingResponse>(
      "/db-connection/rag/preprocess",
      request,
    );
  } catch (error) {
    logger.error("requestPreprocessing 실패:", error);
    throw error; // 전처리 실패는 호출부에서 핸들링
  }
}

export const ragService = {
  getRagHistory,
  getAllRagHistory,
  checkExistingPreprocessing,
  requestPreprocessing,
};
