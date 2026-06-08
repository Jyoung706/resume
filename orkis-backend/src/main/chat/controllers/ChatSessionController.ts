import {
  Autowired,
  Controller,
  Body,
  RequestMapping,
  Param,
  Session,
  REQUEST_METHOD
} from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { CreateSessionRequest } from "@orkis-interface/backend/chat";
import { ChatSession } from "@orkis-interface/shared/models";
import { ChatSessionService } from "../services/ChatSessionService";
import {
  ApiResponse,
  CreateSessionApiResponse,
  DeleteSessionResponse,
  SessionListApiResponse
} from "../types/common";
import { ResponseHelper } from "../utils/ResponseHelper";

@Controller({ path: "/chat/sessions" })
export class ChatSessionController {
  @Autowired("ChatSessionService")
  private chatSessionService!: ChatSessionService;
  @RequestMapping({
    route: "/list",
    method: REQUEST_METHOD.POST
  })
  async getSessions(@Session() session: any): Promise<SessionListApiResponse> {
    try {
      const userId = session?.login_info?.ID;

      if (!userId) {
        return ResponseHelper.createErrorResponse(
          "AUTH_REQUIRED",
          "인증이 필요합니다."
        );
      }

      const result = await this.chatSessionService.getUserSessions(userId);
      const responseData = {
        ...result,
        pagination: {
          page: 1,
          limit: 100,
          total: result.sessions.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      };
      return ResponseHelper.createSuccessResponse(responseData);
    } catch (error) {
      // 에러는 ResponseHelper.handleError에서 처리됨
      return ResponseHelper.handleError(
        error,
        "SESSION_LIST_ERROR",
        "세션 목록 조회 중 오류가 발생했습니다."
      );
    }
  }
  // 채팅방 생성
  @RequestMapping({
    route: "/",
    method: REQUEST_METHOD.POST
  })
  async createSession(
    @Body() request: CreateSessionRequest,
    @Session() session: any
  ): Promise<CreateSessionApiResponse> {
    try {
      const userId = session?.login_info?.ID;

      if (!userId) {
        return ResponseHelper.createErrorResponse(
          "AUTH_REQUIRED",
          "인증이 필요합니다."
        );
      }

      const result = await this.chatSessionService.createSession(
        userId,
        request
      );
      return ResponseHelper.createSuccessResponse(result);
    } catch (error) {
      // 에러는 ResponseHelper.handleError에서 처리됨
      return ResponseHelper.handleError(
        error,
        "SESSION_CREATE_ERROR",
        "세션 생성 중 오류가 발생했습니다."
      );
    }
  }
  @RequestMapping({
    route: "/:sessionId/update",
    method: REQUEST_METHOD.POST
  })
  async updateSessionTitle(
    @Param("sessionId") sessionId: string,
    @Body() request: { title: string; titleModified?: boolean },
    @Session() session: any
  ): Promise<ApiResponse<ChatSession>> {
    try {
      // 세션 디버깅 로그      const userId = session?.login_info?.ID;
      if (!userId) {
        logger.error("[ChatSessionController] 세션 인증 실패 - userId가 없음");
        return ResponseHelper.createErrorResponse(
          "AUTH_REQUIRED",
          "인증이 필요합니다."
        );
      }

      if (!sessionId || !request.title) {
        return ResponseHelper.createErrorResponse(
          "INVALID_REQUEST",
          "sessionId와 title이 필요합니다."
        );
      }

      const updatedSession = await this.chatSessionService.updateSessionTitle(
        sessionId,
        userId,
        request.title,
        request.titleModified // titleModified 파라미터 전달
      );

      return ResponseHelper.createSuccessResponse(updatedSession);
    } catch (error) {
      // 에러는 ResponseHelper.handleError에서 처리됨
      return ResponseHelper.handleError(
        error,
        "SESSION_UPDATE_ERROR",
        "세션 업데이트 중 오류가 발생했습니다."
      );
    }
  }
  @RequestMapping({
    route: "/:sessionId/delete",
    method: REQUEST_METHOD.POST
  })
  async deleteSession(
    @Param("sessionId") sessionId: string,
    @Session() session: any
  ): Promise<DeleteSessionResponse> {
    try {
      const userId = session?.login_info?.ID;
      if (!userId) {
        return ResponseHelper.createErrorResponse(
          "AUTH_REQUIRED",
          "인증이 필요합니다."
        ) as any;
      }

      if (!sessionId) {
        return ResponseHelper.createErrorResponse(
          "INVALID_REQUEST",
          "sessionId가 필요합니다."
        ) as any;
      }

      await this.chatSessionService.deleteSession(userId, sessionId);
      return {
        success: true,
        message: "세션이 성공적으로 삭제되었습니다.",
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return ResponseHelper.handleError(
        error,
        "DELETE_ERROR",
        "세션 삭제 중 오류가 발생했습니다."
      ) as any;
    }
  }

  // 즐겨찾기 토글
  @RequestMapping({
    route: "/:sessionId/favorite",
    method: REQUEST_METHOD.POST
  })
  async toggleFavorite(
    @Param("sessionId") sessionId: string,
    @Body() request: { isFavorite: boolean },
    @Session() session: any
  ): Promise<ApiResponse<ChatSession>> {
    try {
      const userId = session?.login_info?.ID;
      if (!userId) {
        return ResponseHelper.createErrorResponse(
          "AUTH_REQUIRED",
          "인증이 필요합니다."
        );
      }

      if (!sessionId) {
        return ResponseHelper.createErrorResponse(
          "INVALID_REQUEST",
          "sessionId가 필요합니다."
        );
      }

      const updatedSession = await this.chatSessionService.toggleFavorite(
        sessionId,
        userId,
        request.isFavorite
      );

      return ResponseHelper.createSuccessResponse(updatedSession);
    } catch (error) {
      return ResponseHelper.handleError(
        error,
        "FAVORITE_TOGGLE_ERROR",
        "즐겨찾기 설정 중 오류가 발생했습니다."
      );
    }
  }
}
