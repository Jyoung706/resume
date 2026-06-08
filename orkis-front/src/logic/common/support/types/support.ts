/**
 * Support Types -- 고객지원(문의) 관련 타입 정의
 */

// --- API 타입 (orkis-interface/backend/support.ts 기반) ---

/** 문의 티켓 */
export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  title: string;
  categoryCode: string;
  categoryName?: string;
  description: string;
  statusCode: string;
  statusName?: string;
  priorityCode: string;
  priorityName?: string;
  createdAt: string;
  updatedAt: string;
  hasAnswer: boolean;
  answer?: string;
  answeredBy?: string;
  answeredByName?: string;
  answeredAt?: string;
}

/** 공통코드 */
export interface SupportCommonCode {
  groupId: string;
  codeId: string;
  codeName: string;
  codeNameEn?: string;
  displayOrder: number;
  attr1?: string;
  useYn: string;
}

/** 문의 생성 요청 */
export interface CreateTicketRequest {
  title: string;
  categoryCode: string;
  description: string;
  priorityCode?: string;
}

/** 문의 목록 조회 파라미터 */
export interface GetTicketsParams {
  statusCode?: string | "all";
  categoryCode?: string;
  page?: number;
  limit?: number;
  sortBy?: "created_at" | "updated_at" | "status_code";
  sortOrder?: "asc" | "desc";
}

/** 문의 목록 응답 */
export interface GetTicketsResponse {
  tickets: SupportTicket[];
  pagination: SupportPagination;
}

/** 페이지네이션 */
export interface SupportPagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasMore: boolean;
}

// --- Design Layer 매핑 타입 ---

/** Design Layer용 티켓 데이터 (props 전달용) */
export interface SupportTicketData {
  id: string;
  title: string;
  categoryName: string;
  statusName: string;
  statusCode: string;
  createdAt: string;
  hasAnswer: boolean;
  description: string;
  answer?: string;
  answeredAt?: string;
}
