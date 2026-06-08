import {
  Autowired,
  Controller,
  RequestMapping,
  Param,
  REQUEST_METHOD
} from "@orkis/core/common";
import logger from "@orkis/core/utils";
import type {
  GetHelpListRequest,
  GetHelpListResponse,
  HelpApiResponse
} from "@orkis-interface/backend/help";
import { HelpService } from "./HelpService";

@Controller({ path: "/help" })
export class HelpController {
  @Autowired("HelpService")
  private helpService!: HelpService;

  /**
   * GET /help/list
   * 도움말 목록 조회 (카테고리 + 항목)
   *
   * Query Parameters:
   * - categoryId: string (optional) - 카테고리 필터
   * - search: string (optional) - 검색어
   */
  @RequestMapping({
    route: "/list",
    method: REQUEST_METHOD.GET
  })
  async getHelpList(
    @Param("categoryId") categoryId?: string,
    @Param("search") search?: string
  ): Promise<GetHelpListResponse> {
    try {      const params: GetHelpListRequest = {
        categoryId,
        search,
        isActive: true
      };

      const result = await this.helpService.getHelpList(params);

      return result;
    } catch (error) {
      logger.error("[HelpController] getHelpList 에러:", error);
      throw error;
    }
  }

  /**
   * POST /help/view/:itemId
   * 도움말 항목 조회수 증가
   */
  @RequestMapping({
    route: "/view/:itemId",
    method: REQUEST_METHOD.POST
  })
  async incrementViewCount(
    @Param("itemId") itemId: string
  ): Promise<HelpApiResponse<void>> {
    try {      await this.helpService.incrementViewCount(itemId);

      return {
        success: true
      };
    } catch (error) {
      logger.error("[HelpController] incrementViewCount 에러:", error);
      return {
        success: false,
        message: "조회수 증가 중 오류가 발생했습니다."
      };
    }
  }
}
