/**
 * 백엔드 AUTH_CODE → 프론트엔드 UserType 매핑
 * AUTH_CODE '1' = free, '2' = pro, '3' = admin
 */
export type UserType = "free" | "pro" | "admin";

/**
 * 사용자 정보 인터페이스
 * orkis-front의 User 타입을 자체 정의 (외부 @interface 패키지 의존 제거)
 * 백엔드 대문자 필드와 프론트엔드 소문자 필드 모두 지원
 */
export interface User {
  // 기본 필드 (소문자)
  id: string;
  email: string;
  name: string;

  // 권한 (AUTH_CODE 기반 매핑)
  userType?: UserType;

  // 백엔드 호환용 (대문자)
  ID?: string;
  EMAIL?: string;
  NAME?: string;
  PHONE?: string;
  AUTH_CODE?: string;
  USER_TYPE?: string;
  LOGIN_TYPE?: string;
  EMAIL_VERIFIED?: boolean | string | number;

  // authService 호환용 (USER_ 접두사)
  USER_ID?: string;
  USER_NAME?: string;
  USER_EMAIL?: string;

  // 프로필
  provider?: string;
  profileImage?: string | null;
  PROFILE_IMAGE?: string | null;
  backgroundImage?: string | null;
  BACKGROUND_IMAGE?: string | null;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;

  // 확장 필드
  [key: string]: unknown;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  loginInfo: {
    user: User;
    socialToken?: string;
  };
}

export type OAuthProviderName = "google" | "naver" | "kakao" | "github";

export type SocialProvider = "naver" | "kakao" | "google" | "apple";

// --- 회원가입 ---

export interface SignupRequest {
  username: string;
  password: string;
  name: string;
  email: string;
  phone?: string;
  userType?: string;
}

export interface SignupFieldErrors {
  username?: string;
  name?: string;
  password?: string;
  confirmPassword?: string;
  email?: string;
}

// --- OAuth ---

export interface OAuthUser {
  email: string;
  name: string;
  provider: string;
  socialId: string;
  state: string;
}

export interface OAuthRegisterRequest {
  email: string;
  name: string;
  phone?: string;
  userType?: string;
  socialId: string;
  provider: string;
  state: string;
  additionalInfo?: Record<string, unknown>;
}
