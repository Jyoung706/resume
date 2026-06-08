import { Autowired, Service, Transactional } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import type {
  GetFaqListRequest,
  GetFaqListResponse
} from "@orkis-interface/backend/faq";
import { FaqDao } from "@/faq/FaqDao";

@Service("FaqService")
export class FaqService {
  @Autowired("FaqDao")
  private faqDao!: FaqDao;

  /**
   * FAQ 목록 조회 (카테고리 + 항목)
   */
  @Transactional()
  async getFaqList(params: GetFaqListRequest): Promise<GetFaqListResponse> {
    try {
      // 카테고리 목록 조회 (TICKET_CATEGORY 공통코드)
      const categories = await this.faqDao.findAllCategories();

      // FAQ 항목 조회
      const items = await this.faqDao.findItemsByConditions(params);

      return {
        categories,
        items
      };
    } catch (error) {
      logger.error("[FaqService] getFaqList 에러:", error);
      throw error;
    }
  }

  /**
   * FAQ 항목 조회수 증가
   */
  @Transactional()
  async incrementViewCount(itemId: string): Promise<void> {
    try {
      await this.faqDao.incrementViewCount(itemId);
    } catch (error) {
      logger.error("[FaqService] incrementViewCount 에러:", error);
      throw error;
    }
  }
}
