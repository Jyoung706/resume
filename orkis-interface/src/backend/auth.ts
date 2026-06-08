import { ApiResponse } from '../shared/api';

/**
 * 로그인 타입
 */
export enum LoginType {
  PASSWORD = 'password',
  NAVER = 'naver',
  KAKAO = 'kakao',
  GOOGLE = 'google',
}

/**
 * 사용자 정보
 */
export interface UserInfo {
  ID: string;
  EMAIL?: string;
  NAME?: string;
  PHONE?: string;
  LOGIN_TYPE: string;
  AUTH_CODE?: string;
  EMAIL_VERIFIED?: boolean | string | number; // 이메일 인증 여부
}

/**
 * Frontend → Backend ID/PW 로그인 요청
 */
export interface PasswordLoginRequest {
  username: string;
  password: string;
}

/**
 * Frontend → Backend OAuth 로그인 시작 요청
 */
export interface OAuthStartRequest {
  type: 'naver' | 'kakao' | 'google';
}

/**
 * Backend → Frontend OAuth URL 응답
 */
export interface OAuthUrlResponse {
  url: string;
}

/**
 * Frontend → Backend OAuth 콜백 요청
 */
export interface OAuthCallbackRequest {
  code: string;
  state: string;
}

/**
 * Backend → Frontend 로그인 성공 응답
 */
export interface LoginSuccessResponse {
  token: string;
  loginInfo: UserInfo;
}

/**
 * Frontend → Backend 로그아웃 요청
 */
export interface LogoutRequest {
  token: string;
}

/**
 * Frontend → Backend 토큰 갱신 요청
 */
export interface RefreshTokenRequest {
  token: string;
}

/**
 * Backend → Frontend 토큰 갱신 응답
 */
export interface RefreshTokenResponse {
  token: string;
  expiresIn: number;
  refreshedAt: number;
  loginInfo: UserInfo;
}

/**
 * 권한 정보
 */
export interface AuthInfo {
  AUTH_ID: string;
  AUTH_NAME: string;
  AUTH_LEVEL: number;
  AUTH_DESCRIPTION?: string;
  IS_USE: 'Y' | 'N';
}

// API 응답 타입 alias
export type PasswordLoginApiResponse = ApiResponse<LoginSuccessResponse>;
export type OAuthUrlApiResponse = ApiResponse<OAuthUrlResponse>;
export type OAuthCallbackApiResponse = ApiResponse<LoginSuccessResponse>;
export type LogoutApiResponse = ApiResponse<boolean>;
export type RefreshTokenApiResponse = ApiResponse<RefreshTokenResponse>;
export type AuthInfoApiResponse = ApiResponse<AuthInfo[]>;
