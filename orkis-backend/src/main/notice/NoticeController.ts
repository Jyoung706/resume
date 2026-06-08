import {
  Autowired,
  Controller,
  Body,
  RequestMapping,
  Param,
  Session,
  REQUEST_METHOD
} from "@orkis/core/common";
import type {
  CreateNoticeDto,
  Notice,
  NoticeListParams,
  NoticeListResponse,
  UpdateNoticeDto
} from "@orkis-interface/backend/notice";
import { NoticeService } from "./NoticeService";

@Controller({ path: "/notices" })
export class NoticeController {
  @Autowired("NoticeService")
  private noticeService!: NoticeService;

  /**
   * 공지사항 목록 조회
   * GET /notices
   */
  @RequestMapping({
    route: "/",
    method: REQUEST_METHOD.GET
  })
  async getNotices(
    @Session() session: any,
    @Param("page") page?: string,
    @Param("limit") limit?: string,
    @Param("type") type?: string,
    @Param("is_active") isActive?: string
  ): Promise<NoticeListResponse> {
    const userId = session?.login_info?.ID;

    if (!userId) {
      throw new Error("인증이 필요합니다.");
    }

    const params: NoticeListParams = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      type: type as any,
      is_active: isActive !== undefined ? isActive === "true" : true
    };

    const result = await this.noticeService.getNoticeList(userId, params);

    // ResponseHandler가 자동으로 StandardResponse로 래핑
    return result;
  }

  /**
   * 공지사항 단건 조회
   * GET /notices/:id
   */
  @RequestMapping({
    route: "/:id",
    method: REQUEST_METHOD.GET
  })
  async getNoticeById(
    @Session() session: any,
    @Param("id") noticeId?: string
  ): Promise<Notice> {
    const userId = session?.login_info?.ID;

    if (!userId) {
      throw new Error("인증이 필요합니다.");
    }

    if (!noticeId) {
      throw new Error("공지사항 ID가 필요합니다.");
    }

    const notice = await this.noticeService.getNoticeById(noticeId);

    // ResponseHandler가 자동으로 StandardResponse로 래핑
    return notice;
  }

  /**
   * 공지사항 생성
   * POST /notices
   */
  @RequestMapping({
    route: "/",
    method: REQUEST_METHOD.POST
  })
  async createNotice(
    @Session() session: any,
    @Body() dto: CreateNoticeDto
  ): Promise<Notice> {
    const userId = session?.login_info?.ID;
    const userName = session?.login_info?.USER_NAME;

    if (!userId) {
      throw new Error("인증이 필요합니다.");
    }

    // 작성자 정보 자동 설정
    const createDto: CreateNoticeDto = {
      ...dto,
      author_id: userId,
      author_name: userName || "Unknown"
    };

    const notice = await this.noticeService.createNotice(createDto);

    // ResponseHandler가 자동으로 StandardResponse로 래핑
    return notice;
  }

  /**
   * 공지사항 수정
   * POST /notices/:id/update
   */
  @RequestMapping({
    route: "/:id/update",
    method: REQUEST_METHOD.POST
  })
  async updateNotice(
    @Session() session: any,
    @Param("id") noticeId?: string,
    @Body() dto?: UpdateNoticeDto
  ): Promise<Notice> {
    const userId = session?.login_info?.ID;

    if (!userId) {
      throw new Error("인증이 필요합니다.");
    }

    if (!noticeId) {
      throw new Error("공지사항 ID가 필요합니다.");
    }

    if (!dto) {
      throw new Error("수정할 내용이 필요합니다.");
    }

    const notice = await this.noticeService.updateNotice(noticeId, dto);

    // ResponseHandler가 자동으로 StandardResponse로 래핑
    return notice;
  }

  /**
   * 공지사항 삭제
   * POST /notices/:id/delete
   */
  @RequestMapping({
    route: "/:id/delete",
    method: REQUEST_METHOD.POST
  })
  async deleteNotice(
    @Session() session: any,
    @Param("id") noticeId?: string
  ): Promise<{ message: string }> {
    const userId = session?.login_info?.ID;

    if (!userId) {
      throw new Error("인증이 필요합니다.");
    }

    if (!noticeId) {
      throw new Error("공지사항 ID가 필요합니다.");
    }

    await this.noticeService.deleteNotice(noticeId);

    // ResponseHandler가 자동으로 StandardResponse로 래핑
    return { message: "공지사항이 삭제되었습니다." };
  }

  /**
   * 공지사항 읽음 처리
   * POST /notices/:id/read
   */
  @RequestMapping({
    route: "/:id/read",
    method: REQUEST_METHOD.POST
  })
  async markAsRead(
    @Session() session: any,
    @Param("id") noticeId?: string
  ): Promise<{ message: string }> {
    const userId = session?.login_info?.ID;

    if (!userId) {
      throw new Error("인증이 필요합니다.");
    }

    if (!noticeId) {
      throw new Error("공지사항 ID가 필요합니다.");
    }

    await this.noticeService.markNoticeAsRead(userId, noticeId);

    // ResponseHandler가 자동으로 StandardResponse로 래핑
    return { message: "읽음 처리되었습니다." };
  }

  /**
   * 읽지 않은 공지사항 개수 조회
   * POST /notices/unread/count
   */
  @RequestMapping({
    route: "/unread/count",
    method: REQUEST_METHOD.POST
  })
  async getUnreadCount(
    @Session() session: any
  ): Promise<{ unread_count: number }> {
    const userId = session?.login_info?.ID;

    if (!userId) {
      throw new Error("인증이 필요합니다.");
    }

    const count = await this.noticeService.getUnreadCount(userId);

    // ResponseHandler가 자동으로 StandardResponse로 래핑
    return { unread_count: count };
  }

  /**
   * 모든 공지사항 읽음 처리
   * POST /notices/read/all
   */
  @RequestMapping({
    route: "/read/all",
    method: REQUEST_METHOD.POST
  })
  async markAllAsRead(@Session() session: any): Promise<{ message: string }> {
    const userId = session?.login_info?.ID;

    if (!userId) {
      throw new Error("인증이 필요합니다.");
    }

    await this.noticeService.markAllAsRead(userId);

    // ResponseHandler가 자동으로 StandardResponse로 래핑
    return { message: "모든 공지사항이 읽음 처리되었습니다." };
  }
}
