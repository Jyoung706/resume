/**
 * 공지사항 타입
 */
export type NoticeType = 'notice' | 'update' | 'event' | 'maintenance';

/**
 * 공지사항 인터페이스
 */
export interface Notice {
  notice_id: string;
  title: string;
  content: string;
  type: NoticeType;
  author_id: string;
  author_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  display_order: number;
}

/**
 * 공지사항 + 읽음 상태
 */
export interface NoticeWithReadStatus extends Notice {
  is_read: boolean;
}

/**
 * 공지사항 생성 DTO
 */
export interface CreateNoticeDto {
  title: string;
  content: string;
  type?: NoticeType;
  author_id?: string;
  author_name?: string;
  is_active?: boolean;
  display_order?: number;
}

/**
 * 공지사항 수정 DTO
 */
export interface UpdateNoticeDto {
  title?: string;
  content?: string;
  type?: NoticeType;
  is_active?: boolean;
  display_order?: number;
}

/**
 * 공지사항 목록 조회 파라미터
 */
export interface NoticeListParams {
  page?: number;
  limit?: number;
  type?: NoticeType;
  is_active?: boolean;
}

/**
 * 공지사항 목록 조회 응답
 */
export interface NoticeListResponse {
  notices: NoticeWithReadStatus[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * API 응답 래퍼
 */
export interface NoticeApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
