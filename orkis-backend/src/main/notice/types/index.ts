/**
 * 공지사항 타입 정의
 */

export type NoticeType = 'notice' | 'update' | 'event' | 'maintenance';

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

export interface UserNotificationRead {
  read_id: string;
  user_id: string;
  notice_id: string;
  read_at: string;
}

export interface NoticeWithReadStatus extends Notice {
  is_read: boolean;
}

export interface CreateNoticeDto {
  title: string;
  content: string;
  type?: NoticeType;
  author_id: string;
  author_name: string;
  display_order?: number;
}

export interface UpdateNoticeDto {
  title?: string;
  content?: string;
  type?: NoticeType;
  is_active?: boolean;
  display_order?: number;
}

export interface NoticeListParams {
  page?: number;
  limit?: number;
  type?: NoticeType;
  is_active?: boolean;
}

export interface NoticeListResponse {
  notices: NoticeWithReadStatus[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
