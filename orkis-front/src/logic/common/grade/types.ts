/**
 * 등급관리 타입 정의
 * 일반모드(general) / 프로모드(pro) 등급 체계
 */

export type GradeType = "general" | "pro";

export interface GradeOption {
  id: GradeType;
  grade: string;
  title: string;
  description: string;
  color: string;
  isAvailable: boolean;
}
