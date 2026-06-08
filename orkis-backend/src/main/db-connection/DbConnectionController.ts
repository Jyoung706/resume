import {
  Autowired,
  Controller,
  Body,
  Files,
  RequestMapping,
  Param,
  Session,
  FILTER_TYPES,
  REQUEST_METHOD,
  REQUEST_TYPE
} from "@orkis/core/common";
import type { MulterFile } from "@orkis/core/application";
import logger from "@orkis/core/utils";
import type {
  AddColumnRequest,
  AddColumnResponse,
  CheckSQLiteDbExistsRequest,
  CheckSQLiteDbExistsResponse,
  CheckUploadPathExistsRequest,
  CheckUploadPathExistsResponse,
  CreateDbConnectionRequest,
  CreateSQLiteDbRequest,
  CreateSampleSQLiteDbRequest,
  CreateSampleSQLiteDbResponse,
  CreateTableRequest,
  CreateTableResponse,
  DbConnectionListResponse,
  DbType,
  DeleteColumnResponse,
  DeleteTableResponse,
  GetDbSchemaResponse,
  GetTableDetailResponse,
  InsertTableDataRequest,
  InsertTableDataResponse,
  RegisterSQLiteDbRequest,
  RegisterSQLiteDbResponse,
  TestDbConnectionRequest,
  TestDbConnectionResponse,
  UpdateColumnRequest,
  UpdateColumnResponse,
  UpdateDbConnectionRequest,
  UpdateTableRequest,
  UpdateTableResponse,
  UploadSQLiteDbResponse,
  RagPreprocessingRequest,
  RagPreprocessingResponse,
  GetRagPreprocessingHistoryRequest,
  GetRagPreprocessingHistoryResponse,
  GetAllRagPreprocessingHistoryResponse,
  RagPreprocessingHistory
} from "@orkis-interface/backend/db-connection";
import { DbConnectionService } from "./DbConnectionService";
import { RagPreprocessingService } from "./RagPreprocessingService";

@Controller({ path: "/db-connection" })
export class DbConnectionController {
  @Autowired("DbConnectionService")
  private dbConnectionService!: DbConnectionService;

  @Autowired("RagPreprocessingService")
  private ragPreprocessingService!: RagPreprocessingService;

  @RequestMapping({ route: "/types", method: REQUEST_METHOD.POST })
  async getDbTypes(): Promise<DbType[]> {
    try {
      return await this.dbConnectionService.getDbTypes();
    } catch (error) {
      logger.error("[DbConnectionController] getDbTypes 에러:", error);
      throw error;
    }
  }

  @RequestMapping({ route: "/system-info", method: REQUEST_METHOD.POST })
  async getSystemDbInfo(): Promise<any> {
    try {
      return await this.dbConnectionService.getSystemDbInfo();
    } catch (error) {
      logger.error("[DbConnectionController] getSystemDbInfo 에러:", error);
      throw error;
    }
  }

  @RequestMapping({ route: "/list", method: REQUEST_METHOD.POST })
  async getDbConnections(
    @Session() session: any
  ): Promise<DbConnectionListResponse> {
    try {
      const userId = session?.login_info?.ID;
      if (!userId) throw new Error("인증되지 않은 사용자입니다.");
      return await this.dbConnectionService.getDbConnections(userId);
    } catch (error) {
      logger.error("[DbConnectionController] getDbConnections 에러:", error);
      throw error;
    }
  }

  @RequestMapping({ route: "/create", method: REQUEST_METHOD.POST })
  async createDbConnection(
    @Body() data: CreateDbConnectionRequest,
    @Session() session: any
  ): Promise<{ connectionId: number; message: string; ragReadiness?: { canPreprocess: boolean; reason: string } }> {
    try {
      const userId = session?.login_info?.ID;
      if (!userId) throw new Error("인증되지 않은 사용자입니다.");
      const { connectionId, ragReadiness } = await this.dbConnectionService.createDbConnection(
        userId,
        data
      );
      return { connectionId, message: "데이터베이스 연결이 등록되었습니다." , ragReadiness };
    } catch (error: any) {
      logger.error("[DbConnectionController] createDbConnection 에러:", error);
      throw error;
    }
  }

  @RequestMapping({
    route: "/update/:connectionId",
    method: REQUEST_METHOD.POST
  })
  async updateDbConnection(
    @Param("connectionId") connectionId: string,
    @Body() data: UpdateDbConnectionRequest,
    @Session() session: any
  ): Promise<{ message: string }> {
    try {
      const userId = session?.login_info?.ID;
      if (!userId) throw new Error("인증되지 않은 사용자입니다.");

      const connectionIdNum = parseInt(connectionId);
      if (isNaN(connectionIdNum) || connectionIdNum <= 0) {
        throw new Error(`유효하지 않은 연결 ID입니다: ${connectionId}`);
      }

      await this.dbConnectionService.updateDbConnection(
        connectionIdNum,
        userId,
        data
      );
      return { message: "데이터베이스 연결이 수정되었습니다." };
    } catch (error) {
      logger.error("[DbConnectionController] updateDbConnection 에러:", error);
      throw error;
    }
  }

  @RequestMapping({
    route: "/delete/:connectionId",
    method: REQUEST_METHOD.POST
  })
  async deleteDbConnection(
    @Param("connectionId") connectionId: string,
    @Session() session: any
  ): Promise<{ message: string }> {
    try {
      const userId = session?.login_info?.ID;
      if (!userId) throw new Error("인증되지 않은 사용자입니다.");

      const connectionIdNum = parseInt(connectionId);
      if (isNaN(connectionIdNum) || connectionIdNum <= 0) {
        throw new Error(`유효하지 않은 연결 ID입니다: ${connectionId}`);
      }

      await this.dbConnectionService.deleteDbConnection(
        connectionIdNum,
        userId
      );
      return { message: "데이터베이스 연결이 삭제되었습니다." };
    } catch (error) {
      logger.error("[DbConnectionController] deleteDbConnection 에러:", error);
      throw error;
    }
  }

  @RequestMapping({ route: "/dbCheck", method: REQUEST_METHOD.POST })
  async testDbConnection(
    @Body() data: TestDbConnectionRequest,
    @Session() session: any
  ): Promise<TestDbConnectionResponse> {
    try {
      const userId = session?.login_info?.ID;
      if (!userId) throw new Error("인증되지 않은 사용자입니다.");

      return await this.dbConnectionService.testDbConnection(userId, data);
    } catch (error) {
      logger.error("[DbConnectionController] testDbConnection 에러:", error);
      throw error;
    }
  }

  @RequestMapping({
    route: "/check-sqlite-exists",
    method: REQUEST_METHOD.POST
  })
  async checkSQLiteDbExists(
    @Body() data: CheckSQLiteDbExistsRequest,
    @Session() session: any
  ): Promise<CheckSQLiteDbExistsResponse> {
    try {
      const userId = session?.login_info?.ID;
      if (!userId) throw new Error("인증되지 않은 사용자입니다.");
      return await this.dbConnectionService.checkSQLiteDbExists(
        userId,
        data.databaseName
      );
    } catch (error) {
      logger.error("[DbConnectionController] checkSQLiteDbExists 에러:", error);
      throw error;
    }
  }

  @RequestMapping({ route: "/create-sqlite", method: REQUEST_METHOD.POST })
  async createSQLiteDb(
    @Body() data: CreateSQLiteDbRequest & { connectionName?: string; description?: string },
    @Session() session: any
  ) {
    try {
      const userId = session?.login_info?.ID;
      if (!userId) throw new Error("인증되지 않은 사용자입니다.");
      return await this.dbConnectionService.createSQLiteDb(
        userId,
        data.databaseName,
        data.connectionName,
        data.description
      );
    } catch (error) {
      logger.error("[DbConnectionController] createSQLiteDb 에러:", error);
      throw error;
    }
  }

  @RequestMapping({
    route: "/create-sample-sqlite",
    method: REQUEST_METHOD.POST
  })
  async createSampleSQLiteDb(
    @Body() data: CreateSampleSQLiteDbRequest,
    @Session() session: any
  ): Promise<CreateSampleSQLiteDbResponse> {
    try {
      const userId = session?.login_info?.ID;
      if (!userId) throw new Error("인증되지 않은 사용자입니다.");
      const result = await this.dbConnectionService.createSampleSQLiteDb(
        String(userId),
        data.connectionName,
        data.description
      );

      // AI 서버에 미리 처리된 샘플 RAG 데이터 복사 (NETWORK_PATH → ROOT_PATH).
      // 사용자가 마지막 단계에서 RAG 등록을 "건너뛰기" 하더라도 AI 서버 복사는 보장되어야
      // 이후 RAG 탭에서 프리프로세싱을 실행할 때 SqliteReader가 ROOT_PATH에서 파일을 찾을 수 있다.
      const aiServerResponse =
        await this.ragPreprocessingService.callSamplePreprocessApi(result.dbId);
      if (!aiServerResponse.success) {
        const errorMessage =
          aiServerResponse.error || "AI 서버 샘플 전처리 실패";
        logger.error(
          `[DbConnectionController] AI 서버 샘플 복사 실패 - dbId: ${result.dbId}, error: ${errorMessage}`
        );
        throw new Error(`AI 서버 샘플 전처리 실패: ${errorMessage}`);
      }

      return result;
    } catch (error) {
      logger.error(
        "[DbConnectionController] createSampleSQLiteDb 에러:",
        error
      );
      throw error;
    }
  }

  @RequestMapping({
    route: "/register-sample-db-rag",
    method: REQUEST_METHOD.POST
  })
  async registerSampleDbRag(
    @Body() data: { connectionId: number; dbId: string },
    @Session() session: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      const userId = session?.login_info?.ID;
      if (!userId) throw new Error("인증되지 않은 사용자입니다.");
      // 샘플 DB RAG 전처리 이력 생성 (기존 RAG 이력 삭제 포함)
      await this.ragPreprocessingService.createSampleDbPreprocessingHistory(
        userId,
        data.connectionId,
        data.dbId
      );

      return {
        success: true,
        message: "샘플 DB RAG 등록이 완료되었습니다."
      };
    } catch (error) {
      logger.error(
        "[DbConnectionController] registerSampleDbRag 에러:",
        error
      );
      throw error;
    }
  }

  @RequestMapping({ route: "/register-sqlite", method: REQUEST_METHOD.POST })
  async registerSQLiteDb(
    @Body() data: RegisterSQLiteDbRequest,
    @Session() session: any
  ): Promise<RegisterSQLiteDbResponse> {
    try {
      const userId = session?.login_info?.ID;
      if (!userId) throw new Error("인증되지 않은 사용자입니다.");
      return await this.dbConnectionService.registerSQLiteDb(
        userId,
        data.filePath,
        data.connectionName,
        data.description
      );
    } catch (error) {
      logger.error("[DbConnectionController] registerSQLiteDb 에러:", error);
      throw error;
    }
  }

  @RequestMapping({ route: "/check-upload-path", method: REQUEST_METHOD.POST })
  async checkUploadPathExists(
    @Session() session: any,
    @Body() data: CheckUploadPathExistsRequest
  ): Promise<CheckUploadPathExistsResponse> {
    try {
      const userId = session?.login_info?.ID;
      if (!userId) throw new Error("인증되지 않은 사용자입니다.");

      return await this.dbConnectionService.checkUploadPathExists(userId, data);
    } catch (error) {
      logger.error(
        "[DbConnectionController] checkUploadPathExists 에러:",
        error
      );
      throw error;
    }
  }

  /**
   * @authPolicy TECHNICAL_BYPASS:multipart
   * multipart 본문 파싱이 인터셉터 동작 이전에 필요하므로 NONE 으로 우회.
   * 컨트롤러 내부에서 session.login_info.ID 를 직접 검증한다.
   */
  @RequestMapping({
    route: "/upload-sqlite",
    method: REQUEST_METHOD.POST,
    filteredType: FILTER_TYPES.NONE,
    requestType: REQUEST_TYPE.UPLOAD,
    multipartConfig: {
      maxFileSize: 1024 * 1024 * 1024,
      allowedMimeTypes: [
        "application/vnd.sqlite3",
        "application/x-sqlite3",
        "application/octet-stream",
        "" // 빈 문자열 MIME 타입 허용 (일부 브라우저에서 SQLite 파일을 이렇게 인식)
      ]
    }
  })
  async uploadSQLiteDb(
    @Session() session: any,
    @Files("file") files: MulterFile[],
    @Body()
    body: {
      connectionName: string;
      databaseName: string;
      description?: string;
    }
  ): Promise<UploadSQLiteDbResponse> {
    try {
      const userId = session?.login_info?.ID;
      if (!userId) throw new Error("인증되지 않은 사용자입니다.");

      const [file] = files;

      if (!file) {
        throw new Error("파일이 업로드되지 않았습니다.");
      }

      const { connectionName, databaseName, description } = body;

      if (!connectionName) {
        throw new Error("연결 이름은 필수입니다.");
      }

      if (!databaseName) {
        throw new Error("데이터베이스 이름은 필수입니다.");
      }
      const result = await this.dbConnectionService.uploadSQLiteDb(
        userId,
        file.path,
        file.originalname,
        connectionName,
        databaseName,
        description
      );
      return result;
    } catch (error) {
      logger.error("[DbConnectionController] uploadSQLiteDb 에러:", error);
      throw error;
    }
  }

  @RequestMapping({
    route: "/schema/list",
    method: REQUEST_METHOD.POST
  })
  async getDbSchema(
    @Body() data: { connectionId: number },
    @Session() session: any
  ): Promise<GetDbSchemaResponse> {
    try {
      const userId = session?.login_info?.ID;
      if (!userId) throw new Error("인증되지 않은 사용자입니다.");

      const connectionIdNum = data.connectionId;
      if (!connectionIdNum || connectionIdNum <= 0) {
        throw new Error(`유효하지 않은 연결 ID입니다: ${connectionIdNum}`);
      }
      return await this.dbConnectionService.getDbSchema(
        connectionIdNum,
        userId
      );
    } catch (error) {
      logger.error("[DbConnectionController] getDbSchema 에러:", error);
      throw error;
    }
  }

  @RequestMapping({
    route: "/schema/table/detail",
    method: REQUEST_METHOD.POST
  })
  async getTableDetail(
    @Body()
    data: {
      connectionId: number;
      tableName: string;
      includeData?: boolean;
      dataLimit?: number;
    },
    @Session() session: any
  ): Promise<GetTableDetailResponse> {
    try {
      const userId = session?.login_info?.ID;
      if (!userId) throw new Error("인증되지 않은 사용자입니다.");

      const connectionIdNum = data.connectionId;
      if (!connectionIdNum || connectionIdNum <= 0) {
        throw new Error(`유효하지 않은 연결 ID입니다: ${connectionIdNum}`);
      }
      return await this.dbConnectionService.getTableDetail(
        connectionIdNum,
        userId,
        data.tableName,
        data.includeData ?? false,
        data.dataLimit ?? 10
      );
    } catch (error) {
      logger.error("[DbConnectionController] getTableDetail 에러:", error);
      throw error;
    }
  }

  @RequestMapping({
    route: "/detail/:connectionId",
    method: REQUEST_METHOD.POST
  })
  async getDbConnectionDetail(
    @Param("connectionId") connectionId: string,
    @Session() session: any
  ): Promise<any> {
    try {
      const userId = session?.login_info?.ID;
      if (!userId) throw new Error("인증되지 않은 사용자입니다.");

      const connectionIdNum = parseInt(connectionId);
      if (isNaN(connectionIdNum) || connectionIdNum <= 0) {
        throw new Error(`유효하지 않은 연결 ID입니다: ${connectionId}`);
      }
      return await this.dbConnectionService.getDbConnectionDetail(
        connectionIdNum,
        userId
      );
    } catch (error) {
      logger.error(
        "[DbConnectionController] getDbConnectionDetail 에러:",
        error
      );
      throw error;
    }
  }

  @RequestMapping({
    route: "/schema/table/update",
    method: REQUEST_METHOD.POST
  })
  async updateTable(
    @Body()
    data: {
      connectionId: number;
      tableName: string;
      newTableName?: string;
      tableComment?: string;
    },
    @Session() session: any
  ): Promise<UpdateTableResponse> {
    try {
      const userId = session?.login_info?.ID;
      if (!userId) throw new Error("인증되지 않은 사용자입니다.");

      const connectionIdNum = data.connectionId;
      if (!connectionIdNum || connectionIdNum <= 0) {
        throw new Error(`유효하지 않은 연결 ID입니다: ${connectionIdNum}`);
      }
      const request: UpdateTableRequest = {
        connectionId: connectionIdNum,
        tableName: data.tableName,
        newTableName: data.newTableName,
        tableComment: data.tableComment
      };

      return await this.dbConnectionService.updateTable(
        connectionIdNum,
        userId,
        request
      );
    } catch (error) {
      logger.error("[DbConnectionController] updateTable 에러:", error);
      throw error;
    }
  }

  @RequestMapping({
    route: "/schema/table/delete",
    method: REQUEST_METHOD.POST
  })
  async deleteTable(
    @Body() data: { connectionId: number; tableName: string },
    @Session() session: any
  ): Promise<DeleteTableResponse> {
    try {
      const userId = session?.login_info?.ID;
      if (!userId) throw new Error("인증되지 않은 사용자입니다.");

      const connectionIdNum = data.connectionId;
      if (!connectionIdNum || connectionIdNum <= 0) {
        throw new Error(`유효하지 않은 연결 ID입니다: ${connectionIdNum}`);
      }
      return await this.dbConnectionService.deleteTable(
        connectionIdNum,
        userId,
        data.tableName
      );
    } catch (error) {
      logger.error("[DbConnectionController] deleteTable 에러:", error);
      throw error;
    }
  }

  @RequestMapping({
    route: "/schema/table/create",
    method: REQUEST_METHOD.POST
  })
  async createTable(
    @Body() data: CreateTableRequest,
    @Session() session: any
  ): Promise<CreateTableResponse> {
    try {
      const userId = session?.login_info?.ID;
      if (!userId) throw new Error("인증되지 않은 사용자입니다.");

      const connectionIdNum = data.connectionId;
      if (!connectionIdNum || connectionIdNum <= 0) {
        throw new Error(`유효하지 않은 연결 ID입니다: ${connectionIdNum}`);
      }
      return await this.dbConnectionService.createTable(
        connectionIdNum,
        userId,
        data
      );
    } catch (error) {
      logger.error("[DbConnectionController] createTable 에러:", error);
      throw error;
    }
  }

  @RequestMapping({
    route: "/schema/column/add",
    method: REQUEST_METHOD.POST
  })
  async addColumn(
    @Body() data: AddColumnRequest,
    @Session() session: any
  ): Promise<AddColumnResponse> {
    try {
      const userId = session?.login_info?.ID;
      if (!userId) throw new Error("인증되지 않은 사용자입니다.");

      const connectionIdNum = data.connectionId;
      if (!connectionIdNum || connectionIdNum <= 0) {
        throw new Error(`유효하지 않은 연결 ID입니다: ${connectionIdNum}`);
      }
      return await this.dbConnectionService.addColumn(
        connectionIdNum,
        userId,
        data
      );
    } catch (error) {
      logger.error("[DbConnectionController] addColumn 에러:", error);
      throw error;
    }
  }

  @RequestMapping({
    route: "/schema/column/update",
    method: REQUEST_METHOD.POST
  })
  async updateColumn(
    @Body() data: UpdateColumnRequest,
    @Session() session: any
  ): Promise<UpdateColumnResponse> {
    try {
      const userId = session?.login_info?.ID;
      if (!userId) throw new Error("인증되지 않은 사용자입니다.");

      const connectionIdNum = data.connectionId;
      if (!connectionIdNum || connectionIdNum <= 0) {
        throw new Error(`유효하지 않은 연결 ID입니다: ${connectionIdNum}`);
      }
      return await this.dbConnectionService.updateColumn(
        connectionIdNum,
        userId,
        data
      );
    } catch (error) {
      logger.error("[DbConnectionController] updateColumn 에러:", error);
      throw error;
    }
  }

  @RequestMapping({
    route: "/schema/column/delete",
    method: REQUEST_METHOD.POST
  })
  async deleteColumn(
    @Body()
    data: {
      connectionId: number;
      tableName: string;
      columnName: string;
    },
    @Session() session: any
  ): Promise<DeleteColumnResponse> {
    try {
      const userId = session?.login_info?.ID;
      if (!userId) throw new Error("인증되지 않은 사용자입니다.");

      const connectionIdNum = data.connectionId;
      if (!connectionIdNum || connectionIdNum <= 0) {
        throw new Error(`유효하지 않은 연결 ID입니다: ${connectionIdNum}`);
      }
      return await this.dbConnectionService.deleteColumn(
        connectionIdNum,
        userId,
        data.tableName,
        data.columnName
      );
    } catch (error) {
      logger.error("[DbConnectionController] deleteColumn 에러:", error);
      throw error;
    }
  }

  /**
   * 기존 RAG 전처리 정보 확인
   */
  @RequestMapping({ route: "/rag/check-existing", method: REQUEST_METHOD.POST })
  async checkExistingRag(@Session() session: any): Promise<any> {
    try {
      const userId = session?.login_info?.ID;
      if (!userId) throw new Error("인증되지 않은 사용자입니다.");
      return await this.ragPreprocessingService.checkExistingRagInfo(userId);
    } catch (error) {
      logger.error("[DbConnectionController] checkExistingRag 에러:", error);
      throw error;
    }
  }

  /**
   * RAG 전처리 요청
   */
  @RequestMapping({ route: "/rag/preprocess", method: REQUEST_METHOD.POST })
  async requestRagPreprocessing(
    @Session() session: any,
    @Body() data: RagPreprocessingRequest
  ): Promise<RagPreprocessingResponse> {
    try {
      // 세션에서 userId 추출
      const userId = session?.login_info?.ID;
      return await this.ragPreprocessingService.requestPreprocessing(
        userId,
        data
      );
    } catch (error) {
      logger.error(
        "[DbConnectionController] requestRagPreprocessing 에러:",
        error
      );
      throw error;
    }
  }

  /**
   * RAG 전처리 이력 조회
   */
  @RequestMapping({ route: "/rag/history", method: REQUEST_METHOD.POST })
  async getRagPreprocessingHistory(
    @Session() session: any,
    @Body() data: GetRagPreprocessingHistoryRequest
  ): Promise<GetRagPreprocessingHistoryResponse> {
    try {
      // 세션에서 userId 추출
      const userId = session?.login_info?.ID;
      // 첫 번째 호출 시 processing 상태 폴링 재시작 (서버 재시작 후 복구)
      await this.ragPreprocessingService.resumeProcessingPolling();

      return await this.ragPreprocessingService.getPreprocessingHistory(
        userId,
        data
      );
    } catch (error) {
      logger.error(
        "[DbConnectionController] getRagPreprocessingHistory 에러:",
        error
      );
      throw error;
    }
  }

  /**
   * 모든 DB의 RAG 전처리 이력 일괄 조회 (2026-02-05)
   * 여러 번의 API 호출 대신 한 번에 모든 DB의 RAG 상태를 조회
   */
  @RequestMapping({ route: "/rag/history/all", method: REQUEST_METHOD.POST })
  async getAllRagPreprocessingHistory(
    @Session() session: any
  ): Promise<GetAllRagPreprocessingHistoryResponse> {
    try {
      const userId = session?.login_info?.ID;
      if (!userId) throw new Error("인증되지 않은 사용자입니다.");
      return await this.ragPreprocessingService.getAllPreprocessingHistory(userId);
    } catch (error) {
      logger.error(
        "[DbConnectionController] getAllRagPreprocessingHistory 에러:",
        error
      );
      throw error;
    }
  }

  /**
   * RAG 전처리 이력 상세 조회
   */
  @RequestMapping({
    route: "/rag/history/:historyId",
    method: REQUEST_METHOD.POST
  })
  async getRagPreprocessingHistoryDetail(
    @Session() session: any,
    @Param("historyId") historyId: string
  ): Promise<RagPreprocessingHistory | null> {
    try {
      // 세션에서 userId 추출
      const userId = session?.login_info?.ID;

      const historyIdNum = parseInt(historyId, 10);
      if (isNaN(historyIdNum) || historyIdNum <= 0) {
        throw new Error(`유효하지 않은 이력 ID입니다: ${historyId}`);
      }
      return await this.ragPreprocessingService.getHistoryDetail(
        userId,
        historyIdNum
      );
    } catch (error) {
      logger.error(
        "[DbConnectionController] getRagPreprocessingHistoryDetail 에러:",
        error
      );
      throw error;
    }
  }

  /**
   * 테이블 데이터 삽입 API (2025-12-21)
   * 데이터베이스 팝업에서 테이블에 새 행 추가
   */
  @RequestMapping({
    route: "/schema/table/data/insert",
    method: REQUEST_METHOD.POST
  })
  async insertTableData(
    @Body() data: InsertTableDataRequest,
    @Session() session: any
  ): Promise<InsertTableDataResponse> {
    try {
      const userId = session?.login_info?.ID;
      if (!userId) {
        throw new Error("인증되지 않은 사용자입니다.");
      }


      return await this.dbConnectionService.insertTableData(
        data.connectionId,
        userId,
        data
      );
    } catch (error) {
      logger.error("[DbConnectionController] insertTableData 에러:", error);
      throw error;
    }
  }
}
