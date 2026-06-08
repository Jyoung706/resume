import { FileDatabase } from "../service/fileDatabase";
import { Dao } from "@orkis/core/common";

// 메뉴 관련 타입 정의
export interface MENU_INFO {
  MENU_ID: string;
  MENU_NAME: string;
  MENU_PATH: string;
  MENU_ICON?: string;
  MENU_ORDER: number;
  IS_ACTIVE: boolean;
  IS_COLLAPSE?: boolean;
  AUTH_REQUIRED: string[];
  CHILDREN?: MENU_INFO[];
}

export interface AUTH_USER_MAPPING {
  SEQ: number;
  USER_ID: string;
  AUTH_CODE: string;
}

@Dao("MenuDao")
export class MenuDao {
  /**
   * 전체 메뉴 정보 조회
   */
  async getAllMenus(): Promise<MENU_INFO[]> {
    const menuDb = new FileDatabase<MENU_INFO>("MENU_INFO");
    return await menuDb.getAll();
  }

  /**
   * 사용자 권한 정보 조회
   */
  async getUserAuth(userId: string): Promise<AUTH_USER_MAPPING | null> {
    const authDb = new FileDatabase<AUTH_USER_MAPPING>("AUTH_USER_MAPPING");
    const auths = await authDb.getAll();
    const userAuth = auths.find((auth) => auth.USER_ID === userId);
    return userAuth || null;
  }

  /**
   * 권한별 메뉴 필터링
   */
  private filterMenusByAuth(menus: MENU_INFO[], authCode: string): MENU_INFO[] {
    return menus
      .filter(
        (menu) => menu.IS_ACTIVE && menu.AUTH_REQUIRED?.includes(authCode)
      )
      .map((menu) => {
        const filteredMenu = { ...menu };
        if (menu.CHILDREN) {
          filteredMenu.CHILDREN = this.filterMenusByAuth(
            menu.CHILDREN,
            authCode
          );
        }
        return filteredMenu;
      });
  }

  /**
   * 사용자별 메뉴 조회
   */
  async getUserMenus(userId: string): Promise<MENU_INFO[]> {
    // 사용자 권한 조회
    const userAuth = await this.getUserAuth(userId);
    if (!userAuth) {
      return [];
    }

    // 전체 메뉴 조회
    const allMenus = await this.getAllMenus();

    // 권한에 따른 메뉴 필터링
    return this.filterMenusByAuth(allMenus, userAuth.AUTH_CODE);
  }

  /**
   * 관리자 권한 체크
   */
  async isAdmin(userId: string): Promise<boolean> {
    const userAuth = await this.getUserAuth(userId);
    return userAuth?.AUTH_CODE === "3";
  }
}
