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
import type {
  AnswerTicketRequest,
  CommonCode,
  CreateTicketRequest,
  GetTicketsResponse,
  SupportApiResponse,
  SupportStats,
  SupportTicket
} from "@orkis-interface/backend/support";
import { SupportService } from "./SupportService";

@Controller({ path: "/support" })
export class SupportController {
  @Autowired("SupportService")
  private supportService!: SupportService;

  // POST /support/tickets - 문의 생성
  @RequestMapping({
    route: "/tickets",
    method: REQUEST_METHOD.POST
  })
  async createTicket(
    @Session() session: any,
    @Body() body: CreateTicketRequest
  ): Promise<SupportApiResponse<{ ticket: SupportTicket }>> {
    try {
      const userId = session?.login_info?.ID;

      if (!userId) {
        return {
          success: false,
          error: {
            code: "AUTH_REQUIRED",
            message: "인증이 필요합니다."
          }
        };
      }

      const userName = session?.login_info?.NAME || "Unknown";
      const userEmail = session?.login_info?.EMAIL || "";

      const ticket = await this.supportService.createTicket(
        body,
        userId,
        userName,
        userEmail
      );

      return {
        success: true,
        data: { ticket }
      };
    } catch (error) {
      logger.error("[SupportController] createTicket 오류", error);
      return {
        success: false,
        error: {
          code: "TICKET_CREATE_ERROR",
          message:
            error instanceof Error ? error.message : "문의 등록에 실패했습니다."
        }
      };
    }
  }

  // GET /support/tickets - 문의 목록 조회
  @RequestMapping({
    route: "/tickets",
    method: REQUEST_METHOD.GET
  })
  async getTickets(
    @Session() session: any,
    @Param("statusCode") statusCode?: string,
    @Param("categoryCode") categoryCode?: string,
    @Param("page") page?: string,
    @Param("limit") limit?: string,
    @Param("sortBy") sortBy?: string,
    @Param("sortOrder") sortOrder?: string
  ): Promise<SupportApiResponse<GetTicketsResponse>> {
    try {
      const userId = session?.login_info?.ID;

      if (!userId) {
        return {
          success: false,
          error: {
            code: "AUTH_REQUIRED",
            message: "인증이 필요합니다."
          }
        };
      }

      const params = {
        statusCode,
        categoryCode,
        page: parseInt(page || "1"),
        limit: Math.min(parseInt(limit || "10"), 50),
        sortBy: (sortBy as any) || "created_at",
        sortOrder: (sortOrder as any) || "desc"
      };

      const result = await this.supportService.getTickets(userId, params);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error("[SupportController] getTickets 오류", error);
      return {
        success: false,
        error: {
          code: "TICKET_LIST_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "문의 목록 조회에 실패했습니다."
        }
      };
    }
  }

  // GET /support/tickets/:id - 문의 상세 조회
  @RequestMapping({
    route: "/tickets/:id",
    method: REQUEST_METHOD.GET
  })
  async getTicket(
    @Session() session: any,
    @Param("id") id?: string
  ): Promise<SupportApiResponse<{ ticket: SupportTicket }>> {
    try {
      const userId = session?.login_info?.ID;

      if (!userId) {
        return {
          success: false,
          error: {
            code: "AUTH_REQUIRED",
            message: "인증이 필요합니다."
          }
        };
      }

      if (!id) {
        return {
          success: false,
          error: {
            code: "INVALID_PARAM",
            message: "문의 ID가 필요합니다."
          }
        };
      }

      const ticket = await this.supportService.getTicketById(id, userId);

      return {
        success: true,
        data: { ticket }
      };
    } catch (error) {
      logger.error("[SupportController] getTicket 오류", error);

      if (
        error instanceof Error &&
        error.message.includes("찾을 수 없습니다")
      ) {
        return {
          success: false,
          error: {
            code: "TICKET_NOT_FOUND",
            message: error.message
          }
        };
      }

      return {
        success: false,
        error: {
          code: "TICKET_GET_ERROR",
          message:
            error instanceof Error ? error.message : "문의 조회에 실패했습니다."
        }
      };
    }
  }

  // POST /support/tickets/:id/answer - 답변 등록 (관리자)
  @RequestMapping({
    route: "/tickets/:id/answer",
    method: REQUEST_METHOD.POST
  })
  async answerTicket(
    @Session() session: any,
    @Param("id") id?: string,
    @Body() body?: AnswerTicketRequest
  ): Promise<SupportApiResponse<{ ticket: SupportTicket }>> {
    try {
      const userId = session?.login_info?.ID;

      if (!userId) {
        return {
          success: false,
          error: {
            code: "AUTH_REQUIRED",
            message: "인증이 필요합니다."
          }
        };
      }

      if (!id) {
        return {
          success: false,
          error: {
            code: "INVALID_PARAM",
            message: "문의 ID가 필요합니다."
          }
        };
      }

      if (!body || !body.answer) {
        return {
          success: false,
          error: {
            code: "INVALID_PARAM",
            message: "답변 내용이 필요합니다."
          }
        };
      }

      const userName = session?.login_info?.NAME || "Admin";

      const ticket = await this.supportService.answerTicket(
        id,
        body.answer,
        userId,
        userName
      );

      return {
        success: true,
        data: { ticket }
      };
    } catch (error) {
      logger.error("[SupportController] answerTicket 오류", error);

      if (error instanceof Error && error.message.includes("권한")) {
        return {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: error.message
          }
        };
      }

      return {
        success: false,
        error: {
          code: "ANSWER_CREATE_ERROR",
          message:
            error instanceof Error ? error.message : "답변 등록에 실패했습니다."
        }
      };
    }
  }

  // DELETE /support/tickets/:id - 문의 삭제
  @RequestMapping({
    route: "/tickets/:id",
    method: REQUEST_METHOD.POST
  })
  async deleteTicket(
    @Session() session: any,
    @Param("id") id?: string
  ): Promise<SupportApiResponse<{ message: string }>> {
    try {
      const userId = session?.login_info?.ID;

      if (!userId) {
        return {
          success: false,
          error: {
            code: "AUTH_REQUIRED",
            message: "인증이 필요합니다."
          }
        };
      }

      if (!id) {
        return {
          success: false,
          error: {
            code: "INVALID_PARAM",
            message: "문의 ID가 필요합니다."
          }
        };
      }

      await this.supportService.deleteTicket(id, userId);

      return {
        success: true,
        data: { message: "문의가 삭제되었습니다" }
      };
    } catch (error) {
      logger.error("[SupportController] deleteTicket 오류", error);

      if (error instanceof Error && error.message.includes("권한")) {
        return {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: error.message
          }
        };
      }

      return {
        success: false,
        error: {
          code: "TICKET_DELETE_ERROR",
          message:
            error instanceof Error ? error.message : "문의 삭제에 실패했습니다."
        }
      };
    }
  }

  // GET /support/categories - 카테고리 목록
  @RequestMapping({
    route: "/categories",
    method: REQUEST_METHOD.GET
  })
  async getCategories(): Promise<
    SupportApiResponse<{ categories: CommonCode[] }>
  > {
    try {
      const categories = await this.supportService.getCategories();

      return {
        success: true,
        data: { categories }
      };
    } catch (error) {
      logger.error("[SupportController] getCategories 오류", error);
      return {
        success: false,
        error: {
          code: "CATEGORY_LIST_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "카테고리 목록 조회에 실패했습니다."
        }
      };
    }
  }

  // GET /support/statuses - 상태 목록
  @RequestMapping({
    route: "/statuses",
    method: REQUEST_METHOD.GET
  })
  async getStatuses(): Promise<SupportApiResponse<{ statuses: CommonCode[] }>> {
    try {
      const statuses = await this.supportService.getStatuses();

      return {
        success: true,
        data: { statuses }
      };
    } catch (error) {
      logger.error("[SupportController] getStatuses 오류", error);
      return {
        success: false,
        error: {
          code: "STATUS_LIST_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "상태 목록 조회에 실패했습니다."
        }
      };
    }
  }

  // GET /support/priorities - 우선순위 목록
  @RequestMapping({
    route: "/priorities",
    method: REQUEST_METHOD.GET
  })
  async getPriorities(): Promise<
    SupportApiResponse<{ priorities: CommonCode[] }>
  > {
    try {
      const priorities = await this.supportService.getPriorities();

      return {
        success: true,
        data: { priorities }
      };
    } catch (error) {
      logger.error("[SupportController] getPriorities 오류", error);
      return {
        success: false,
        error: {
          code: "PRIORITY_LIST_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "우선순위 목록 조회에 실패했습니다."
        }
      };
    }
  }

  // GET /support/stats - 통계 조회
  @RequestMapping({
    route: "/stats",
    method: REQUEST_METHOD.GET
  })
  async getStats(
    @Session() session: any
  ): Promise<SupportApiResponse<{ stats: SupportStats }>> {
    try {
      const userId = session?.login_info?.ID;
      const stats = await this.supportService.getStats(userId);

      return {
        success: true,
        data: { stats }
      };
    } catch (error) {
      logger.error("[SupportController] getStats 오류", error);
      return {
        success: false,
        error: {
          code: "STATS_GET_ERROR",
          message:
            error instanceof Error ? error.message : "통계 조회에 실패했습니다."
        }
      };
    }
  }
}
