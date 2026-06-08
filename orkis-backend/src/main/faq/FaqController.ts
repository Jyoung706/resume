import {
  Autowired,
  Controller,
  RequestMapping,
  Param,
  REQUEST_METHOD
} from "@orkis/core/common";
import logger from "@orkis/core/utils";
import type {
  GetFaqListRequest,
  GetFaqListResponse,
  FaqApiResponse
} from "@orkis-interface/backend/faq";
import { FaqService } from "./FaqService";

@Controller({ path: "/faq" })
export class FaqController {
  @Autowired("FaqService")
  private faqService!: FaqService;

  /**
   * GET /faq/list
   * FAQ 목록 조회 (카테고리 + 항목)
   *
   * Query Parameters:
   * - categoryCode: string (optional) - 카테고리 필터 (TICKET_CATEGORY 공통코드)
   * - search: string (optional) - 검색어
   */
  @RequestMapping({
    route: "/list",
    method: REQUEST_METHOD.GET
  })
  async getFaqList(
    @Param("categoryCode") categoryCode?: string,
    @Param("search") search?: string
  ): Promise<GetFaqListResponse> {
    try {
      const params: GetFaqListRequest = {
        categoryCode,
        search,
        isActive: true
      };

      const result = await this.faqService.getFaqList(params);

      return result;
    } catch (error) {
      logger.error("[FaqController] getFaqList 에러:", error);
      throw error;
    }
  }

  /**
   * POST /faq/view/:itemId
   * FAQ 항목 조회수 증가
   */
  @RequestMapping({
    route: "/view/:itemId",
    method: REQUEST_METHOD.POST
  })
  async incrementViewCount(
    @Param("itemId") itemId: string
  ): Promise<FaqApiResponse<void>> {
    try {
      await this.faqService.incrementViewCount(itemId);

      return {
        success: true
      };
    } catch (error) {
      logger.error("[FaqController] incrementViewCount 에러:", error);
      return {
        success: false,
        message: "조회수 증가 중 오류가 발생했습니다."
      };
    }
  }
}
