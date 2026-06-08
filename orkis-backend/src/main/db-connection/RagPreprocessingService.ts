import { Autowired, Service } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import type {
  GetRagPreprocessingHistoryRequest,
  GetRagPreprocessingHistoryResponse,
  RagPreprocessingHistory,
  RagPreprocessingRequest,
  RagPreprocessingResponse,
  RagPreprocessingStatus
} from "@orkis-interface/backend/db-connection";
import { RagType } from "@orkis-interface/backend/db-connection";
import * as path from "path";
import { DbConnectionDao } from "@/db-connection/DbConnectionDao";
import { RagPreprocessingDao } from "@/db-connection/RagPreprocessingDao";
import { LLMModelService } from "../llm/services/LLMModelService";
import { ChatError, ChatErrorMessages, ChatErrorType } from "../error/ChatError";

// AI 서버 응답 타입 (내부용 - 임시 정의)
interface RagPreprocessingStatusResponse {
  result: {
    status: number; // 0: 정상(완료), 1: 비정상(에러), 2: 진행중
    message?: string;
  };
  error?: string;
  [key: string]: any; // 추가 필드 허용
}

@Service({ name: "RagPreprocessingService" })
export class RagPreprocessingService {
  @Autowired("RagPreprocessingDao")
  private ragPreprocessingDao!: RagPreprocessingDao;

  @Autowired("DbConnectionDao")
  private dbConnectionDao!: DbConnectionDao;

  @Autowired("LLMModelService")
  private llmModelService!: LLMModelService;

  // 폴링 중인 historyId 추적 (중복 폴링 방지)
  private pollingHistoryIds: Set<number> = new Set();

  // 폴링 cancel 신호 — DB 연결 삭제 등으로 진행 중 폴링을 즉시 중단해야 할 때 사용.
  // checkStatus 진입 시 이 Set 에 포함되어있으면 자체 종료.
  // 메모리 leak 방지: cancelPollingByConnectionId 에서 pollingHistoryIds.has 가드로
  // 현재 폴링 중인 historyId 만 add.
  private cancelledHistoryIds: Set<number> = new Set();

  // 초기화 완료 여부
  private initialized: boolean = false;

  /**
   * RAG 서버 URL 가져오기
   */
  private getRAGServerURL(): string {
    return process.env.RAG_SERVER_URL || "https://orkis.kr/api-ai/v1";
  }

  /**
   * 애플리케이션 시작 시 processing 상태인 이력들에 대해 폴링 재시작
   * 첫 번째 API 호출 시 자동으로 실행됨
   */
  async resumeProcessingPolling(): Promise<void> {
    // 이미 초기화되었으면 스킵
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    // Desktop: AI 가 작업 시점에 SQLite status 를 직접 UPDATE 하므로 backend 폴링 재개 불필요
    if (process.env.RUNTIME_MODE === "desktop") {
      return;
    }

    try {
      // processing 상태인 모든 이력 조회
      const processingHistories =
        await this.ragPreprocessingDao.getAllProcessingHistories();

      if (processingHistories.length === 0) {
        return;
      }
      for (const history of processingHistories) {
        if (!history.dbId) {
          continue;
        }
        this.startStatusPolling(
          history.historyId,
          history.dbId,
          history.ragType // RagType.SCHEMA(1) 또는 RagType.DATA(2) 그대로 사용
        );
      }
    } catch (error) {
      logger.error(
        "[RagPreprocessingService] Processing 상태 폴링 재시작 중 오류",
        error
      );
    }
  }

  /**
   * RAG 전처리 요청
   * @param userId 사용자 ID
   * @param request 전처리 요청 정보
   * @returns 전처리 요청 응답
   */
  async requestPreprocessing(
    userId: string,
    request: RagPreprocessingRequest
  ): Promise<RagPreprocessingResponse> {
    try {
      // userId 검증
      if (!userId) {
        throw new Error(
          "사용자 인증이 필요합니다. 로그인 후 다시 시도해주세요."
        );
      }

      const resolved = await this.llmModelService.resolveDefaultForInternal(userId);
      if (!resolved) {
        throw new ChatError(
          ChatErrorMessages[ChatErrorType.MODEL_NOT_CONFIGURED].userMessage,
          ChatErrorType.MODEL_NOT_CONFIGURED,
          400,
          {
            remediation: { action: "register_model", url: "/settings/llm" }
          } as any
        );
      }
      const apiKey = resolved.apiKey;

      // DB 연결 정보 조회
      const connection = await this.dbConnectionDao.findById(
        request.connectionId,
        userId
      );
      if (!connection) {
        throw new Error(`DB 연결을 찾을 수 없습니다: ${request.connectionId}`);
      }

      // 사용자당 1개의 RAG 서버만 허용 - 항상 다른 connectionId의 이력 삭제
      // (같은 connectionId로 재실행 시에도 다른 DB의 이전 이력 정리)
      const deletedCount =
        await this.ragPreprocessingDao.deleteAllUserRagHistory(
          userId,
          request.connectionId
        );
      if (deletedCount > 0) {
      }

      // 요청 데이터 구성
      const ragType = request.type !== undefined ? request.type : 0; // 기본값: 0 (all)

      // type이 0 (ALL)인 경우 AI 서버에 전체(type: 0)로 1회 요청하고, DB에는 스키마/데이터 2개 row 생성
      if (ragType === RagType.ALL) {
        // AI 서버에 전체(type: 0) 요청 후 스키마/데이터 2개 row 생성
        return await this.requestAllPreprocessing(userId, request);
      }

      // 개별 실행 (SCHEMA 또는 DATA)일 때 진행중 확인 (connectionId + ragType 기준)
      const processingHistory =
        await this.ragPreprocessingDao.getProcessingHistoryByConnectionAndType(
          request.connectionId,
          ragType, // RagType.SCHEMA(1) 또는 RagType.DATA(2) 그대로 사용
          userId
        );
      if (processingHistory && processingHistory.length > 0) {
        const processingDb = processingHistory[0];
        const ragTypeNames: Record<number, string> = {
          [RagType.SCHEMA]: "스키마",
          [RagType.DATA]: "데이터"
        };
        const ragTypeName = ragTypeNames[ragType] || "알 수 없음";

        throw new Error(
          `이미 진행중인 ${ragTypeName} RAG 프리프로세싱이 있습니다.\n` +
            `DB 연결 ID: ${processingDb.connectionId}\n` +
            `상태: ${processingDb.status}\n` +
            `완료 후 다시 시도해주세요.`
        );
      }

      // 개별 프리프로세싱 실행
      return await this.requestPreprocessingInternal(userId, request);
    } catch (error) {
      logger.error(
        `[RagPreprocessingService] RAG 전처리 요청 중 오류 발생`,
        error
      );
      throw error;
    }
  }

  /**
   * 전체 프리프로세싱 요청 (AI 서버에 type: 0으로 1회 요청, DB에는 스키마/데이터 2개 row 생성)
   */
  private async requestAllPreprocessing(
    userId: string,
    request: RagPreprocessingRequest
  ): Promise<RagPreprocessingResponse> {
    try {
      const resolved = await this.llmModelService.resolveDefaultForInternal(userId);
      if (!resolved) {
        throw new ChatError(
          ChatErrorMessages[ChatErrorType.MODEL_NOT_CONFIGURED].userMessage,
          ChatErrorType.MODEL_NOT_CONFIGURED,
          400,
          {
            remediation: { action: "register_model", url: "/settings/llm" }
          } as any
        );
      }
      const apiKey = resolved.apiKey;

      // DB 연결 정보 조회
      const connection = await this.dbConnectionDao.findById(
        request.connectionId,
        userId
      );
      if (!connection) {
        throw new Error(`DB 연결을 찾을 수 없습니다: ${request.connectionId}`);
      }

      // DB 타입 매핑
      let aiServerDbType: number;
      let dbId: string;

      switch (connection.dbTypeId) {
        case 1: // PostgreSQL
          aiServerDbType = 2;
          dbId = String(connection.connectionId);
          break;
        case 2: // MySQL
        case 6: // MariaDB
          aiServerDbType = 1;
          dbId = String(connection.connectionId);
          break;
        case 5: // SQLite
          aiServerDbType = 3;
          if (!connection.filePath) {
            throw new Error(
              "SQLite 데이터베이스의 파일 경로(filePath)가 설정되어 있지 않습니다."
            );
          }
          // AI 서버로 전송할 db_id는 /app/share/sqlite 이후 경로만 사용 (파일명 제외)
          // 예: D:/workspace/ORKIS/share/sqlite/user123/biTester/biTester.sqlite
          //  → user123/biTester
          const pathParts = connection.filePath.split(path.sep);
          const sqliteIndex = pathParts.findIndex((p) => p === "sqlite");
          if (sqliteIndex !== -1 && sqliteIndex < pathParts.length - 1) {
            // sqlite 폴더 다음부터 파일명 직전까지 추출
            dbId = pathParts.slice(sqliteIndex + 1, -1).join("/");
          } else {
            // sqlite 폴더를 찾지 못한 경우 전체 경로 사용 (fallback)
            dbId = connection.filePath;
          }
          break;
        default:
          throw new Error(
            `지원되지 않는 데이터베이스 타입입니다 (dbTypeId: ${connection.dbTypeId}).`
          );
      }

      const requestPayload = {
        type: RagType.ALL, // 0
        db_type: aiServerDbType,
        db_id: dbId,
        api_key: apiKey,
        user_id: userId // desktop AI 가 SQLite UPDATE 시 row 식별 키 (cloud 는 무시)
      };

      const requestUrl = `${this.getRAGServerURL()}/preprocess`;

      // 스키마와 데이터 2개의 히스토리 레코드 생성
      // 1. 스키마 히스토리 생성
      await this.ragPreprocessingDao.deletePreviousHistory(
        request.connectionId,
        RagType.SCHEMA,
        userId
      );

      const schemaHistoryId = await this.ragPreprocessingDao.createHistory({
        connectionId: request.connectionId,
        userId,
        requestType: "preprocess",
        ragType: RagType.SCHEMA,
        dbType: aiServerDbType,
        dbId,
        apiKey: "",
        requestUrl,
        requestPayload,
        status: "pending"
      });
      // 2. 데이터 히스토리 생성
      await this.ragPreprocessingDao.deletePreviousHistory(
        request.connectionId,
        RagType.DATA,
        userId
      );

      const dataHistoryId = await this.ragPreprocessingDao.createHistory({
        connectionId: request.connectionId,
        userId,
        requestType: "preprocess",
        ragType: RagType.DATA,
        dbType: aiServerDbType,
        dbId,
        apiKey: "",
        requestUrl,
        requestPayload,
        status: "pending"
      });
      // AI 서버로 전체(type: 0) 요청 1회만 전송 (비동기 처리)
      this.sendAllPreprocessingRequest(
        schemaHistoryId,
        dataHistoryId,
        requestUrl,
        requestPayload
      ).catch((error: any) => {
        logger.error(
          `[RagPreprocessingService] AI 서버 전체 전처리 요청 실패`,
          error
        );
      });

      return {
        success: true,
        message: "RAG 전체 프리프로세싱 요청이 전송되었습니다.",
        historyId: schemaHistoryId,
        status: "pending"
      };
    } catch (error) {
      logger.error(
        `[RagPreprocessingService] RAG 전체 전처리 요청 중 오류 발생`,
        error
      );
      throw error;
    }
  }

  /**
   * 내부용 프리프로세싱 요청 (진행중 확인 건너뜀)
   */
  private async requestPreprocessingInternal(
    userId: string,
    request: RagPreprocessingRequest
  ): Promise<RagPreprocessingResponse> {
    try {
      const resolved = await this.llmModelService.resolveDefaultForInternal(userId);
      if (!resolved) {
        throw new ChatError(
          ChatErrorMessages[ChatErrorType.MODEL_NOT_CONFIGURED].userMessage,
          ChatErrorType.MODEL_NOT_CONFIGURED,
          400,
          {
            remediation: { action: "register_model", url: "/settings/llm" }
          } as any
        );
      }
      const apiKey = resolved.apiKey;

      // DB 연결 정보 조회
      const connection = await this.dbConnectionDao.findById(
        request.connectionId,
        userId
      );
      if (!connection) {
        throw new Error(`DB 연결을 찾을 수 없습니다: ${request.connectionId}`);
      }

      const ragType = request.type!; // SCHEMA 또는 DATA (ALL은 이미 처리됨)

      // DB 타입 매핑: ORKIS dbTypeId → AI 서버 db_type
      // ORKIS: 1=PostgreSQL, 2=MySQL, 3=MSSQL, 4=Oracle, 5=SQLite, 6=MariaDB, 7=MongoDB
      // AI 서버: 1=MySQL, 2=PostgreSQL, 3=SQLite
      let aiServerDbType: number;
      let dbId: string;

      switch (connection.dbTypeId) {
        case 1: // PostgreSQL
          aiServerDbType = 2;
          dbId = String(connection.connectionId); // PostgreSQL은 connectionId 사용
          break;
        case 2: // MySQL
        case 6: // MariaDB (MySQL 호환)
          aiServerDbType = 1;
          dbId = String(connection.connectionId); // MySQL은 connectionId 사용
          break;
        case 5: // SQLite
          aiServerDbType = 3;
          // SQLite는 파일 경로를 db_id로 사용
          if (!connection.filePath) {
            throw new Error(
              "SQLite 데이터베이스의 파일 경로(filePath)가 설정되어 있지 않습니다."
            );
          }
          // AI 서버로 전송할 db_id는 /app/share/sqlite 이후 경로만 사용 (파일명 제외)
          // 예: D:/workspace/ORKIS/share/sqlite/user123/biTester/biTester.sqlite
          //  → user123/biTester
          const pathPartsInternal = connection.filePath.split(path.sep);
          const sqliteIndexInternal = pathPartsInternal.findIndex(
            (p) => p === "sqlite"
          );
          if (
            sqliteIndexInternal !== -1 &&
            sqliteIndexInternal < pathPartsInternal.length - 1
          ) {
            // sqlite 폴더 다음부터 파일명 직전까지 추출
            dbId = pathPartsInternal
              .slice(sqliteIndexInternal + 1, -1)
              .join("/");
          } else {
            // sqlite 폴더를 찾지 못한 경우 전체 경로 사용 (fallback)
            dbId = connection.filePath;
          }
          break;
        default:
          throw new Error(
            `지원되지 않는 데이터베이스 타입입니다 (dbTypeId: ${connection.dbTypeId}). ` +
              "RAG 전처리는 PostgreSQL, MySQL, SQLite만 지원합니다."
          );
      }
      const requestPayload = {
        type: ragType,
        db_type: aiServerDbType,
        db_id: dbId,
        api_key: apiKey,
        user_id: userId // desktop AI 가 SQLite UPDATE 시 row 식별 키 (cloud 는 무시)
      };

      const requestUrl = `${this.getRAGServerURL()}/preprocess`;

      // 이전 이력 삭제 (같은 connectionId, ragType의 이전 이력)
      await this.ragPreprocessingDao.deletePreviousHistory(
        request.connectionId,
        ragType, // RagType.SCHEMA(1) 또는 RagType.DATA(2)
        userId
      );
      // 이력 레코드 생성 (pending 상태)
      const historyId = await this.ragPreprocessingDao.createHistory({
        connectionId: request.connectionId,
        userId,
        requestType: "preprocess",
        ragType, // RagType.SCHEMA(1) 또는 RagType.DATA(2)
        dbType: aiServerDbType,
        dbId,
        apiKey: "",
        requestUrl,
        requestPayload,
        status: "pending"
      });

      // AI 서버로 전처리 요청 전송 (비동기 처리)
      this.sendPreprocessingRequest(
        historyId,
        requestUrl,
        requestPayload
      ).catch((error) => {
        logger.error(
          `[RagPreprocessingService] AI 서버 전처리 요청 실패 - historyId: ${historyId}`,
          error
        );
      });

      return {
        success: true,
        message: "RAG 전처리 요청이 전송되었습니다.",
        historyId,
        status: "pending"
      };
    } catch (error) {
      logger.error(
        `[RagPreprocessingService] RAG 전처리 요청 중 오류 발생`,
        error
      );
      throw error;
    }
  }

  /**
   * AI 서버로 전체 프리프로세싱 요청 전송 (type: 0, 1회 호출로 스키마+데이터 동시 처리)
   * @param schemaHistoryId 스키마 히스토리 ID
   * @param dataHistoryId 데이터 히스토리 ID
   * @param requestUrl 요청 URL
   * @param requestPayload 요청 데이터
   */
  private async sendAllPreprocessingRequest(
    schemaHistoryId: number,
    dataHistoryId: number,
    requestUrl: string,
    requestPayload: Record<string, any>
  ): Promise<void> {
    try {
      // 두 히스토리 모두 processing으로 업데이트
      // Desktop: AI 가 작업 시작 시 직접 status UPDATE 하므로 backend 사전 UPDATE skip (status truthiness)
      if (process.env.RUNTIME_MODE !== "desktop") {
        await this.ragPreprocessingDao.updateStatus(
          schemaHistoryId,
          "processing"
        );
        await this.ragPreprocessingDao.updateStatus(
          dataHistoryId,
          "processing"
        );
      }

      // HTTP 요청 전송 (AI 서버에 type: 0으로 1회만 전송)
      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestPayload)
      });

      const responseBody = await response.json();
      // AI 서버 응답 구조에 따라 성공/실패 판단
      // success: true는 "요청 접수 완료"를 의미하므로 processing으로 저장
      // 실제 완료 여부는 startStatusPolling에서 확인
      let status: RagPreprocessingStatus;
      let errorMessage: string | undefined;
      let shouldStartPolling = false;

      if (!response.ok) {
        status = "failed";
        errorMessage =
          responseBody.message ||
          responseBody.error?.message ||
          "AI 서버 HTTP 오류";
      } else if (responseBody.success === false) {
        status = "failed";
        errorMessage =
          responseBody.error?.message ||
          responseBody.message ||
          "AI 서버 처리 실패";
      } else {
        // 요청 접수 성공 -> processing 상태로 저장, 폴링 시작
        status = "processing";
        errorMessage = undefined;
        shouldStartPolling = true;
      }

      // 두 히스토리 모두 응답 업데이트
      await this.ragPreprocessingDao.updateHistoryWithResponse({
        historyId: schemaHistoryId,
        responseStatus: response.status,
        responseBody,
        status,
        errorMessage
      });

      await this.ragPreprocessingDao.updateHistoryWithResponse({
        historyId: dataHistoryId,
        responseStatus: response.status,
        responseBody,
        status,
        errorMessage
      });
      // AI 서버 요청 접수 성공이면 주기적으로 상태 확인 시작 (스키마와 데이터 각각)
      // Desktop: AI 가 SQLite status 를 직접 UPDATE 하므로 backend polling 불필요
      if (shouldStartPolling && process.env.RUNTIME_MODE !== "desktop") {
        const schemaHistory = await this.ragPreprocessingDao.getHistoryById(
          schemaHistoryId,
          ""
        );
        if (schemaHistory) {
          this.startStatusPolling(
            schemaHistoryId,
            schemaHistory.dbId,
            RagType.SCHEMA
          );
        } else {
        }

        const dataHistory = await this.ragPreprocessingDao.getHistoryById(
          dataHistoryId,
          ""
        );
        if (dataHistory) {
          this.startStatusPolling(
            dataHistoryId,
            dataHistory.dbId,
            RagType.DATA
          );
        } else {
        }
      }
    } catch (error) {
      logger.error(
        `[RagPreprocessingService] AI 서버 전체 전처리 요청 실패`,
        error
      );

      // 실패 상태로 업데이트
      await this.ragPreprocessingDao.updateHistoryWithResponse({
        historyId: schemaHistoryId,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "알 수 없는 오류"
      });

      await this.ragPreprocessingDao.updateHistoryWithResponse({
        historyId: dataHistoryId,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "알 수 없는 오류"
      });
    }
  }

  /**
   * AI 서버로 전처리 요청 전송 (비동기)
   * @param historyId 이력 ID
   * @param requestUrl 요청 URL
   * @param requestPayload 요청 데이터
   */
  private async sendPreprocessingRequest(
    historyId: number,
    requestUrl: string,
    requestPayload: Record<string, any>
  ): Promise<void> {
    try {
      // 상태를 processing으로 업데이트
      // Desktop: AI 가 작업 시작 시 직접 status UPDATE 하므로 backend 사전 UPDATE skip (status truthiness)
      if (process.env.RUNTIME_MODE !== "desktop") {
        await this.ragPreprocessingDao.updateStatus(historyId, "processing");
      }

      // HTTP 요청 전송
      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestPayload)
      });

      const responseBody = await response.json();
      // AI 서버 응답 구조에 따라 성공/실패 판단
      // success: true는 "요청 접수 완료"를 의미하므로 processing으로 저장
      // 실제 완료 여부는 startStatusPolling에서 확인
      let status: RagPreprocessingStatus;
      let errorMessage: string | undefined;
      let shouldStartPolling = false;

      if (!response.ok) {
        // HTTP 에러 (4xx, 5xx)
        status = "failed";
        errorMessage =
          responseBody.message ||
          responseBody.error?.message ||
          "AI 서버 HTTP 오류";
      } else if (responseBody.success === false) {
        // HTTP 200이지만 success: false
        status = "failed";
        errorMessage =
          responseBody.error?.message ||
          responseBody.message ||
          "AI 서버 처리 실패";
      } else {
        // 요청 접수 성공 -> processing 상태로 저장, 폴링 시작
        status = "processing";
        errorMessage = undefined;
        shouldStartPolling = true;
      }

      await this.ragPreprocessingDao.updateHistoryWithResponse({
        historyId,
        responseStatus: response.status,
        responseBody,
        status,
        errorMessage
      });
      // AI 서버 요청 접수 성공이면 주기적으로 상태 확인 시작
      // Desktop: AI 가 SQLite status 를 직접 UPDATE 하므로 backend polling 불필요
      if (shouldStartPolling && process.env.RUNTIME_MODE !== "desktop") {
        // 히스토리 정보 조회하여 상태 체크 시작
        const history = await this.ragPreprocessingDao.getHistoryById(
          historyId,
          ""
        );
        if (history) {
          this.startStatusPolling(
            historyId,
            history.dbId,
            history.ragType
          );
        }
      }
    } catch (error) {
      logger.error(
        `[RagPreprocessingService] AI 서버 전처리 요청 실패 - historyId: ${historyId}`,
        error
      );

      // 실패 상태로 업데이트
      await this.ragPreprocessingDao.updateHistoryWithResponse({
        historyId,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "알 수 없는 오류"
      });
    }
  }

  /**
   * RAG 전처리 이력 조회
   * @param userId 사용자 ID
   * @param request 조회 요청 정보
   * @returns 전처리 이력 목록
   */
  async getPreprocessingHistory(
    userId: string,
    request: GetRagPreprocessingHistoryRequest
  ): Promise<GetRagPreprocessingHistoryResponse> {
    try {
      const page = request.page || 1;
      const limit = request.limit || 20;

      const result = await this.ragPreprocessingDao.getHistory(userId, {
        connectionId: request.connectionId,
        status: request.status,
        requestType: request.requestType,
        startDate: request.startDate,
        endDate: request.endDate,
        page,
        limit
      });
      return {
        history: result.history,
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit)
      };
    } catch (error) {
      logger.error(
        `[RagPreprocessingService] RAG 전처리 이력 조회 중 오류 발생`,
        error
      );
      throw error;
    }
  }

  /**
   * 모든 DB의 RAG 전처리 이력 일괄 조회 (2026-02-05)
   * 여러 번의 API 호출 대신 한 번에 모든 DB의 RAG 상태를 조회
   * @param userId 사용자 ID
   * @returns connectionId별 RAG 이력 맵
   */
  async getAllPreprocessingHistory(
    userId: string
  ): Promise<{ historyByConnection: Record<number, RagPreprocessingHistory[]>; totalConnections: number }> {
    try {
      // 사용자의 모든 DB 연결 목록 조회
      const connections = await this.dbConnectionDao.findByUserId(userId);

      if (connections.length === 0) {
        return { historyByConnection: {}, totalConnections: 0 };
      }

      // 모든 DB의 RAG 이력을 병렬로 조회
      const historyPromises = connections.map(async (conn: { connectionId: number }) => {
        try {
          const result = await this.ragPreprocessingDao.getHistory(userId, {
            connectionId: conn.connectionId,
            page: 1,
            limit: 10 // 각 DB당 최근 10개 이력만
          });
          return { connectionId: conn.connectionId, history: result.history };
        } catch (error) {
          return { connectionId: conn.connectionId, history: [] };
        }
      });

      const results = await Promise.all(historyPromises);

      // connectionId를 키로 하는 맵 생성
      const historyByConnection: Record<number, RagPreprocessingHistory[]> = {};
      for (const result of results) {
        historyByConnection[result.connectionId] = result.history;
      }
      return {
        historyByConnection,
        totalConnections: connections.length
      };
    } catch (error) {
      logger.error(
        `[RagPreprocessingService] 모든 DB RAG 전처리 이력 일괄 조회 중 오류 발생`,
        error
      );
      throw error;
    }
  }

  /**
   * 특정 이력 상세 조회
   * @param userId 사용자 ID
   * @param historyId 이력 ID
   * @returns 전처리 이력 상세
   */
  async getHistoryDetail(
    userId: string,
    historyId: number
  ): Promise<RagPreprocessingHistory | null> {
    try {
      const history = await this.ragPreprocessingDao.getHistoryById(
        historyId,
        userId
      );

      if (!history) {
        return null;
      }

      // API Key 마스킹 처리
      if (history.apiKey) {
        history.apiKey = this.maskApiKey(history.apiKey);
      }

      return history;
    } catch (error) {
      logger.error(
        `[RagPreprocessingService] RAG 전처리 이력 상세 조회 중 오류 발생`,
        error
      );
      throw error;
    }
  }

  /**
   * RAG 전처리 상태 조회 및 업데이트
   * @param userId 사용자 ID
   * @param connectionId DB 연결 ID
   * @param dbId DB 식별자
   * @param apiKey LLM API 키
   * @param ragType RAG 타입 (RagType: 1=SCHEMA 또는 2=DATA)
   */
  private async checkAndUpdateStatus(
    userId: string,
    connectionId: number,
    dbId: string,
    apiKey: string,
    ragType: RagType
  ): Promise<void> {
    try {
      const ragTypeName = ragType === RagType.SCHEMA ? "schema" : "data";
      // AI 서버 상태 조회
      const statusUrl = `${this.getRAGServerURL()}/preprocess/status`;
      const response = await fetch(statusUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type: ragType, // RagType.SCHEMA(1) 또는 RagType.DATA(2)
          db_id: dbId
        })
      });

      const statusData: RagPreprocessingStatusResponse = await response.json();
      // AI 서버 status를 우리 시스템 status로 매핑
      // 0: 정상(완료) -> success
      // 1: 비정상(에러) -> failed
      // 2: 진행중 -> processing
      let ourStatus: RagPreprocessingStatus;
      switch (statusData.result.status) {
        case 0:
          ourStatus = "success";
          break;
        case 1:
          ourStatus = "failed";
          break;
        case 2:
          ourStatus = "processing";
          break;
        default:
          ourStatus = "failed";
      }

      // 이력 레코드 생성 (status_check)
      const historyId = await this.ragPreprocessingDao.createHistory({
        connectionId,
        userId,
        requestType: "status_check",
        ragType, // RagType.SCHEMA(1) 또는 RagType.DATA(2)
        dbType: 3, // SQLite (향후 동적으로 가져오도록 수정 필요)
        dbId,
        apiKey: "",
        requestUrl: statusUrl,
        requestPayload: {
          type: ragType, // RagType.SCHEMA(1) 또는 RagType.DATA(2)
          db_id: dbId
        },
        status: ourStatus
      });

      // 응답 저장
      await this.ragPreprocessingDao.updateHistoryWithResponse({
        historyId,
        responseStatus: response.status,
        responseBody: statusData,
        status: ourStatus,
        errorMessage: statusData.error || undefined
      });
    } catch (error) {
      logger.error(
        `[RagPreprocessingService] RAG 상태 조회 실패 - dbId: ${dbId}, ragType: ${ragType}`,
        error
      );
    }
  }

  /**
   * 주기적으로 AI 서버 상태를 확인하여 DB 업데이트
   * @param historyId 이력 ID
   * @param dbId DB ID
   * @param ragType RAG 타입 (RagType.SCHEMA=1 또는 RagType.DATA=2)
   */
  private async startStatusPolling(
    historyId: number,
    dbId: string,
    ragType: number
  ): Promise<void> {
    // 중복 폴링 방지
    if (this.pollingHistoryIds.has(historyId)) {
      return;
    }
    this.pollingHistoryIds.add(historyId);
    const maxRetries = 120; // 최대 10분 (5초 * 120)
    let retryCount = 0;

    const checkStatus = async () => {
      // cancel 신호 체크 — DB 연결 삭제 등으로 폴링 중단 요청 시 즉시 종료.
      // 설계: cancel 시점엔 cancelledHistoryIds.add 만 하고, 실제 정리는 여기서 수행.
      // 이로써 cancel 후 같은 historyId 로 재진입 시 중복 폴링을 방지.
      if (this.cancelledHistoryIds.has(historyId)) {
        this.pollingHistoryIds.delete(historyId);
        this.cancelledHistoryIds.delete(historyId);
        logger.info(
          `[RagPreprocessingService] 폴링 cancel 처리됨 - historyId: ${historyId}`
        );
        return;
      }
      try {
        const statusUrl = `${this.getRAGServerURL()}/preprocess/status`;
        const response = await fetch(statusUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: ragType, // RagType.SCHEMA(1) 또는 RagType.DATA(2)
            db_id: dbId
          })
        });

        const statusData: RagPreprocessingStatusResponse =
          await response.json();

        // AI 서버 응답 로그
        // AI 서버 status를 우리 시스템 status로 매핑
        // 0: 정상(완료) -> success
        // 1: 비정상(에러) -> failed
        // 2: 진행중 -> processing
        let ourStatus: RagPreprocessingStatus;
        switch (statusData.result.status) {
          case 0:
            ourStatus = "success";
            break;
          case 1:
            ourStatus = "failed";
            break;
          case 2:
            ourStatus = "processing";
            break;
          default:
            ourStatus = "failed";
        }

        // DB 업데이트
        await this.ragPreprocessingDao.updateStatus(historyId, ourStatus);
        // 완료 또는 실패 상태이면 폴링 중단
        if (ourStatus === "success" || ourStatus === "failed") {
          this.pollingHistoryIds.delete(historyId);
          return;
        }

        // 아직 진행중이면 5초 후 재시도
        retryCount++;
        if (retryCount < maxRetries) {
          setTimeout(() => checkStatus(), 5000);
        } else {
          // 최대 재시도 횟수 초과
          this.pollingHistoryIds.delete(historyId);
          await this.ragPreprocessingDao.updateStatus(historyId, "failed");
        }
      } catch (error) {
        logger.error(
          `[RagPreprocessingService] RAG 상태 폴링 실패 - historyId: ${historyId}`,
          error
        );

        // 에러 발생 시에도 재시도
        retryCount++;
        if (retryCount < maxRetries) {
          setTimeout(() => checkStatus(), 5000);
        } else {
          // 최대 재시도 횟수 초과
          this.pollingHistoryIds.delete(historyId);
        }
      }
    };

    // 5초 후 첫 번째 상태 체크 시작
    setTimeout(() => checkStatus(), 5000);
  }

  /**
   * 특정 connectionId 의 진행 중 폴링을 cancel.
   * DB 연결 삭제 시 호출 — CASCADE 로 history row 가 사라진 후 좀비 폴링이 계속
   * 외부에 무의미한 호출을 보내고 존재하지 않는 row 에 UPDATE 하는 문제를 방지.
   *
   * 호출 시점은 db_connections row 삭제 **이전** 이어야 함 — CASCADE 후에는
   * getProcessingHistoryByUser 에서 해당 row 를 더 이상 조회할 수 없음.
   *
   * 메모리 leak 방지: 현재 pollingHistoryIds 에 포함된 historyId 만 add.
   * 이미 종료된 historyId 가 cancelledHistoryIds 에 누적되지 않도록 가드.
   *
   * 실패 정책: cancel 실패는 로그만 남기고 진행 — DB 삭제 본체를 막지 않음.
   *
   * @param connectionId 삭제 대상 DB 연결 ID
   * @param userId 사용자 ID
   */
  async cancelPollingByConnectionId(
    connectionId: number,
    userId: string
  ): Promise<void> {
    try {
      const processing =
        await this.ragPreprocessingDao.getProcessingHistoryByUser(userId);
      let cancelCount = 0;
      for (const h of processing) {
        if (
          h.connectionId === connectionId &&
          this.pollingHistoryIds.has(h.historyId)
        ) {
          this.cancelledHistoryIds.add(h.historyId);
          cancelCount++;
        }
      }
      if (cancelCount > 0) {
        logger.info(
          `[RagPreprocessingService] connectionId ${connectionId} 폴링 cancel 신호 - ${cancelCount}건`
        );
      }
    } catch (error) {
      logger.error(
        `[RagPreprocessingService] cancelPollingByConnectionId 실패 - connectionId: ${connectionId}`,
        error
      );
    }
  }

  /**
   * API 키 마스킹 처리
   * @param apiKey 원본 API 키
   * @returns 마스킹된 API 키
   */
  private maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 8) {
      return "****";
    }

    // 앞 4자리와 뒤 4자리만 표시
    const prefix = apiKey.substring(0, 4);
    const suffix = apiKey.substring(apiKey.length - 4);
    const masked = "*".repeat(Math.max(apiKey.length - 8, 4));

    return `${prefix}${masked}${suffix}`;
  }

  /**
   * 기존 RAG 전처리 정보 확인
   * @param userId 사용자 ID
   * @returns 기존 RAG 정보 존재 여부 및 상세 정보
   */
  async checkExistingRagInfo(userId: string): Promise<{
    hasExistingData: boolean;
    existingConnection?: {
      connectionId: number;
      connectionName: string;
      databaseName: string;
      schemaStatus?: string;
      dataStatus?: string;
      lastUpdated?: string;
    };
  }> {
    try {
      // 성공한 RAG 전처리 정보 조회
      const ragInfo = await this.ragPreprocessingDao.getSuccessfulRagInfo(
        userId
      );

      if (!ragInfo) {
        return { hasExistingData: false };
      }

      // DB 연결 정보 조회
      const connection = await this.dbConnectionDao.findById(
        ragInfo.connectionId,
        userId
      );

      if (!connection) {
        return { hasExistingData: false };
      }

      // 마지막 업데이트 시간 계산
      const lastUpdated =
        ragInfo.schemaHistory?.updatedAt && ragInfo.dataHistory?.updatedAt
          ? ragInfo.schemaHistory.updatedAt > ragInfo.dataHistory.updatedAt
            ? ragInfo.schemaHistory.updatedAt
            : ragInfo.dataHistory.updatedAt
          : ragInfo.schemaHistory?.updatedAt || ragInfo.dataHistory?.updatedAt;
      return {
        hasExistingData: true,
        existingConnection: {
          connectionId: ragInfo.connectionId,
          connectionName: connection.connectionName,
          databaseName: connection.databaseName,
          schemaStatus: ragInfo.schemaHistory?.status,
          dataStatus: ragInfo.dataHistory?.status,
          lastUpdated
        }
      };
    } catch (error) {
      logger.error(
        `[RagPreprocessingService] 기존 RAG 정보 확인 중 오류 발생`,
        error
      );
      throw error;
    }
  }

  /**
   * 샘플 DB용 RAG 전처리 완료 이력 생성
   * @param userId 사용자 ID
   * @param connectionId DB 연결 ID
   * @param dbId 데이터베이스 식별자
   */
  async createSampleDbPreprocessingHistory(
    userId: string,
    connectionId: number,
    dbId: string
  ): Promise<void> {
    try {
      // 사용자당 1개의 RAG 서버만 허용 - 항상 다른 connectionId의 이력 삭제
      const deletedCount =
        await this.ragPreprocessingDao.deleteAllUserRagHistory(
          userId,
          connectionId
        );
      if (deletedCount > 0) {
      }

      // 스키마 전처리 이력 생성
      const schemaHistoryId = await this.ragPreprocessingDao.createHistory({
        connectionId,
        userId,
        requestType: "preprocess",
        ragType: RagType.SCHEMA,
        dbType: 3, // AI 서버 SQLite 타입
        dbId,
        apiKey: "",
        requestUrl: "sample-db-auto-generated",
        requestPayload: { type: RagType.SCHEMA, note: "샘플 DB 자동 생성 - 스키마" },
        status: "success"
      });

      // 스키마 전처리 응답 업데이트
      await this.ragPreprocessingDao.updateHistoryWithResponse({
        historyId: schemaHistoryId,
        responseStatus: 200,
        responseBody: { status: 0, message: "샘플 DB - 스키마 전처리 완료" },
        status: "success"
      });
      // 데이터 전처리 이력 생성
      const dataHistoryId = await this.ragPreprocessingDao.createHistory({
        connectionId,
        userId,
        requestType: "preprocess",
        ragType: RagType.DATA,
        dbType: 3, // AI 서버 SQLite 타입
        dbId,
        apiKey: "",
        requestUrl: "sample-db-auto-generated",
        requestPayload: { type: RagType.DATA, note: "샘플 DB 자동 생성 - 데이터" },
        status: "success"
      });

      // 데이터 전처리 응답 업데이트
      await this.ragPreprocessingDao.updateHistoryWithResponse({
        historyId: dataHistoryId,
        responseStatus: 200,
        responseBody: { status: 0, message: "샘플 DB - 데이터 전처리 완료" },
        status: "success"
      });
      // AI 서버에 샘플 DB 전처리 요청 (필수 - 실패 시 에러 throw하여 롤백 처리)
      const aiServerResponse = await this.callSamplePreprocessApi(dbId);
      if (!aiServerResponse.success) {
        const errorMessage = aiServerResponse.error || "AI 서버 샘플 전처리 실패";
        logger.error(
          `[RagPreprocessingService] AI 서버 샘플 전처리 실패 - dbId: ${dbId}, error: ${errorMessage}`
        );
        throw new Error(`AI 서버 샘플 전처리 실패: ${errorMessage}`);
      }
    } catch (error) {
      logger.error(
        `[RagPreprocessingService] 샘플 DB RAG 전처리 이력 생성 실패:`,
        error
      );
      throw error;
    }
  }

  /**
   * AI 서버에 샘플 DB 전처리 요청
   * @param dbId 데이터베이스 식별자 (예: "userId/sample_20251201T054426")
   * @returns AI 서버 응답
   */
  async callSamplePreprocessApi(dbId: string): Promise<{
    success: boolean;
    result: Record<string, any>;
    error: string | null;
    timestamp: string;
  }> {
    const ragServerUrl = this.getRAGServerURL();
    const endpoint = `${ragServerUrl}/preprocess/sample`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        db_id: dbId
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `AI 서버 샘플 전처리 요청 실패: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    return result;
  }
}
