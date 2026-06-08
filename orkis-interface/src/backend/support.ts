// 문의 티켓 인터페이스 (DB 매핑)
export interface SupportTicket {
  id: string;                    // UUID
  userId: string;                // user_id
  userName: string;              // user_name
  userEmail: string;             // user_email
  title: string;                 // title
  categoryCode: string;          // category_code (공통코드)
  categoryName?: string;         // 카테고리 명 (JOIN 결과)
  description: string;           // description
  statusCode: string;            // status_code (공통코드)
  statusName?: string;           // 상태 명 (JOIN 결과)
  priorityCode: string;          // priority_code (공통코드)
  priorityName?: string;         // 우선순위 명 (JOIN 결과)
  createdAt: string;             // created_at (ISO 8601)
  updatedAt: string;             // updated_at (ISO 8601)
  hasAnswer: boolean;            // has_answer
  answer?: string;               // answer
  answeredBy?: string;           // answered_by
  answeredByName?: string;       // answered_by_name
  answeredAt?: string;           // answered_at (ISO 8601)
  attachments?: string[];        // attachments (JSONB)
  tags?: string[];               // tags (TEXT[])
  viewCount?: number;            // view_count
}

// 공통코드 인터페이스
export interface CommonCode {
  groupId: string;
  codeId: string;
  codeName: string;
  codeNameEn?: string;
  displayOrder: number;
  attr1?: string;  // 색상 등
  useYn: string;
}

// 문의 생성 요청
export interface CreateTicketRequest {
  title: string;
  categoryCode: string;
  description: string;
  priorityCode?: string;
}

// 문의 답변 요청
export interface AnswerTicketRequest {
  answer: string;
}

// 문의 목록 응답
export interface GetTicketsResponse {
  tickets: SupportTicket[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasMore: boolean;
  };
}

// 문의 목록 조회 파라미터
export interface GetTicketsParams {
  statusCode?: string | "all";
  categoryCode?: string;
  page?: number;
  limit?: number;
  sortBy?: "created_at" | "updated_at" | "status_code";
  sortOrder?: "asc" | "desc";
}

// 통계 정보
export interface SupportStats {
  pendingCount: number;
  inProgressCount: number;
  completedCount: number;
  cancelledCount: number;
  totalCount: number;
  weekCount: number;
  monthCount: number;
}

// API 응답 타입
export interface SupportApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
