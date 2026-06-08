/**
 * 도움말 카테고리 인터페이스
 */
export interface HelpCategory {
  id: string;
  name: string;
  displayName: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 도움말 항목 인터페이스
 */
export interface HelpItem {
  id: string;
  categoryId: string;
  categoryName?: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 도움말 목록 조회 요청 파라미터
 */
export interface GetHelpListRequest {
  categoryId?: string;
  search?: string;
  isActive?: boolean;
}

/**
 * 도움말 목록 조회 응답
 */
export interface GetHelpListResponse {
  categories: HelpCategory[];
  items: HelpItem[];
}

/**
 * API 응답 래퍼
 */
export interface HelpApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}
