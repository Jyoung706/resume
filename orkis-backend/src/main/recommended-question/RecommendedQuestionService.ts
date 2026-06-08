import { Autowired, Service, Transactional } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import type {
  GetRecommendedQuestionsRequest,
  GetRecommendedQuestionsResponse
} from "@orkis-interface/backend/recommended-question";
import { RecommendedQuestionDao } from "@/recommended-question/RecommendedQuestionDao";

@Service("RecommendedQuestionService")
export class RecommendedQuestionService {
  @Autowired("RecommendedQuestionDao")
  private recommendedQuestionDao!: RecommendedQuestionDao;

  /**
   * 추천 질문 목록 조회
   */
  @Transactional()
  async getRecommendedQuestions(
    params: GetRecommendedQuestionsRequest
  ): Promise<GetRecommendedQuestionsResponse> {
    try {      const [questions, total] = await Promise.all([
        this.recommendedQuestionDao.findQuestionsByConditions(params),
        this.recommendedQuestionDao.countQuestions(params)
      ]);      return {
        questions,
        total
      };
    } catch (error) {
      logger.error(
        "[RecommendedQuestionService] getRecommendedQuestions 에러:",
        error
      );
      throw error;
    }
  }
}
