import {
  Autowired,
  Controller,
  RequestMapping,
  Param,
  REQUEST_METHOD
} from "@orkis/core/common";
import logger from "@orkis/core/utils";
import type {
  GetRecommendedQuestionsRequest,
  GetRecommendedQuestionsResponse
} from "@orkis-interface/backend/recommended-question";
import { RecommendedQuestionService } from "./RecommendedQuestionService";

@Controller({ path: "/recommended-questions" })
export class RecommendedQuestionController {
  @Autowired("RecommendedQuestionService")
  private recommendedQuestionService!: RecommendedQuestionService;

  /**
   * GET /recommended-questions
   * 추천 질문 목록 조회
   *
   * Query Parameters:
   * - category: 카테고리 필터 (Knowledge, Image, Coding, Data, SQL)
   * - questionType: 질문 타입 필터 (general, data, sql)
   * - isActive: 활성화 여부 (true/false)
   * - limit: 조회 개수 제한
   */
  @RequestMapping({
    route: "",
    method: REQUEST_METHOD.GET
  })
  async getRecommendedQuestions(
    @Param("category") category?: string,
    @Param("questionType") questionType?: string,
    @Param("isActive") isActive?: string,
    @Param("limit") limit?: string
  ): Promise<GetRecommendedQuestionsResponse> {
    try {
      const params: GetRecommendedQuestionsRequest = {
        category,
        questionType,
        isActive: isActive ? isActive === "true" : undefined,
        limit: limit ? parseInt(limit, 10) : undefined
      };      const response =
        await this.recommendedQuestionService.getRecommendedQuestions(params);

      return response;
    } catch (error) {
      logger.error(
        "[RecommendedQuestionController] 추천 질문 조회 에러:",
        error
      );
      throw error;
    }
  }
}
