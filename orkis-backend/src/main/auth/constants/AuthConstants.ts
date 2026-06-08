/**
 * 인증 관련 상수 정의
 */

import logger from "@orkis/core/utils";

// 허용 user_type 값 (가입 API + DB 저장 + 매핑 함수 공통)
export const ALLOWED_USER_TYPES = ["free", "pro", "admin"] as const;
export type UserType = (typeof ALLOWED_USER_TYPES)[number];

/**
 * 권한 코드 상수
 */
export const AUTH_CODES = {
  GENERAL: '1',  // 일반 모드
  PRO: '2',      // 프로 모드
  ADMIN: '3'     // 관리자 모드
} as const;

/**
 * 권한 이름 정의
 */
export const AUTH_NAMES = {
  '1': '일반 모드',
  '2': '프로 모드',
  '3': '관리자 모드'
} as const;

// user_type -> auth_code 1:1 매핑
export const USER_TYPE_AUTH_MAPPING: Record<UserType, string> = {
  free: AUTH_CODES.GENERAL,
  pro: AUTH_CODES.PRO,
  admin: AUTH_CODES.ADMIN,
} as const;

/**
 * 사용자 타입에 따른 권한 코드 반환
 * @param userType 사용자 타입
 * @returns 권한 코드
 */
export function getAuthCodeByUserType(userType?: string): string {
  if (!userType) return AUTH_CODES.GENERAL;

  const normalized = userType.toLowerCase() as UserType;
  const code = USER_TYPE_AUTH_MAPPING[normalized];
  if (!code) {
    logger.warn("알 수 없는 user_type, 기본 권한 부여", { userType });
    return AUTH_CODES.GENERAL;
  }
  return code;
}

/**
 * 라이센스 코드 생성
 * @param userId 사용자 ID
 * @param authCode 권한 코드
 * @returns 라이센스 코드
 */
export function generateLicenseCode(userId: string | number, authCode: string): string {
  const timestamp = Date.now();
  const userIdStr = String(userId);
  return `LIC_${userIdStr.toUpperCase()}_${authCode}_${timestamp}`;
}
