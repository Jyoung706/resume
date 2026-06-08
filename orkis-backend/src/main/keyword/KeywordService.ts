import { Autowired, Service, Transactional } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import type {
  CreateKeywordRequest,
  GetKeywordsRequest,
  GetKeywordsResponse,
  Keyword,
  KeywordStatistics,
  UpdateKeywordRequest
} from "@orkis-interface/backend/keyword";
import { KeywordDao } from "@/keyword/KeywordDao";

@Service("KeywordService")
export class KeywordService {
  @Autowired("KeywordDao")
  private keywordDao!: KeywordDao;

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/keyword/KeywordController.ts - createKeyword() 메서드 (라인 46)
  /**
   * 키워드 생성
   */
  @Transactional()
  async createKeyword(
    userId: string,
    request: CreateKeywordRequest
  ): Promise<Keyword> {
    try {      // 텍스트 유효성 검사
      if (!request.text || request.text.trim().length === 0) {
        throw new Error("키워드 텍스트는 필수입니다");
      }

      if (request.text.length > 100) {
        throw new Error("키워드 텍스트는 100자 이하여야 합니다");
      }

      const keyword = await this.keywordDao.createKeyword(userId, request);      return keyword;
    } catch (error) {
      logger.error("[KeywordService] 키워드 생성 오류:", error);
      // 중복 키워드 에러 처리
      if (
        error instanceof Error &&
        error.message.includes("duplicate key value")
      ) {
        throw new Error("이미 등록된 키워드입니다");
      }

      throw new Error("키워드 생성에 실패했습니다");
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/keyword/KeywordController.ts - getKeywords() 메서드 (라인 81), 같은 클래스 내부 - getKeywordStatistics() 메서드에서 호출
  /**
   * 키워드 목록 조회
   */
  @Transactional()
  async getKeywords(request: GetKeywordsRequest): Promise<GetKeywordsResponse> {
    try {      const { keywords, total } = await this.keywordDao.getKeywords(request);

      return {
        keywords,
        total,
        limit: request.limit || 50,
        offset: request.offset || 0
      };
    } catch (error) {
      logger.error("[KeywordService] 키워드 목록 조회 오류:", error);
      throw new Error("키워드 목록 조회에 실패했습니다");
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/keyword/KeywordController.ts - getKeywordById() 메서드 (라인 110), 같은 클래스 내부 - useKeyword() 메서드에서 호출
  /**
   * 키워드 ID로 조회
   */
  @Transactional()
  async getKeywordById(id: string): Promise<Keyword> {
    try {
      const keyword = await this.keywordDao.getKeywordById(id);

      if (!keyword) {
        throw new Error("키워드를 찾을 수 없습니다");
      }

      return keyword;
    } catch (error) {
      logger.error("[KeywordService] 키워드 조회 오류:", error);
      throw error;
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/keyword/KeywordController.ts - updateKeyword() 메서드 (라인 149)
  /**
   * 키워드 수정
   */
  @Transactional()
  async updateKeyword(
    id: string,
    userId: string,
    request: UpdateKeywordRequest
  ): Promise<Keyword> {
    try {      // 텍스트 유효성 검사
      if (request.text !== undefined) {
        if (!request.text || request.text.trim().length === 0) {
          throw new Error("키워드 텍스트는 비어있을 수 없습니다");
        }

        if (request.text.length > 100) {
          throw new Error("키워드 텍스트는 100자 이하여야 합니다");
        }
      }

      const keyword = await this.keywordDao.updateKeyword(id, userId, request);

      if (!keyword) {
        throw new Error("키워드를 찾을 수 없거나 수정 권한이 없습니다");
      }      return keyword;
    } catch (error) {
      logger.error("[KeywordService] 키워드 수정 오류:", error);
      throw error;
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/keyword/KeywordController.ts - deleteKeyword() 메서드 (라인 182)
  /**
   * 키워드 삭제
   */
  @Transactional()
  async deleteKeyword(id: string, userId: string): Promise<void> {
    try {      const success = await this.keywordDao.deleteKeyword(id, userId);

      if (!success) {
        throw new Error("키워드를 찾을 수 없거나 삭제 권한이 없습니다");
      }    } catch (error) {
      logger.error("[KeywordService] 키워드 삭제 오류:", error);
      throw error;
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/keyword/KeywordController.ts - useKeyword() 메서드 (라인 214)
  /**
   * 키워드 사용 기록
   */
  @Transactional()
  async useKeyword(id: string, userId: string): Promise<void> {
    try {      // 키워드 존재 여부 확인
      const keyword = await this.keywordDao.getKeywordById(id);
      if (!keyword) {
        throw new Error("키워드를 찾을 수 없습니다");
      }

      // 사용 횟수 증가
      await this.keywordDao.incrementUsageCount(id);    } catch (error) {
      logger.error("[KeywordService] 키워드 사용 기록 오류:", error);
      throw error;
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/keyword/KeywordController.ts - getKeywordStatistics() 메서드 (라인 245)
  /**
   * 키워드 통계 조회
   */
  @Transactional()
  async getKeywordStatistics(userId: string): Promise<KeywordStatistics> {
    try {      const { keywords, total } =
        await this.keywordDao.getKeywordsWithFavorites(userId);

      const favoriteCount = keywords.filter((k) => k.isFavorite).length;
      const customCount = keywords.filter((k) => k.type === "custom").length;

      return {
        selectedCount: keywords.length,
        favoriteCount,
        customCount,
        totalCount: total
      };
    } catch (error) {
      logger.error("[KeywordService] 키워드 통계 조회 오류:", error);
      throw new Error("키워드 통계 조회에 실패했습니다");
    }
  }

  /**
   * 즐겨찾기 토글
   */
  @Transactional()
  async toggleFavorite(userId: string, keywordId: string): Promise<boolean> {
    try {      // 키워드 존재 여부 확인
      const keyword = await this.keywordDao.getKeywordById(keywordId);
      if (!keyword) {
        throw new Error("키워드를 찾을 수 없습니다");
      }

      const isFavorite = await this.keywordDao.toggleFavorite(
        userId,
        keywordId
      );      return isFavorite;
    } catch (error) {
      logger.error("[KeywordService] 즐겨찾기 토글 오류:", error);
      throw error;
    }
  }

  /**
   * 즐겨찾기 상태 조회
   */
  @Transactional()
  async isFavorite(userId: string, keywordId: string): Promise<boolean> {
    try {
      return await this.keywordDao.isFavorite(userId, keywordId);
    } catch (error) {
      logger.error("[KeywordService] 즐겨찾기 상태 조회 오류:", error);
      throw error;
    }
  }

  /**
   * 사용자별 키워드 목록 조회 (즐겨찾기 포함)
   */
  @Transactional()
  async getKeywordsWithFavorites(
    userId: string,
    request?: Partial<GetKeywordsRequest>
  ): Promise<GetKeywordsResponse> {
    try {      const { keywords, total } =
        await this.keywordDao.getKeywordsWithFavorites(userId, request);

      return {
        keywords,
        total,
        limit: request?.limit || 50,
        offset: request?.offset || 0
      };
    } catch (error) {
      logger.error("[KeywordService] 사용자별 키워드 목록 조회 오류:", error);
      throw new Error("사용자별 키워드 목록 조회에 실패했습니다");
    }
  }
}
