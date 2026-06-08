import { Dao, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import type { PoolClient } from "pg";
import type {
  RagPreprocessingHistory,
  RagPreprocessingRequestType,
  RagPreprocessingStatus
} from "@orkis-interface/backend/db-connection";

interface CreateHistoryParams {
  connectionId: number;
  userId: string;
  requestType: RagPreprocessingRequestType;
  ragType: number;
  dbType: number;
  dbId: string;
  apiKey: string;
  requestUrl: string;
  requestPayload: Record<string, any>;
  status: RagPreprocessingStatus;
}

interface UpdateHistoryWithResponseParams {
  historyId: number;
  responseStatus?: number;
  responseBody?: Record<string, any>;
  status: RagPreprocessingStatus;
  errorMessage?: string;
}

interface GetHistoryParams {
  connectionId?: number;
  status?: RagPreprocessingStatus;
  requestType?: RagPreprocessingRequestType;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
}

@Dao("RagPreprocessingDao")
export class RagPreprocessingDao {
  @InjectConnection("main")
  private pool!: PoolClient;

  /**
   * RAG 전처리 이력 생성
   */
  async createHistory(params: CreateHistoryParams): Promise<number> {
    const query = `
      INSERT INTO rag_preprocessing_history (
        connection_id,
        user_id,
        request_type,
        rag_type,
        db_type,
        db_id,
        api_key,
        request_url,
        request_payload,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      params.connectionId,
      params.userId,
      params.requestType,
      params.ragType,
      params.dbType,
      params.dbId,
      params.apiKey,
      params.requestUrl,
      JSON.stringify(params.requestPayload),
      params.status
    ];

    try {
      await this.pool.query(query, values);
      const selectResult = await this.pool.query(
        `SELECT history_id FROM rag_preprocessing_history
         WHERE connection_id = ? AND user_id = ? AND request_type = ? AND rag_type = ?
         ORDER BY history_id DESC LIMIT 1`,
        [params.connectionId, params.userId, params.requestType, params.ragType]
      );
      const historyId = selectResult.rows[0].history_id;
      return historyId;
    } catch (error) {
      logger.error(`[RagPreprocessingDao] RAG 전처리 이력 생성 실패`, error);
      throw error;
    }
  }

  /**
   * 처리 상태 업데이트
   */
  async updateStatus(
    historyId: number,
    status: RagPreprocessingStatus
  ): Promise<void> {
    const query = `
      UPDATE rag_preprocessing_history
      SET status = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE history_id = ?
    `;

    const values = [status, historyId];

    try {
      await this.pool.query(query, values);
    } catch (error) {
      logger.error(
        `[RagPreprocessingDao] RAG 전처리 상태 업데이트 실패`,
        error
      );
      throw error;
    }
  }

  /**
   * 응답 정보와 함께 이력 업데이트
   */
  async updateHistoryWithResponse(
    params: UpdateHistoryWithResponseParams
  ): Promise<void> {
    const query = `
      UPDATE rag_preprocessing_history
      SET response_status = ?,
          response_body = ?,
          status = ?,
          error_message = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE history_id = ?
    `;

    const values = [
      params.responseStatus || null,
      params.responseBody ? JSON.stringify(params.responseBody) : null,
      params.status,
      params.errorMessage || null,
      params.historyId
    ];

    try {
      await this.pool.query(query, values);
    } catch (error) {
      logger.error(
        `[RagPreprocessingDao] RAG 전처리 이력 응답 업데이트 실패`,
        error
      );
      throw error;
    }
  }

  /**
   * 전처리 이력 조회
   */
  async getHistory(
    userId: string,
    params: GetHistoryParams
  ): Promise<{ history: RagPreprocessingHistory[]; total: number }> {
    // 조건절 구성
    const conditions: string[] = ["user_id = ?"];
    const values: any[] = [userId];

    if (params.connectionId !== undefined) {
      conditions.push(`connection_id = ?`);
      values.push(params.connectionId);
    }

    if (params.status) {
      conditions.push(`status = ?`);
      values.push(params.status);
    }

    if (params.requestType) {
      conditions.push(`request_type = ?`);
      values.push(params.requestType);
    }

    if (params.startDate) {
      conditions.push(`created_at >= ?`);
      values.push(params.startDate);
    }

    if (params.endDate) {
      conditions.push(`created_at <= ?`);
      values.push(params.endDate);
    }

    const whereClause =
      conditions.length > 0 ? conditions.join(" AND ") : "1=1";

    // 총 개수 조회
    const countQuery = `
      SELECT COUNT(*) as total
      FROM rag_preprocessing_history
      WHERE ${whereClause}
    `;

    // 데이터 조회
    const offset = (params.page - 1) * params.limit;
    const dataQuery = `
      SELECT
        history_id,
        connection_id,
        user_id,
        request_type,
        rag_type,
        db_type,
        db_id,
        api_key,
        request_url,
        request_payload,
        response_status,
        response_body,
        status,
        error_message,
        request_started_at,
        request_completed_at,
        processing_duration_ms,
        created_at,
        updated_at
      FROM rag_preprocessing_history
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const dataValues = [...values, params.limit, offset];

    try {
      const [countResult, dataResult] = await Promise.all([
        this.pool.query(countQuery, values),
        this.pool.query(dataQuery, dataValues)
      ]);

      const total = parseInt(countResult.rows[0].total, 10);
      const history = dataResult.rows.map((row: any) =>
        this.mapRowToHistory(row)
      );

      // 상세 로그 출력 (디버깅용)
      if (history.length > 0) {
        const statusSummary = history.map((h: RagPreprocessingHistory) => ({
          historyId: h.historyId,
          ragType: h.ragType,
          status: h.status
        }));
      } else {
      }

      return { history, total };
    } catch (error) {
      logger.error(`[RagPreprocessingDao] RAG 전처리 이력 조회 실패`, error);
      throw error;
    }
  }

  /**
   * 특정 이력 조회
   * @param historyId 이력 ID
   * @param userId 사용자 ID (빈 문자열이면 userId 조건 없이 조회)
   */
  async getHistoryById(
    historyId: number,
    userId: string
  ): Promise<RagPreprocessingHistory | null> {
    // userId가 비어있으면 historyId만으로 조회 (내부 폴링용)
    const hasUserId = userId && userId.trim() !== "";

    const query = hasUserId
      ? `
        SELECT
          history_id, connection_id, user_id, request_type, rag_type,
          db_type, db_id, api_key, request_url, request_payload,
          response_status, response_body, status, error_message,
          request_started_at, request_completed_at, processing_duration_ms,
          created_at, updated_at
        FROM rag_preprocessing_history
        WHERE history_id = ? AND user_id = ?
      `
      : `
        SELECT
          history_id, connection_id, user_id, request_type, rag_type,
          db_type, db_id, api_key, request_url, request_payload,
          response_status, response_body, status, error_message,
          request_started_at, request_completed_at, processing_duration_ms,
          created_at, updated_at
        FROM rag_preprocessing_history
        WHERE history_id = ?
      `;

    const values = hasUserId ? [historyId, userId] : [historyId];

    try {
      const result = await this.pool.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      const history = this.mapRowToHistory(result.rows[0]);
      return history;
    } catch (error) {
      logger.error(`[RagPreprocessingDao] RAG 전처리 이력 조회 실패`, error);
      throw error;
    }
  }

  /**
   * DB Row를 RagPreprocessingHistory 객체로 변환
   */
  /**
   * 이전 이력 삭제 (같은 connectionId, ragType의 이전 이력)
   * @param connectionId DB 연결 ID
   * @param ragType RAG 타입 (SCHEMA 또는 DATA)
   * @param userId 사용자 ID
   */
  async deletePreviousHistory(
    connectionId: number,
    ragType: number,
    userId: string
  ): Promise<void> {
    const query = `
      DELETE FROM rag_preprocessing_history
      WHERE connection_id = ?
        AND rag_type = ?
        AND user_id = ?
    `;

    try {
      const result = await this.pool.query(query, [
        connectionId,
        ragType,
        userId
      ]);
    } catch (error) {
      logger.error(
        `[RagPreprocessingDao] 이전 이력 삭제 실패 - connectionId: ${connectionId}, ragType: ${ragType}`,
        error
      );
      throw error;
    }
  }

  /**
   * 특정 ragType의 최신 이력 조회
   * @param connectionId DB 연결 ID
   * @param ragType RAG 타입
   * @param userId 사용자 ID
   */
  async getLatestHistoryByType(
    connectionId: number,
    ragType: number,
    userId: string
  ): Promise<RagPreprocessingHistory | null> {
    const query = `
      SELECT *
      FROM rag_preprocessing_history
      WHERE connection_id = ?
        AND rag_type = ?
        AND user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `;

    try {
      const result = await this.pool.query(query, [
        connectionId,
        ragType,
        userId
      ]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToHistory(result.rows[0]);
    } catch (error) {
      logger.error(
        `[RagPreprocessingDao] 최신 이력 조회 실패 - connectionId: ${connectionId}, ragType: ${ragType}`,
        error
      );
      throw error;
    }
  }

  /**
   * 사용자의 진행중인 프리프로세싱 조회
   * @param userId 사용자 ID
   */
  async getProcessingHistoryByUser(
    userId: string
  ): Promise<RagPreprocessingHistory[]> {
    const query = `
      SELECT *
      FROM rag_preprocessing_history
      WHERE user_id = ?
        AND status IN ('pending', 'processing')
      ORDER BY created_at DESC
    `;

    try {
      const result = await this.pool.query(query, [userId]);
      return result.rows.map((row) => this.mapRowToHistory(row));
    } catch (error) {
      logger.error(
        `[RagPreprocessingDao] 진행중인 프리프로세싱 조회 실패 - userId: ${userId}`,
        error
      );
      throw error;
    }
  }

  /**
   * 모든 processing 상태인 이력 조회 (애플리케이션 시작 시 폴링 재시작용)
   */
  async getAllProcessingHistories(): Promise<RagPreprocessingHistory[]> {
    const query = `
      SELECT *
      FROM rag_preprocessing_history
      WHERE status = 'processing'
      ORDER BY created_at DESC
    `;

    try {
      const result = await this.pool.query(query);
      return result.rows.map((row) => this.mapRowToHistory(row));
    } catch (error) {
      logger.error(
        `[RagPreprocessingDao] Processing 상태 이력 조회 실패`,
        error
      );
      throw error;
    }
  }

  /**
   * 특정 connectionId와 ragType의 진행중인 프리프로세싱 조회
   * @param connectionId DB 연결 ID
   * @param ragType RAG 타입 (RagType.SCHEMA=1 또는 RagType.DATA=2)
   * @param userId 사용자 ID
   */
  async getProcessingHistoryByConnectionAndType(
    connectionId: number,
    ragType: number,
    userId: string
  ): Promise<RagPreprocessingHistory[]> {
    const query = `
      SELECT *
      FROM rag_preprocessing_history
      WHERE connection_id = ?
        AND rag_type = ?
        AND user_id = ?
        AND status IN ('pending', 'processing')
      ORDER BY created_at DESC
    `;

    try {
      const result = await this.pool.query(query, [
        connectionId,
        ragType,
        userId
      ]);
      return result.rows.map((row) => this.mapRowToHistory(row));
    } catch (error) {
      logger.error(
        `[RagPreprocessingDao] 진행중인 프리프로세싱 조회 실패 - connectionId: ${connectionId}, ragType: ${ragType}, userId: ${userId}`,
        error
      );
      throw error;
    }
  }

  /**
   * 사용자의 모든 RAG 전처리 이력 삭제
   * @param userId 사용자 ID
   * @param excludeConnectionId 제외할 connectionId (옵션)
   */
  async deleteAllUserRagHistory(
    userId: string,
    excludeConnectionId?: number
  ): Promise<number> {
    let query: string;
    let values: any[];

    if (excludeConnectionId !== undefined) {
      query = `
        DELETE FROM rag_preprocessing_history
        WHERE user_id = ?
          AND connection_id != ?
      `;
      values = [userId, excludeConnectionId];
    } else {
      query = `
        DELETE FROM rag_preprocessing_history
        WHERE user_id = ?
      `;
      values = [userId];
    }

    try {
      const result = await this.pool.query(query, values);
      const deletedCount = result.rowCount || 0;
      return deletedCount;
    } catch (error) {
      logger.error(
        `[RagPreprocessingDao] 사용자 RAG 이력 삭제 실패 - userId: ${userId}`,
        error
      );
      throw error;
    }
  }

  /**
   * 사용자의 성공한 RAG 전처리 정보 조회 (가장 최근 항목만)
   * @param userId 사용자 ID
   */
  async getSuccessfulRagInfo(userId: string): Promise<{
    connectionId: number;
    schemaHistory?: RagPreprocessingHistory;
    dataHistory?: RagPreprocessingHistory;
  } | null> {
    const query = `
      WITH latest_success AS (
        SELECT
          connection_id,
          rag_type,
          MAX(updated_at) as latest_updated
        FROM rag_preprocessing_history
        WHERE user_id = ?
          AND status = 'success'
          AND request_type = 'preprocess'
        GROUP BY connection_id, rag_type
      )
      SELECT rph.*
      FROM rag_preprocessing_history rph
      INNER JOIN latest_success ls
        ON rph.connection_id = ls.connection_id
        AND rph.rag_type = ls.rag_type
        AND rph.updated_at = ls.latest_updated
      WHERE rph.user_id = ?
        AND rph.status = 'success'
      ORDER BY rph.connection_id DESC, rph.rag_type ASC
    `;

    try {
      const result = await this.pool.query(query, [userId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      // 가장 최근 connectionId의 스키마/데이터 이력 찾기
      // RagType.SCHEMA = 1, RagType.DATA = 2
      const connectionId = result.rows[0].connection_id;
      const schemaHistory = result.rows.find((row) => row.rag_type === 1);
      const dataHistory = result.rows.find((row) => row.rag_type === 2);

      return {
        connectionId,
        schemaHistory: schemaHistory
          ? this.mapRowToHistory(schemaHistory)
          : undefined,
        dataHistory: dataHistory ? this.mapRowToHistory(dataHistory) : undefined
      };
    } catch (error) {
      logger.error(
        `[RagPreprocessingDao] 성공한 RAG 정보 조회 실패 - userId: ${userId}`,
        error
      );
      throw error;
    }
  }

  private toISO(val: any): string {
    if (!val) return new Date().toISOString();
    if (val instanceof Date) return val.toISOString();
    return String(val);
  }

  private mapRowToHistory(row: any): RagPreprocessingHistory {
    return {
      historyId: row.history_id,
      connectionId: row.connection_id,
      userId: row.user_id,
      requestType: row.request_type,
      ragType: row.rag_type, // DB 값이 이미 RagType (SCHEMA=1, DATA=2)
      dbType: row.db_type,
      dbId: row.db_id,
      apiKey: row.api_key,
      requestUrl: row.request_url,
      requestPayload: row.request_payload,
      responseStatus: row.response_status,
      responseBody: row.response_body,
      status: row.status,
      errorMessage: row.error_message,
      requestStartedAt: this.toISO(row.request_started_at),
      requestCompletedAt: row.request_completed_at
        ? this.toISO(row.request_completed_at)
        : undefined,
      processingDurationMs: row.processing_duration_ms,
      createdAt: this.toISO(row.created_at),
      updatedAt: this.toISO(row.updated_at)
    };
  }
}
