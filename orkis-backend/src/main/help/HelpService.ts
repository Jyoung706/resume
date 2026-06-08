import { Autowired, Service, Transactional } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import type {
  GetHelpListRequest,
  GetHelpListResponse
} from "@orkis-interface/backend/help";
import { HelpDao } from "@/help/HelpDao";

@Service("HelpService")
export class HelpService {
  @Autowired("HelpDao")
  private helpDao!: HelpDao;

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/help/HelpController.ts - getHelpList() 메서드 (라인 51)
  /**
   * 도움말 목록 조회 (카테고리 + 항목)
   */
  @Transactional()
  async getHelpList(params: GetHelpListRequest): Promise<GetHelpListResponse> {
    try {      // 카테고리 목록 조회
      const categories = await this.helpDao.findAllActiveCategories();

      // 도움말 항목 조회
      const items = await this.helpDao.findItemsByConditions(params);      return {
        categories,
        items
      };
    } catch (error) {
      logger.error("[HelpService] getHelpList 에러:", error);
      throw error;
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/help/HelpController.ts - incrementViewCount() 메서드 (라인 82)
  /**
   * 도움말 항목 조회수 증가
   */
  @Transactional()
  async incrementViewCount(itemId: string): Promise<void> {
    try {      await this.helpDao.incrementViewCount(itemId);
    } catch (error) {
      logger.error("[HelpService] incrementViewCount 에러:", error);
      throw error;
    }
  }
}
