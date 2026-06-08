/**
 * 키워드 관련 인터페이스
 */

/**
 * 키워드 타입
 */
export enum KeywordType {
  FAVORITE = 'favorite',      // 즐겨찾기 키워드
  FREQUENT = 'frequent',       // 자주 사용하는 키워드
  RECOMMENDED = 'recommended', // 추천 키워드
  CUSTOM = 'custom'           // 사용자 정의 키워드
}

/**
 * 키워드 카테고리
 */
export enum KeywordCategory {
  FINANCE = 'finance',           // 금융
  AML = 'aml',                   // 자금세탁방지
  COMPLIANCE = 'compliance',     // 컴플라이언스
  RISK = 'risk',                 // 리스크
  CUSTOMER = 'customer',         // 고객
  TRANSACTION = 'transaction',   // 거래
  REPORTING = 'reporting',       // 보고
  GENERAL = 'general'            // 일반
}

/**
 * 키워드 기본 인터페이스
 */
export interface Keyword {
  id: string;                    // 키워드 ID (UUID)
  text: string;                  // 키워드 텍스트
  type: KeywordType;             // 키워드 타입
  category?: KeywordCategory;    // 키워드 카테고리 (선택)
  userId?: string;               // 사용자 ID (사용자 정의 키워드인 경우)
  knowledgeBaseId?: string;      // 연관된 지식베이스 ID (선택)
  isFavorite: boolean;           // 즐겨찾기 여부
  usageCount: number;            // 사용 횟수
  createdAt: string;             // 생성 시간 (ISO 8601)
  updatedAt: string;             // 수정 시간 (ISO 8601)
  lastUsedAt?: string;           // 마지막 사용 시간 (ISO 8601, 선택)
}

/**
 * 키워드 생성 요청
 */
export interface CreateKeywordRequest {
  text: string;                  // 키워드 텍스트
  type?: KeywordType;            // 키워드 타입 (기본값: CUSTOM)
  category?: KeywordCategory;    // 키워드 카테고리
  knowledgeBaseId?: string;      // 연관된 지식베이스 ID
  isFavorite?: boolean;          // 즐겨찾기 여부 (기본값: false)
}

/**
 * 키워드 수정 요청
 */
export interface UpdateKeywordRequest {
  text?: string;                 // 키워드 텍스트
  category?: KeywordCategory;    // 키워드 카테고리
  isFavorite?: boolean;          // 즐겨찾기 여부
}

/**
 * 키워드 목록 조회 요청
 */
export interface GetKeywordsRequest {
  userId?: string;               // 사용자 ID
  type?: KeywordType;            // 키워드 타입 필터
  category?: KeywordCategory;    // 키워드 카테고리 필터
  knowledgeBaseId?: string;      // 지식베이스 ID 필터
  isFavorite?: boolean;          // 즐겨찾기 필터
  searchText?: string;           // 검색어
  limit?: number;                // 조회 개수 제한
  offset?: number;               // 조회 시작 위치
}

/**
 * 키워드 목록 응답
 */
export interface GetKeywordsResponse {
  keywords: Keyword[];           // 키워드 목록
  total: number;                 // 전체 키워드 수
  limit: number;                 // 조회 개수 제한
  offset: number;                // 조회 시작 위치
}

/**
 * 키워드 사용 기록 요청
 */
export interface UseKeywordRequest {
  keywordId: string;             // 키워드 ID
  userId: string;                // 사용자 ID
}

/**
 * 키워드 통계 정보
 */
export interface KeywordStatistics {
  knowledgeBaseName?: string;    // 지식베이스 이름
  selectedCount: number;         // 선택된 키워드 수
  favoriteCount: number;         // 즐겨찾기 키워드 수
  customCount: number;           // 사용자 정의 키워드 수
  totalCount: number;            // 전체 키워드 수
}

/**
 * 키워드 삭제 요청
 */
export interface DeleteKeywordRequest {
  keywordId: string;             // 키워드 ID
  userId: string;                // 사용자 ID
}
