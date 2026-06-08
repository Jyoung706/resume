/**
 * FAQ 항목 인터페이스
 */
export interface FaqItem {
  id: string;
  categoryCode: string;
  categoryName?: string;
  question: string;
  answer: string;
  isPinned: boolean;
  sortOrder: number;
  isActive: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * FAQ 카테고리 인터페이스 (공통코드 TICKET_CATEGORY 기반)
 */
export interface FaqCategory {
  code: string;
  name: string;
  sortOrder: number;
}

/**
 * FAQ 목록 조회 요청 파라미터
 */
export interface GetFaqListRequest {
  categoryCode?: string;
  search?: string;
  isActive?: boolean;
}

/**
 * FAQ 목록 조회 응답
 */
export interface GetFaqListResponse {
  categories: FaqCategory[];
  items: FaqItem[];
}

/**
 * FAQ API 응답 래퍼
 */
export interface FaqApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}
