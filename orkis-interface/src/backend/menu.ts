import { ApiResponse } from '../shared/api';

/**
 * 메뉴 아이템 타입
 */
export interface MenuItem {
  MENU_ID: string;
  MENU_NAME: string;
  MENU_URL?: string;
  PARENT_ID?: string;
  MENU_ORDER: number;
  MENU_LEVEL: number;
  ICON?: string;
  IS_ACTIVE: 'Y' | 'N';
  DESCRIPTION?: string;
  children?: MenuItem[];
}

/**
 * Frontend → Backend 사용자 메뉴 조회 응답
 */
export interface UserMenusResponse {
  success: boolean;
  data: MenuItem[];
  message?: string;
}

/**
 * Frontend → Backend 전체 메뉴 조회 응답
 */
export interface AllMenusResponse {
  success: boolean;
  data: MenuItem[];
  message?: string;
}

// API 응답 타입 alias
export type UserMenusApiResponse = ApiResponse<UserMenusResponse>;
export type AllMenusApiResponse = ApiResponse<AllMenusResponse>;