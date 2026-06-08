/**
 * 프로 사용자 판정 유틸리티
 * AUTH_CODE 기반 단일 판단 (백엔드 AuthConstants.ts 기준)
 *
 * AUTH_CODE '2' = pro, '3' = admin → 프로 자격 있음
 */
import type { User } from "@/logic/common/auth/types/auth";

export function isProUserByAuth(user: User | null): boolean {
  if (!user) return false;
  const authCode = String(user.AUTH_CODE || "");
  return authCode === "2" || authCode === "3";
}
