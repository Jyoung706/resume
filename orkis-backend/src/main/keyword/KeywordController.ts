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
  CreateKeywordRequest,
  GetKeywordsRequest,
  GetKeywordsResponse,
  Keyword,
  KeywordStatistics,
  UpdateKeywordRequest
} from "@orkis-interface/backend/keyword";
import { KeywordService } from "./KeywordService";

@Controller({ path: "/keywords" })
export class KeywordController {
  @Autowired("KeywordService")
  private keywordService!: KeywordService;

  /**
   * 키워드 생성
   * POST /keywords
   */
  @RequestMapping({ route: "", method: REQUEST_METHOD.POST })
  async createKeyword(
    @Body() request: CreateKeywordRequest,
    @Session() session: any
  ): Promise<Keyword> {
    try {
      const userId = session?.login_info?.ID;

      if (!userId) {
        throw new Error("인증되지 않은 사용자입니다");
      }      const keyword = await this.keywordService.createKeyword(userId, request);

      return keyword;
    } catch (error) {
      logger.error("[KeywordController] 키워드 생성 오류:", error);
      throw error;
    }
  }

  /**
   * 키워드 목록 조회
   * POST /keywords/list
   */
  @RequestMapping({ route: "/list", method: REQUEST_METHOD.POST })
  async getKeywords(
    @Body() request: GetKeywordsRequest,
    @Session() session: any
  ): Promise<GetKeywordsResponse> {
    try {
      const userId = session?.login_info?.ID;

      if (!userId) {
        throw new Error("인증되지 않은 사용자입니다");
      }      // getKeywordsWithFavorites 사용 (사용자별 즐겨찾기 포함)
      const response = await this.keywordService.getKeywordsWithFavorites(
        userId,
        request
      );

      return response;
    } catch (error) {
      logger.error("[KeywordController] 키워드 목록 조회 오류:", error);
      throw error;
    }
  }

  /**
   * 키워드 ID로 조회
   * GET /keywords/:id
   */
  @RequestMapping({ route: "/:id", method: REQUEST_METHOD.GET })
  async getKeywordById(
    @Param("id") id: string,
    @Session() session: any
  ): Promise<Keyword> {
    try {
      const userId = session?.login_info?.ID;

      if (!userId) {
        throw new Error("인증되지 않은 사용자입니다");
      }      const keyword = await this.keywordService.getKeywordById(id);

      // 권한 확인 (본인 키워드 또는 시스템 키워드만 조회 가능)
      if (keyword.userId && keyword.userId !== userId) {
        throw new Error("해당 키워드를 조회할 권한이 없습니다");
      }

      return keyword;
    } catch (error) {
      logger.error("[KeywordController] 키워드 조회 오류:", error);
      throw error;
    }
  }

  /**
   * 키워드 수정
   * POST /keywords/:id/update
   */
  @RequestMapping({ route: "/:id/update", method: REQUEST_METHOD.POST })
  async updateKeyword(
    @Param("id") id: string,
    @Body() request: UpdateKeywordRequest,
    @Session() session: any
  ): Promise<Keyword> {
    try {
      const userId = session?.login_info?.ID;

      if (!userId) {
        throw new Error("인증되지 않은 사용자입니다");
      }      const keyword = await this.keywordService.updateKeyword(
        id,
        userId,
        request
      );

      return keyword;
    } catch (error) {
      logger.error("[KeywordController] 키워드 수정 오류:", error);
      throw error;
    }
  }

  /**
   * 키워드 삭제
   * POST /keywords/:id/delete
   */
  @RequestMapping({ route: "/:id/delete", method: REQUEST_METHOD.POST })
  async deleteKeyword(
    @Param("id") id: string,
    @Session() session: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      const userId = session?.login_info?.ID;

      if (!userId) {
        throw new Error("인증되지 않은 사용자입니다");
      }      await this.keywordService.deleteKeyword(id, userId);

      return {
        success: true,
        message: "키워드가 성공적으로 삭제되었습니다"
      };
    } catch (error) {
      logger.error("[KeywordController] 키워드 삭제 오류:", error);
      throw error;
    }
  }

  /**
   * 키워드 사용 기록
   * POST /keywords/:id/use
   */
  @RequestMapping({ route: "/:id/use", method: REQUEST_METHOD.POST })
  async useKeyword(
    @Param("id") id: string,
    @Session() session: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      const userId = session?.login_info?.ID;

      if (!userId) {
        throw new Error("인증되지 않은 사용자입니다");
      }      await this.keywordService.useKeyword(id, userId);

      return {
        success: true,
        message: "키워드 사용이 기록되었습니다"
      };
    } catch (error) {
      logger.error("[KeywordController] 키워드 사용 기록 오류:", error);
      throw error;
    }
  }

  /**
   * 키워드 통계 조회
   * GET /keywords/statistics
   */
  @RequestMapping({ route: "/statistics", method: REQUEST_METHOD.GET })
  async getKeywordStatistics(
    @Session() session: any
  ): Promise<KeywordStatistics> {
    try {
      const userId = session?.login_info?.ID;

      if (!userId) {
        throw new Error("인증되지 않은 사용자입니다");
      }      const statistics = await this.keywordService.getKeywordStatistics(userId);

      return statistics;
    } catch (error) {
      logger.error("[KeywordController] 키워드 통계 조회 오류:", error);
      throw error;
    }
  }

  /**
   * 즐겨찾기 토글
   * POST /keywords/:id/favorite/toggle
   */
  @RequestMapping({
    route: "/:id/favorite/toggle",
    method: REQUEST_METHOD.POST
  })
  async toggleFavorite(
    @Param("id") keywordId: string,
    @Session() session: any
  ): Promise<{ success: boolean; isFavorite: boolean }> {
    try {
      const userId = session?.login_info?.ID;

      if (!userId) {
        throw new Error("인증되지 않은 사용자입니다");
      }      const isFavorite = await this.keywordService.toggleFavorite(
        userId,
        keywordId
      );

      const response = { success: true, isFavorite };
      return response;
    } catch (error) {
      logger.error("[KeywordController] 즐겨찾기 토글 오류:", error);
      throw error;
    }
  }

  /**
   * 사용자별 키워드 목록 조회 (즐겨찾기 포함)
   * POST /keywords/list/favorites
   */
  @RequestMapping({ route: "/list/favorites", method: REQUEST_METHOD.POST })
  async getKeywordsWithFavorites(
    @Body() request: Partial<GetKeywordsRequest>,
    @Session() session: any
  ): Promise<GetKeywordsResponse> {
    try {
      const userId = session?.login_info?.ID;

      if (!userId) {
        throw new Error("인증되지 않은 사용자입니다");
      }      const response = await this.keywordService.getKeywordsWithFavorites(
        userId,
        request
      );

      return response;
    } catch (error) {
      logger.error(
        "[KeywordController] 사용자별 키워드 목록 조회 오류:",
        error
      );
      throw error;
    }
  }
}
