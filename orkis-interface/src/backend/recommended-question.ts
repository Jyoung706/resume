/**
 * 추천 질문 관련 타입 정의
 */

/**
 * 추천 질문 응답 타입
 */
export interface RecommendedQuestion {
  id: string;
  questionNo: string;
  question: string;
  category: string;
  questionType: string;
  iconPath?: string;
  sortOrder: number;
  isActive: boolean;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 추천 질문 조회 요청 파라미터
 */
export interface GetRecommendedQuestionsRequest {
  category?: string;
  questionType?: string;
  isActive?: boolean;
  limit?: number;
}

/**
 * 추천 질문 조회 응답
 */
export interface GetRecommendedQuestionsResponse {
  questions: RecommendedQuestion[];
  total: number;
}
