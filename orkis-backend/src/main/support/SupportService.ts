import { Autowired, Service, Transactional } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import type {
  CommonCode,
  CreateTicketRequest,
  GetTicketsParams,
  GetTicketsResponse,
  SupportStats,
  SupportTicket
} from "@orkis-interface/backend/support";
import { SupportDao } from "@/support/SupportDao";

@Service("SupportService")
export class SupportService {
  @Autowired("SupportDao")
  private dao!: SupportDao;

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/support/SupportController.ts - createTicket() 메서드 (라인 54)
  // 문의 생성
  @Transactional()
  async createTicket(
    request: CreateTicketRequest,
    userId: string,
    userName: string,
    userEmail: string
  ): Promise<SupportTicket> {
    try {
      // 입력 검증
      this.validateCreateTicket(request);

      // 문의 생성
      const ticket = await this.dao.createTicket(
        request,
        userId,
        userName,
        userEmail
      );      return ticket;
    } catch (error) {
      logger.error("[SupportService] 문의 생성 실패:", error);
      throw error;
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/support/SupportController.ts - getTickets() 메서드 (라인 115)
  // 문의 목록 조회
  @Transactional()
  async getTickets(
    userId: string,
    params: GetTicketsParams
  ): Promise<GetTicketsResponse> {
    try {
      const { tickets, total } = await this.dao.getTickets(userId, params);

      const page = params.page || 1;
      const limit = params.limit || 10;
      const totalPages = Math.ceil(total / limit);

      return {
        tickets,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasMore: page < totalPages
        }
      };
    } catch (error) {
      logger.error("[SupportService] 문의 목록 조회 실패:", error);
      throw error;
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/support/SupportController.ts - getTicketById() 메서드 (라인 167), 같은 클래스 내부 - deleteTicket() 메서드에서 호출
  // 문의 상세 조회
  @Transactional()
  async getTicketById(id: string, userId: string): Promise<SupportTicket> {
    try {
      const ticket = await this.dao.getTicketById(id);

      if (!ticket) {
        throw new Error("문의를 찾을 수 없습니다");
      }

      // 권한 확인 (본인 문의만 조회 가능)
      if (ticket.userId !== userId) {
        throw new Error("접근 권한이 없습니다");
      }

      return ticket;
    } catch (error) {
      logger.error("[SupportService] 문의 상세 조회 실패:", error);
      throw error;
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/support/SupportController.ts - answerTicket() 메서드 (라인 243)
  // 답변 등록 (관리자)
  @Transactional()
  async answerTicket(
    id: string,
    answer: string,
    adminUserId: string,
    adminUserName: string
  ): Promise<SupportTicket> {
    try {
      // 입력 검증
      if (!answer || answer.trim().length === 0) {
        throw new Error("답변 내용을 입력해주세요");
      }

      if (answer.length < 10) {
        throw new Error("답변은 10자 이상 입력해주세요");
      }

      const ticket = await this.dao.answerTicket(
        id,
        answer,
        adminUserId,
        adminUserName
      );      return ticket;
    } catch (error) {
      logger.error("[SupportService] 답변 등록 실패:", error);
      throw error;
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: 같은 클래스 내부 - getCategories(), getStatuses(), getPriorities() 메서드에서 호출
  // 공통코드 조회
  @Transactional()
  async getCommonCodes(groupId: string): Promise<CommonCode[]> {
    try {
      return await this.dao.getCommonCodes(groupId);
    } catch (error) {
      logger.error("[SupportService] 공통코드 조회 실패:", error);
      throw error;
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/support/SupportController.ts - getCategories() 메서드 (라인 349)
  // 카테고리 목록 조회
  async getCategories(): Promise<CommonCode[]> {
    return this.getCommonCodes("TICKET_CATEGORY");
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/support/SupportController.ts - getStatuses() 메서드 (라인 376)
  // 상태 목록 조회
  async getStatuses(): Promise<CommonCode[]> {
    return this.getCommonCodes("TICKET_STATUS");
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/support/SupportController.ts - getPriorities() 메서드 (라인 403)
  // 우선순위 목록 조회
  async getPriorities(): Promise<CommonCode[]> {
    return this.getCommonCodes("TICKET_PRIORITY");
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/support/SupportController.ts - getStats() 메서드 (라인 433)
  // 통계 조회
  async getStats(userId?: string): Promise<SupportStats> {
    try {
      return await this.dao.getStats(userId);
    } catch (error) {
      logger.error("[SupportService] 통계 조회 실패:", error);
      throw error;
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/support/SupportController.ts - deleteTicket() 메서드 (라인 311)
  // 문의 삭제
  async deleteTicket(id: string, userId: string): Promise<void> {
    try {
      // 권한 확인
      const ticket = await this.dao.getTicketById(id);
      if (!ticket) {
        throw new Error("문의를 찾을 수 없습니다");
      }

      if (ticket.userId !== userId) {
        throw new Error("접근 권한이 없습니다");
      }

      const deleted = await this.dao.deleteTicket(id);
      if (!deleted) {
        throw new Error("문의 삭제에 실패했습니다");
      }    } catch (error) {
      logger.error("[SupportService] 문의 삭제 실패:", error);
      throw error;
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: 같은 클래스 내부 - createTicket() 메서드에서 호출
  // 입력 검증
  private validateCreateTicket(request: CreateTicketRequest): void {
    // 제목 검증
    if (!request.title || request.title.trim().length === 0) {
      throw new Error("제목을 입력해주세요");
    }
    if (request.title.length < 5) {
      throw new Error("제목은 5자 이상 입력해주세요");
    }
    if (request.title.length > 200) {
      throw new Error("제목은 200자를 초과할 수 없습니다");
    }

    // 카테고리 검증
    if (!request.categoryCode) {
      throw new Error("문의 유형을 선택해주세요");
    }

    // 설명 검증
    if (!request.description || request.description.trim().length === 0) {
      throw new Error("문의 내용을 입력해주세요");
    }
    if (request.description.length < 10) {
      throw new Error("문의 내용은 10자 이상 입력해주세요");
    }
    if (request.description.length > 2000) {
      throw new Error("문의 내용은 2000자를 초과할 수 없습니다");
    }
  }
}
