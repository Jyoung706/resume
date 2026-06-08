import type {
  CreateNoticeDto,
  Notice,
  NoticeListParams,
  NoticeListResponse,
  UpdateNoticeDto
} from "@orkis-interface/backend/notice";
import { Autowired, Service, Transactional } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { NoticeDao } from "@/notice/NoticeDao";

@Service("NoticeService")
export class NoticeService {
  @Autowired("NoticeDao")
  private noticeDao!: NoticeDao;

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/notice/NoticeController.ts - getNoticeList() 메서드 (라인 61)
  /**
   * 공지사항 목록 조회 (페이지네이션, 읽음 상태 포함)
   */
  @Transactional()
  async getNoticeList(
    userId: string,
    params: NoticeListParams = {}
  ): Promise<NoticeListResponse> {
    try {
      const page = params.page || 1;
      const limit = params.limit || 50;

      const { notices, total } = await this.noticeDao.getNotices(
        userId,
        params
      );

      const totalPages = Math.ceil(total / limit);

      return {
        notices,
        pagination: {
          total,
          page,
          limit,
          totalPages
        }
      };
    } catch (error) {
      logger.error("[NoticeService] getNoticeList 오류", error);
      throw new Error("공지사항 목록 조회에 실패했습니다.");
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/notice/NoticeController.ts - getNoticeById() (라인 119), 같은 클래스 내부 - markNoticeAsRead() 메서드에서 호출
  /**
   * 공지사항 단건 조회
   */
  @Transactional()
  async getNoticeById(noticeId: string): Promise<Notice> {
    try {
      const notice = await this.noticeDao.getNoticeById(noticeId);

      if (!notice) {
        throw new Error("공지사항을 찾을 수 없습니다.");
      }

      return notice;
    } catch (error) {
      logger.error("[NoticeService] getNoticeById 오류", error);
      throw error;
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/notice/NoticeController.ts - createNotice() 메서드 (라인 175)
  /**
   * 공지사항 생성
   */
  @Transactional()
  async createNotice(dto: CreateNoticeDto): Promise<Notice> {
    try {
      // 입력 검증
      if (!dto.title || dto.title.trim() === "") {
        throw new Error("제목은 필수 항목입니다.");
      }

      if (!dto.content || dto.content.trim() === "") {
        throw new Error("내용은 필수 항목입니다.");
      }

      if (!dto.author_id || !dto.author_name) {
        throw new Error("작성자 정보는 필수 항목입니다.");
      }

      const notice = await this.noticeDao.createNotice(dto);      return notice;
    } catch (error) {
      logger.error("[NoticeService] createNotice 오류", error);
      throw error;
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/notice/NoticeController.ts - updateNotice() 메서드 (라인 244)
  /**
   * 공지사항 수정
   */
  @Transactional()
  async updateNotice(noticeId: string, dto: UpdateNoticeDto): Promise<Notice> {
    try {
      // 입력 검증
      if (dto.title !== undefined && dto.title.trim() === "") {
        throw new Error("제목은 빈 값일 수 없습니다.");
      }

      if (dto.content !== undefined && dto.content.trim() === "") {
        throw new Error("내용은 빈 값일 수 없습니다.");
      }

      const notice = await this.noticeDao.updateNotice(noticeId, dto);

      if (!notice) {
        throw new Error("공지사항을 찾을 수 없습니다.");
      }      return notice;
    } catch (error) {
      logger.error("[NoticeService] updateNotice 오류", error);
      throw error;
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/notice/NoticeController.ts - deleteNotice() 메서드 (라인 302)
  /**
   * 공지사항 삭제 (소프트 삭제)
   */
  @Transactional()
  async deleteNotice(noticeId: string): Promise<void> {
    try {
      const success = await this.noticeDao.deleteNotice(noticeId);

      if (!success) {
        throw new Error("공지사항을 찾을 수 없습니다.");
      }    } catch (error) {
      logger.error("[NoticeService] deleteNotice 오류", error);
      throw error;
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/notice/NoticeController.ts - markNoticeAsRead() 메서드 (라인 360)
  /**
   * 공지사항 읽음 처리
   */
  @Transactional()
  async markNoticeAsRead(userId: string, noticeId: string): Promise<void> {
    try {
      // 공지사항 존재 여부 확인
      const notice = await this.noticeDao.getNoticeById(noticeId);
      if (!notice) {
        throw new Error("공지사항을 찾을 수 없습니다.");
      }

      await this.noticeDao.markNoticeAsRead(userId, noticeId);    } catch (error) {
      logger.error("[NoticeService] markNoticeAsRead 오류", error);
      throw error;
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/notice/NoticeController.ts - getUnreadCount() 메서드 (라인 405)
  /**
   * 읽지 않은 공지사항 개수 조회
   */
  @Transactional()
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const count = await this.noticeDao.getUnreadCount(userId);
      return count;
    } catch (error) {
      logger.error("[NoticeService] getUnreadCount 오류", error);
      throw new Error("읽지 않은 공지사항 개수 조회에 실패했습니다.");
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/notice/NoticeController.ts - markAllAsRead() 메서드 (라인 452)
  /**
   * 모든 공지사항 읽음 처리
   */
  @Transactional()
  async markAllAsRead(userId: string): Promise<void> {
    try {
      await this.noticeDao.markAllAsRead(userId);    } catch (error) {
      logger.error("[NoticeService] markAllAsRead 오류", error);
      throw new Error("모든 공지사항 읽음 처리에 실패했습니다.");
    }
  }
}
