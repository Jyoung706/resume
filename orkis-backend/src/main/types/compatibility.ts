/**
 * Backend 호환성 타입 정의
 *
 * 목적:
 * - orkis-interface 마이그레이션 과정의 호환성 유지
 * - Backend 전용 확장 타입 정의
 * - Legacy 시스템과의 통합 지원
 *
 * 정리 상태:
 * -  필수 타입: USER_INFO, ChatSessionBackend, ChatMessageBackend
 * - ⚠️ 검토 필요: LOGIN_TYPE (orkis-interface로 이동 가능)
 * - ⚠️ 검토 필요: MENU_INFO (Menu 시스템 통합 후 정리)
 *
 * @since 2025-08-07 (마이그레이션 시작)
 * @updated 2025-10-23 (타입 정리 및 문서화)
 */

import { UserInfo } from "@orkis-interface/backend";

/**
 * Backend 사용자 정보 확장 타입
 *
 * orkis-interface의 UserInfo를 확장하여 Backend 전용 필드 추가
 * - PASSWORD: 비밀번호 (보안 주의)
 * - QUESTION_COUNT: 질문 횟수
 * - SOCIAL_*: OAuth 소셜 로그인 정보
 */
export interface USER_INFO extends UserInfo {
  QUESTION_COUNT: number;
  PASSWORD?: string; // 주의: 민감 정보, 로그 시 마스킹 필수
  USER_TYPE?: string; // 사용자 요금제 (free/pro/admin)
  SOCIAL_ID?: string; // 소셜 로그인 고유 ID
  SOCIAL_PROVIDER?: string | null; // 소셜 로그인 제공자 (naver, kakao, google). 일반 가입자는 null
  CREATED_AT?: string; // 계정 생성 일시
  UPDATED_AT?: string; // 정보 수정 일시
  ADDITIONAL_INFO?: any; // 기업명, 부서 등 추가 정보
}

/**
 * 로그인 타입 상수
 *
 * ⚠️ 검토 필요: orkis-interface/backend/auth.ts의 LoginType과 중복
 * 향후 orkis-interface로 통합 권장
 */
export const LOGIN_TYPE = {
  PASS_WORD_LOGIN: "password",
  NAVER_OAUTH: "naver",
  KAKAO_OAUTH: "kakao",
  GOOGLE_OAUTH: "google"
} as const;

/**
 * 사용자 권한 매핑 정보
 *
 * 사용자와 권한 코드의 매핑 관계
 */
export interface AUTH_USER_MAPPING {
  SEQ: number; // 매핑 순번
  AUTH_CODE: string; // 권한 코드
  USER_ID: string; // 사용자 ID
}

/**
 * 라이선스 정보
 *
 * 사용자의 라이선스 유효 기간 및 상태 관리
 */
export interface LICENSE_INFO {
  LICENSE_CODE: string; // 라이선스 코드
  MAPPING_SEQ: number; // 매핑 순번
  START_DATE: string; // 시작일
  END_DATE: string; // 종료일
  LICENSE_STATE: "Y" | "N"; // 활성 상태
}

/**
 * OAuth 상태 정보
 *
 * OAuth 인증 과정의 state 파라미터 관리
 * CSRF 공격 방지를 위한 임시 상태 저장
 */
export interface OAuthState {
  provider: string; // OAuth 제공자 (naver, kakao, google)
  state: string; // 랜덤 생성된 state 값
  createdAt: number; // 생성 시간 (타임스탬프)
  metadata?: any; // 추가 메타데이터
}

/**
 * ========================================
 * Chat 시스템 타입 정의
 * ========================================
 */

/**
 * 채팅 세션 Backend 타입
 *
 * orkis-interface의 ChatSession과 호환되며 Backend 전용 필드 추가
 */
export interface ChatSessionBackend {
  id: string; // 세션 고유 ID
  title: string; // 세션 제목
  userId: string; // 소유자 사용자 ID
  createdAt: string; // 생성 일시
  updatedAt: string; // 수정 일시
  messageCount: number; // 메시지 개수
  lastMessageAt?: string; // 마지막 메시지 시간
  titleModified?: boolean; // AI가 제목을 자동 생성했는지 여부
  isFavorite?: boolean; // 즐겨찾기 여부
}

/**
 * 채팅 메시지 Backend 타입
 *
 * orkis-interface의 ChatMessage와 호환되며 Backend 전용 필드 추가
 */
export interface ChatMessageBackend {
  id: string; // 메시지 고유 ID
  sessionId: string; // 세션 ID
  userId?: string; // 발신자 사용자 ID
  content: string; // 메시지 내용
  role: "user" | "assistant" | "system"; // 역할
  timestamp?: string; // Legacy 호환용 (deprecated, createdAt 사용 권장)
  createdAt: string; // 생성 일시
  updatedAt?: string; // 수정 일시
  status?: string; // 메시지 상태
  isStopped?: boolean; // 중지 여부 (미완료 메시지)
  stoppedAt?: string; // 중지 시간 (ISO 형식)
  metadata?: Record<string, any>; // 추가 메타데이터
  ragResponse?: RagResponseInfo; // RAG 응답 정보
  result?: {
    type?: string;
    sqlQuery?: string;
    columns?: string[];
    data?: Array<Record<string, any>>;
    title?: string;
    subtitle?: string;
    metadata?: {
      query?: string;
      executionTime?: number;
      affectedRows?: number;
      questionType?: "general" | "sql";
      processes?: any;
    };
  }; // SQL 쿼리 결과 (프론트엔드 호환)
}

/**
 * RAG(검색 증강 생성) 응답 정보
 *
 * AI 서버로부터 받은 응답 상세 정보
 */
export interface RagResponseInfo {
  chat_id?: string; // AI 서버의 채팅 ID
  answer?: string; // AI 생성 답변
  rawResponse?: any; // 원본 응답 (디버깅용)
  usage?: {
    // 토큰 사용량
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * ========================================
 * Menu 시스템 타입 정의
 * ========================================
 */

/**
 * 메뉴 정보 타입
 *
 * ⚠️ 검토 필요: Menu v1/v2 통합 후 정리 필요
 */
export interface MENU_INFO {
  MENU_ID: string; // 메뉴 고유 ID
  MENU_NAME: string; // 메뉴 이름
  MENU_PATH: string; // 메뉴 경로 (URL)
  MENU_ICON?: string; // 아이콘 (Material-UI 등)
  MENU_ORDER?: number; // 정렬 순서
  PARENT_MENU_ID?: string; // 부모 메뉴 ID (계층 구조)
  IS_USE: "Y" | "N"; // 사용 여부
  IS_COLLAPSE?: boolean; // 접힌 상태 여부
  CHILDREN?: MENU_INFO[]; // 하위 메뉴 목록
}

/**
 * Backend 네임스페이스 타입
 *
 * 향후 제거 가능 (현재 사용되지 않음)
 */
export interface Backend {
  ChatSession: ChatSessionBackend;
  ChatMessage: ChatMessageBackend;
  ProcessInfo: any;
}
