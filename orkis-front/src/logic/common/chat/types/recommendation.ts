/** 추천 질문/키워드 관련 타입 */

/** 추천 질문 (백엔드 응답 매핑) */
export interface RecommendedQuestion {
  id: string;
  questionNo: string;
  question: string;
  category: string;
  questionType: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** 키워드 타입 */
export type KeywordType = "favorite" | "frequent" | "recommended" | "custom";

/** 키워드 (백엔드 응답 매핑) */
export interface Keyword {
  id: string;
  text: string;
  type: KeywordType;
  category?: string;
  userId?: string;
  isFavorite: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}

/** 선택된 키워드 (스토어용) */
export interface SelectedKeyword {
  id: string;
  name: string;
}

/** 키워드 생성 요청 */
export interface CreateKeywordRequest {
  text: string;
  type: KeywordType;
  category?: string;
  knowledgeBaseId?: string;
  isFavorite?: boolean;
}
