// Standard API Response Interface
interface StandardResponse<T = any> {
  success: boolean;
  data: T;
  timestamp: string;
}

/**
 * Menu 도메인 타입 정의
 */

export interface MenuInfo {
  MENU_ID: string;
  MENU_NAME: string;
  MENU_PATH: string;
  MENU_ICON?: string;
  MENU_ORDER?: number;
  PARENT_MENU_ID?: string;
  IS_USE: 'Y' | 'N';
  IS_COLLAPSE?: boolean;
  CHILDREN?: MenuInfo[];
}

export interface AuthInfo {
  AUTH_ID: string;
  AUTH_NAME: string;
  AUTH_CODE: string;
  AUTH_LEVEL: number;
  IS_USE: 'Y' | 'N';
}

export interface UserMenuRequest {
  userId: string;
}

export interface UserMenuResponse {
  menus: MenuInfo[];
  authCode: string;
}

export interface AllMenuResponse {
  menus: MenuInfo[];
}

// API Response Types
export type UserMenuApiResponse = StandardResponse<UserMenuResponse>;
export type AllMenuApiResponse = StandardResponse<AllMenuResponse>;